import type { LowAttendanceEmailRecipientSummary } from "@attendease/contracts"
import { buildEmailLogData, buildOutboxEventData, type createPrismaClient } from "@attendease/db"
import { type EmailProviderAdapter, renderLowAttendanceEmail } from "@attendease/email"

type WorkerPrismaClient = ReturnType<typeof createPrismaClient>

export async function processEmailRecipient(input: {
  prisma: WorkerPrismaClient
  emailProvider: EmailProviderAdapter
  options: {
    environment: string
    fromEmail: string
    replyToEmail?: string | null
  }
  runId: string
  ruleId: string
  courseOfferingTitle: string
  subjectTitle: string
  templateSubject: string
  templateBody: string
  thresholdPercent: number
  recipient: LowAttendanceEmailRecipientSummary
}) {
  const existingLog = await input.prisma.emailLog.findFirst({
    where: {
      dispatchRunId: input.runId,
      studentId: input.recipient.studentId,
    },
  })

  if (existingLog) {
    return existingLog
  }

  const createdLog = await input.prisma.emailLog.create({
    data: buildEmailLogData({
      dispatchRunId: input.runId,
      ruleId: input.ruleId,
      studentId: input.recipient.studentId,
      recipientEmail: input.recipient.studentEmail,
      subject: input.templateSubject,
      body: input.templateBody,
      status: "PENDING",
    }),
  })

  const rendered = renderLowAttendanceEmail({
    environment: input.options.environment,
    templateSubject: input.templateSubject,
    templateBody: input.templateBody,
    studentName: input.recipient.studentDisplayName,
    classroomTitle: input.courseOfferingTitle,
    subjectTitle: input.subjectTitle,
    attendancePercentage: input.recipient.attendancePercentage,
    thresholdPercent: input.thresholdPercent,
  })

  try {
    const sendResult = await input.emailProvider.sendEmail({
      fromEmail: input.options.fromEmail,
      toEmail: input.recipient.studentEmail,
      subject: rendered.subject,
      textBody: rendered.textBody,
      htmlBody: rendered.htmlBody,
      ...(input.options.replyToEmail !== undefined
        ? { replyToEmail: input.options.replyToEmail }
        : {}),
    })

    await input.prisma.emailLog.update({
      where: {
        id: createdLog.id,
      },
      data: {
        status: "SENT",
        subject: rendered.subject,
        body: rendered.textBody,
        providerMessageId: sendResult.providerMessageId,
        sentAt: new Date(),
      },
    })

    await input.prisma.outboxEvent.create({
      data: buildOutboxEventData({
        topic: "email.low_attendance.sent",
        aggregateType: "email_dispatch_run",
        aggregateId: input.runId,
        payload: {
          dispatchRunId: input.runId,
          emailLogId: createdLog.id,
          studentId: input.recipient.studentId,
        },
      }),
    })
  } catch (error) {
    await input.prisma.emailLog.update({
      where: {
        id: createdLog.id,
      },
      data: {
        status: "FAILED",
        subject: rendered.subject,
        body: rendered.textBody,
        failureReason:
          error instanceof Error ? error.message : "Low-attendance email delivery failed.",
      },
    })

    await input.prisma.outboxEvent.create({
      data: buildOutboxEventData({
        topic: "email.low_attendance.failed",
        aggregateType: "email_dispatch_run",
        aggregateId: input.runId,
        payload: {
          dispatchRunId: input.runId,
          emailLogId: createdLog.id,
          studentId: input.recipient.studentId,
        },
      }),
    })
  }

  return input.prisma.emailLog.findUnique({
    where: {
      id: createdLog.id,
    },
  })
}
