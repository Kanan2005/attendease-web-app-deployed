import type {
  AttendanceSessionDetail,
  AttendanceSessionHistoryItem,
  AttendanceSessionHistoryListQuery,
  AttendanceSessionParams,
  AttendanceSessionStudentSummary,
  LiveAttendanceSessionDiscoveryQuery,
  LiveAttendanceSessionSummary,
  StudentAttendanceHistoryItem,
  StudentAttendanceHistoryListQuery,
  UpdateAttendanceSessionAttendanceRequest,
  UpdateAttendanceSessionAttendanceResponse,
} from "@attendease/contracts"
import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import {
  buildAttendanceSecurityBreakdown,
  deriveAttendanceSessionEditability,
  toAttendanceSessionDetail,
  toAttendanceSessionHistoryItem,
  toAttendanceSessionStudentSummary,
  toStudentAttendanceHistoryItem,
} from "./attendance-history.models.js"
import { applyAttendanceSessionEdits } from "./attendance-history.service.edits.js"
import {
  attendanceHistoryReadInclude,
  buildHistoryScopeWhere,
  buildHistoryWhere,
  buildLiveSessionScopeWhere,
  buildLiveSessionWhere,
  buildStudentHistoryWhere,
  normalizeExpiredActiveSessions,
  toLiveAttendanceSessionSummary,
  toStoredSessionSummary,
} from "./attendance-history.service.helpers.js"
import { AttendanceRealtimeService } from "./attendance-realtime.service.js"
import { QrAttendanceService } from "./qr-attendance.service.js"

@Injectable()
export class AttendanceHistoryService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AttendanceRealtimeService)
    private readonly realtimeService: AttendanceRealtimeService,
    @Inject(QrAttendanceService) private readonly qrAttendanceService: QrAttendanceService,
  ) {}

  async listSessions(
    auth: AuthRequestContext,
    filters: AttendanceSessionHistoryListQuery = {},
  ): Promise<AttendanceSessionHistoryItem[]> {
    await normalizeExpiredActiveSessions({
      database: this.database.prisma,
      auth,
      scopeWhere: buildHistoryScopeWhere(auth, filters),
      resolveSession: ({ auth, sessionId }) =>
        this.qrAttendanceService.getSession(auth, {
          sessionId,
        }),
    })

    const sessions = await this.database.prisma.attendanceSession.findMany({
      where: buildHistoryWhere(auth, filters),
      include: attendanceHistoryReadInclude,
      orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
    })

    const now = new Date()

    return sessions.map((session) =>
      toAttendanceSessionHistoryItem({
        summary: toStoredSessionSummary(session),
        session,
        now,
      }),
    )
  }

  async listStudentHistory(
    auth: AuthRequestContext,
    filters: StudentAttendanceHistoryListQuery = {},
  ): Promise<StudentAttendanceHistoryItem[]> {
    await normalizeExpiredActiveSessions({
      database: this.database.prisma,
      auth,
      scopeWhere: {
        ...buildStudentHistoryWhere(filters),
        attendanceRecords: {
          some: {
            studentId: auth.userId,
          },
        },
      },
      resolveSession: ({ auth, sessionId }) =>
        this.qrAttendanceService.getSession(auth, {
          sessionId,
        }),
    })

    const records = await this.database.prisma.attendanceRecord.findMany({
      where: {
        studentId: auth.userId,
        session: buildStudentHistoryWhere(filters),
      },
      include: {
        session: {
          include: attendanceHistoryReadInclude,
        },
      },
      orderBy: [
        {
          session: {
            startedAt: "desc",
          },
        },
        {
          markedAt: "desc",
        },
      ],
    })

    return records.map((record) =>
      toStudentAttendanceHistoryItem({
        id: record.id,
        enrollmentId: record.enrollmentId,
        studentId: record.studentId,
        status: record.status,
        markSource: record.markSource,
        markedAt: record.markedAt,
        session: record.session,
      }),
    )
  }

  async listLiveSessions(
    auth: AuthRequestContext,
    filters: LiveAttendanceSessionDiscoveryQuery = {},
  ): Promise<LiveAttendanceSessionSummary[]> {
    await normalizeExpiredActiveSessions({
      database: this.database.prisma,
      auth,
      scopeWhere: buildLiveSessionScopeWhere(auth, filters),
      resolveSession: ({ auth, sessionId }) =>
        this.qrAttendanceService.getSession(auth, {
          sessionId,
        }),
    })

    const sessions = await this.database.prisma.attendanceSession.findMany({
      where: buildLiveSessionWhere(auth, filters),
      include: attendanceHistoryReadInclude,
      orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
    })

    return sessions.map((session) => toLiveAttendanceSessionSummary(session))
  }

  async getSessionDetail(
    auth: AuthRequestContext,
    params: AttendanceSessionParams,
  ): Promise<AttendanceSessionDetail> {
    const summary = await this.qrAttendanceService.getSession(auth, params)
    const session = await this.database.prisma.attendanceSession.findUnique({
      where: {
        id: params.sessionId,
      },
      include: attendanceHistoryReadInclude,
    })

    if (!session) {
      throw new NotFoundException("Attendance session not found.")
    }

    const securityEvents = await this.database.prisma.securityEvent.groupBy({
      by: ["eventType"],
      _count: {
        _all: true,
      },
      where: {
        sessionId: params.sessionId,
      },
    })

    return toAttendanceSessionDetail({
      summary,
      session,
      security: buildAttendanceSecurityBreakdown(
        securityEvents.map((row) => ({
          eventType: row.eventType,
          count: row._count._all,
        })),
      ),
      now: new Date(),
    })
  }

  async listSessionStudents(
    auth: AuthRequestContext,
    params: AttendanceSessionParams,
  ): Promise<AttendanceSessionStudentSummary[]> {
    await this.qrAttendanceService.getSession(auth, params)

    const records = await this.database.prisma.attendanceRecord.findMany({
      where: {
        sessionId: params.sessionId,
      },
      include: {
        student: {
          select: {
            displayName: true,
            email: true,
            studentProfile: {
              select: {
                rollNumber: true,
              },
            },
          },
        },
      },
    })

    return records
      .map((record) =>
        toAttendanceSessionStudentSummary({
          id: record.id,
          enrollmentId: record.enrollmentId,
          studentId: record.studentId,
          status: record.status,
          markedAt: record.markedAt,
          student: {
            displayName: record.student.displayName,
            email: record.student.email,
            rollNumber: record.student.studentProfile?.rollNumber ?? null,
          },
        }),
      )
      .sort((left, right) => {
        const leftRoll = left.studentRollNumber ?? ""
        const rightRoll = right.studentRollNumber ?? ""

        if (leftRoll !== rightRoll) {
          return leftRoll.localeCompare(rightRoll)
        }

        return left.studentDisplayName.localeCompare(right.studentDisplayName)
      })
  }

  async updateSessionAttendance(
    auth: AuthRequestContext,
    params: AttendanceSessionParams,
    request: UpdateAttendanceSessionAttendanceRequest,
  ): Promise<UpdateAttendanceSessionAttendanceResponse> {
    const summary = await this.qrAttendanceService.getSession(auth, params)
    const now = new Date()
    const editability = deriveAttendanceSessionEditability({
      endedAt: summary.endedAt,
      editableUntil: summary.editableUntil,
      now,
    })

    if (!editability.isEditable) {
      throw new ConflictException("This attendance session is locked for manual edits.")
    }

    const updateResult = await applyAttendanceSessionEdits({
      database: this.database.prisma,
      sessionId: params.sessionId,
      actorUserId: auth.userId,
      changes: request.changes,
      now,
    })

    if (updateResult.appliedChangeCount > 0) {
      await this.realtimeService.publishSessionCounterUpdated({
        sessionId: params.sessionId,
        presentCount: updateResult.presentCount,
        absentCount: updateResult.absentCount,
        rosterSnapshotCount: updateResult.rosterSnapshotCount,
      })
    }

    return {
      appliedChangeCount: updateResult.appliedChangeCount,
      session: await this.getSessionDetail(auth, params),
      students: await this.listSessionStudents(auth, params),
    }
  }
}
