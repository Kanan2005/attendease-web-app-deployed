import type { SendThresholdEmailsRequest, SendThresholdEmailsResponse } from "@attendease/contracts"
import type { ApiEnv } from "@attendease/config"
import { buildEmailLogData } from "@attendease/db"
import {
  ConsoleEmailProviderAdapter,
  type EmailProviderAdapter,
  SesEmailProviderAdapter,
  renderLowAttendanceEmail,
  buildEmailSubjectPrefix,
} from "@attendease/email"
import { ForbiddenException, Inject, Injectable, Logger } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import { API_ENV } from "../../infrastructure/api-env.js"
import type { AuthRequestContext } from "../auth/auth.types.js"

/**
 * Handles ad-hoc threshold email notifications triggered by a teacher
 * from the reports UI. Sends directly via the configured email provider
 * and creates EmailLog entries for audit.
 */
@Injectable()
export class EmailReminderService {
  private readonly logger = new Logger(EmailReminderService.name)
  private readonly emailProvider: EmailProviderAdapter
  private readonly fromEmail: string
  private readonly replyToEmail: string | null
  private readonly environment: string

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(API_ENV) env: ApiEnv,
  ) {
    this.fromEmail = env.EMAIL_FROM_ADDRESS
    this.replyToEmail = env.EMAIL_REPLY_TO_ADDRESS ?? null
    this.environment = env.NODE_ENV

    this.emailProvider =
      env.EMAIL_PROVIDER_MODE === "ses"
        ? new SesEmailProviderAdapter({
            region: env.AWS_SES_REGION,
            accessKeyId: env.AWS_SES_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SES_SECRET_ACCESS_KEY,
            ...(env.AWS_SES_ENDPOINT ? { endpoint: env.AWS_SES_ENDPOINT } : {}),
            ...(env.AWS_SES_CONFIGURATION_SET
              ? { configurationSetName: env.AWS_SES_CONFIGURATION_SET }
              : {}),
          })
        : new ConsoleEmailProviderAdapter()
  }

  /**
   * Sends threshold notification emails to selected students and/or their parents.
   * Teacher provides a customizable subject/body with {{variable}} placeholders.
   * Each email is logged to EmailLog for audit and delivery tracking.
   */
  async sendThresholdEmails(
    auth: AuthRequestContext,
    request: SendThresholdEmailsRequest,
  ): Promise<SendThresholdEmailsResponse> {
    const classroom = await this.database.prisma.courseOffering.findUnique({
      where: { id: request.classroomId },
      select: {
        id: true,
        displayTitle: true,
        primaryTeacherId: true,
        subject: { select: { title: true } },
      },
    })

    if (!classroom) {
      throw new ForbiddenException("Classroom not found.")
    }

    if (auth.activeRole === "TEACHER" && classroom.primaryTeacherId !== auth.userId) {
      throw new ForbiddenException("You do not have access to this classroom.")
    }

    // Fetch students with their profile (for parentEmail)
    const students = await this.database.prisma.user.findMany({
      where: { id: { in: request.studentIds } },
      select: {
        id: true,
        email: true,
        displayName: true,
        studentProfile: { select: { parentEmail: true } },
      },
    })

    const studentMap = new Map(students.map((s) => [s.id, s]))

    let queuedCount = 0
    let sentCount = 0
    let failedCount = 0
    let skippedNoParentEmail = 0

    for (const studentId of request.studentIds) {
      const student = studentMap.get(studentId)
      if (!student) {
        this.logger.warn(`Student ${studentId} not found — skipping`)
        failedCount++
        continue
      }

      // Render email using teacher-customized subject/body with template variable substitution
      const rendered = renderLowAttendanceEmail({
        environment: this.environment,
        templateSubject: request.subject,
        templateBody: request.body,
        studentName: student.displayName,
        classroomTitle: classroom.displayTitle,
        subjectTitle: classroom.subject.title,
        attendancePercentage: request.thresholdPercent,
        thresholdPercent: request.thresholdPercent,
      })

      // Send to student if toggled on
      if (request.emailStudents) {
        queuedCount++
        const sent = await this.sendAndLog({
          studentId: student.id,
          recipientEmail: student.email,
          subject: rendered.subject,
          textBody: rendered.textBody,
          htmlBody: rendered.htmlBody,
        })
        if (sent) sentCount++
        else failedCount++
      }

      // Send to parent if toggled on
      if (request.emailParents) {
        const parentEmail = student.studentProfile?.parentEmail
        if (!parentEmail) {
          skippedNoParentEmail++
          continue
        }

        // Render parent variant — prefix subject to distinguish recipient
        const parentSubject = `${buildEmailSubjectPrefix(this.environment)} [Parent] ${request.subject}`
        const parentRendered = renderLowAttendanceEmail({
          environment: "",
          templateSubject: parentSubject,
          templateBody: request.body,
          studentName: student.displayName,
          classroomTitle: classroom.displayTitle,
          subjectTitle: classroom.subject.title,
          attendancePercentage: request.thresholdPercent,
          thresholdPercent: request.thresholdPercent,
        })

        queuedCount++
        const sent = await this.sendAndLog({
          studentId: student.id,
          recipientEmail: parentEmail,
          subject: parentRendered.subject,
          textBody: parentRendered.textBody,
          htmlBody: parentRendered.htmlBody,
        })
        if (sent) sentCount++
        else failedCount++
      }
    }

    return { queuedCount, sentCount, failedCount, skippedNoParentEmail }
  }

  /** Send a single email and create an EmailLog entry for auditing. */
  private async sendAndLog(params: {
    studentId: string
    recipientEmail: string
    subject: string
    textBody: string
    htmlBody: string
  }): Promise<boolean> {
    const logEntry = await this.database.prisma.emailLog.create({
      data: buildEmailLogData({
        studentId: params.studentId,
        recipientEmail: params.recipientEmail,
        subject: params.subject,
        body: params.textBody,
        status: "PENDING",
      }),
    })

    try {
      const sendResult = await this.emailProvider.sendEmail({
        fromEmail: this.fromEmail,
        toEmail: params.recipientEmail,
        subject: params.subject,
        textBody: params.textBody,
        htmlBody: params.htmlBody,
        ...(this.replyToEmail ? { replyToEmail: this.replyToEmail } : {}),
      })

      await this.database.prisma.emailLog.update({
        where: { id: logEntry.id },
        data: {
          status: "SENT",
          providerMessageId: sendResult.providerMessageId,
          sentAt: new Date(),
        },
      })
      return true
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Email delivery failed."
      this.logger.error(`Failed to send email to ${params.recipientEmail}: ${reason}`)

      await this.database.prisma.emailLog.update({
        where: { id: logEntry.id },
        data: { status: "FAILED", failureReason: reason },
      })
      return false
    }
  }
}
