import type {
  AdminCommunicationAudiencePreviewRequest,
  AdminCommunicationAudiencePreviewResponse,
  AdminCommunicationLogDispatchRequest,
  AdminCommunicationLogDispatchResponse,
} from "@attendease/contracts"
import { Inject, Injectable, NotFoundException } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"

type StudentRecord = {
  id: string
  displayName: string
  email: string
  studentProfile: {
    rollNumber: string | null
    branch: string | null
    currentSemester: number | null
    parentEmail: string | null
  } | null
}

@Injectable()
export class AdminCommunicationService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}

  async previewAudience(
    auth: AuthRequestContext,
    request: AdminCommunicationAudiencePreviewRequest,
  ): Promise<AdminCommunicationAudiencePreviewResponse> {
    let candidateStudentIds: string[] | null = null

    // -------------------------------------------------------------------
    // 1. If a course offering is given, restrict to its active enrollees.
    // -------------------------------------------------------------------
    if (request.courseOfferingId) {
      const offering = await this.database.prisma.courseOffering.findUnique({
        where: { id: request.courseOfferingId },
        select: { id: true },
      })
      if (!offering) {
        throw new NotFoundException(`Course offering ${request.courseOfferingId} not found.`)
      }
      const enrollments = await this.database.prisma.enrollment.findMany({
        where: {
          courseOfferingId: request.courseOfferingId,
          status: "ACTIVE",
        },
        select: { studentId: true },
      })
      candidateStudentIds = enrollments.map((e) => e.studentId)
      if (candidateStudentIds.length === 0) {
        return this.emptyResponse(request)
      }
    }

    // -------------------------------------------------------------------
    // 2. Optionally filter the candidate pool by attendance threshold.
    // -------------------------------------------------------------------
    let attendancePercentByStudent: Map<string, number> | null = null
    if (request.attendanceThresholdPercent !== undefined) {
      // We need a course context for attendance %. If a course offering
      // was given, scope the threshold to that course; otherwise compute
      // the student's overall % across all enrollments.
      const summaries = await this.database.prisma.analyticsStudentCourseSummary.findMany({
        where: {
          ...(request.courseOfferingId ? { courseOfferingId: request.courseOfferingId } : {}),
          ...(candidateStudentIds ? { studentId: { in: candidateStudentIds } } : {}),
        },
        select: {
          studentId: true,
          totalSessions: true,
          presentSessions: true,
        },
      })

      const totalsByStudent = new Map<string, { total: number; present: number }>()
      for (const summary of summaries) {
        const existing = totalsByStudent.get(summary.studentId) ?? { total: 0, present: 0 }
        existing.total += summary.totalSessions
        existing.present += summary.presentSessions
        totalsByStudent.set(summary.studentId, existing)
      }

      const passingStudentIds: string[] = []
      attendancePercentByStudent = new Map()
      for (const [studentId, totals] of totalsByStudent.entries()) {
        if (totals.total === 0) continue
        const percent = (totals.present / totals.total) * 100
        attendancePercentByStudent.set(studentId, round1(percent))
        const threshold = request.attendanceThresholdPercent
        const passes =
          request.attendanceComparator === "ABOVE" ? percent >= threshold : percent < threshold
        if (passes) {
          passingStudentIds.push(studentId)
        }
      }

      candidateStudentIds = passingStudentIds
      if (candidateStudentIds.length === 0) {
        return this.emptyResponse(request)
      }
    }

    // -------------------------------------------------------------------
    // 3. Resolve the final student set with profile filters applied.
    // -------------------------------------------------------------------
    const students = (await this.database.prisma.user.findMany({
      where: {
        roles: { some: { role: "STUDENT" } },
        ...(candidateStudentIds ? { id: { in: candidateStudentIds } } : {}),
        ...(request.degree || request.branch || request.currentSemester !== undefined
          ? {
              studentProfile: {
                ...(request.degree ? { degree: request.degree } : {}),
                ...(request.branch ? { branch: request.branch } : {}),
                ...(request.currentSemester !== undefined
                  ? { currentSemester: request.currentSemester }
                  : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        studentProfile: {
          select: {
            rollNumber: true,
            branch: true,
            currentSemester: true,
            parentEmail: true,
          },
        },
      },
      orderBy: { displayName: "asc" },
    })) as StudentRecord[]

    // -------------------------------------------------------------------
    // 4. Resolve the email set per audience kind.
    // -------------------------------------------------------------------
    const emails: string[] = []
    let missingEmailCount = 0
    for (const student of students) {
      const raw =
        request.audience === "STUDENT"
          ? student.email
          : (student.studentProfile?.parentEmail ?? null)
      const target = raw && raw.trim() ? raw.trim() : null
      if (target) {
        emails.push(target)
      } else {
        missingEmailCount += 1
      }
    }

    const sample = students.slice(0, request.sampleLimit).map((student) => ({
      studentId: student.id,
      displayName: student.displayName,
      rollNumber: student.studentProfile?.rollNumber ?? null,
      branch: student.studentProfile?.branch ?? null,
      currentSemester: student.studentProfile?.currentSemester ?? null,
      attendancePercent: attendancePercentByStudent?.get(student.id) ?? null,
      email: (() => {
        const raw =
          request.audience === "STUDENT"
            ? student.email
            : (student.studentProfile?.parentEmail ?? null)
        return raw && raw.trim() ? raw.trim() : null
      })(),
    }))

    // -------------------------------------------------------------------
    // 5. Audit log — preview was requested. Best-effort; we never block
    //    the response if logging fails (no user-visible side effect).
    // -------------------------------------------------------------------
    await this.database.prisma.adminActionLog
      .create({
        data: {
          adminUserId: auth.userId,
          actionType: "COMMUNICATION_AUDIENCE_PREVIEW",
          metadata: {
            audience: request.audience,
            ...(request.degree ? { degree: request.degree } : {}),
            ...(request.branch ? { branch: request.branch } : {}),
            ...(request.currentSemester !== undefined
              ? { currentSemester: request.currentSemester }
              : {}),
            ...(request.courseOfferingId ? { courseOfferingId: request.courseOfferingId } : {}),
            ...(request.attendanceThresholdPercent !== undefined
              ? {
                  attendanceThresholdPercent: request.attendanceThresholdPercent,
                  attendanceComparator: request.attendanceComparator,
                }
              : {}),
            studentCount: students.length,
            emailCount: emails.length,
            missingEmailCount,
          },
        },
      })
      .catch(() => undefined)

    return {
      audience: request.audience,
      studentCount: students.length,
      emailCount: emails.length,
      missingEmailCount,
      emails,
      sample,
    }
  }

  async logDispatch(
    auth: AuthRequestContext,
    request: AdminCommunicationLogDispatchRequest,
  ): Promise<AdminCommunicationLogDispatchResponse> {
    const log = await this.database.prisma.adminActionLog.create({
      data: {
        adminUserId: auth.userId,
        actionType: "COMMUNICATION_GMAIL_DISPATCH_PREPARED",
        metadata: {
          audience: request.audience,
          channel: request.channel,
          recipientCount: request.recipientCount,
          subjectPreview: request.subjectPreview,
          filtersSummary: request.filtersSummary,
        },
      },
    })
    return { loggedAt: log.createdAt.toISOString() }
  }

  private emptyResponse(
    request: AdminCommunicationAudiencePreviewRequest,
  ): AdminCommunicationAudiencePreviewResponse {
    return {
      audience: request.audience,
      studentCount: 0,
      emailCount: 0,
      missingEmailCount: 0,
      emails: [],
      sample: [],
    }
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}
