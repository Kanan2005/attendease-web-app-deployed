import {
  type AttendanceSessionDetail,
  type AttendanceSessionHistoryItem,
  type AttendanceSessionHistoryListQuery,
  type AttendanceSessionParams,
  type AttendanceSessionStudentSummary,
  type AttendanceSessionSummary,
  type LiveAttendanceSessionDiscoveryQuery,
  type LiveAttendanceSessionSummary,
  type StudentAttendanceHistoryItem,
  type StudentAttendanceHistoryListQuery,
  type UpdateAttendanceSessionAttendanceRequest,
  type UpdateAttendanceSessionAttendanceResponse,
  attendanceSessionSummarySchema,
  liveAttendanceSessionSummarySchema,
} from "@attendease/contracts"
import {
  type Prisma,
  queueOutboxEvent,
  recordAttendanceEditTrail,
  runSerializableTransaction,
} from "@attendease/db"
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import {
  type AttendanceHistoryReadRecord,
  buildAttendanceSecurityBreakdown,
  deriveAttendanceSessionEditability,
  toAttendanceSessionDetail,
  toAttendanceSessionHistoryItem,
  toAttendanceSessionStudentSummary,
  toStudentAttendanceHistoryItem,
} from "./attendance-history.models.js"
import { AttendanceRealtimeService } from "./attendance-realtime.service.js"
import { QrAttendanceService } from "./qr-attendance.service.js"

const attendanceHistoryReadInclude = {
  courseOffering: {
    select: {
      code: true,
      displayTitle: true,
    },
  },
  teacher: {
    select: {
      displayName: true,
      email: true,
    },
  },
  semester: {
    select: {
      code: true,
      title: true,
    },
  },
  academicClass: {
    select: {
      code: true,
      title: true,
    },
  },
  section: {
    select: {
      code: true,
      title: true,
    },
  },
  subject: {
    select: {
      code: true,
      title: true,
    },
  },
  lecture: {
    select: {
      title: true,
      lectureDate: true,
    },
  },
} as const satisfies Prisma.AttendanceSessionInclude

type AttendanceHistorySessionRow = AttendanceHistoryReadRecord & {
  mode: "QR_GPS" | "BLUETOOTH" | "MANUAL"
  status: "DRAFT" | "ACTIVE" | "ENDED" | "CANCELLED" | "EXPIRED"
  startedAt: Date | null
  scheduledEndAt: Date | null
  endedAt: Date | null
  editableUntil: Date | null
  durationSeconds: number | null
  gpsAnchorType: "CLASSROOM_FIXED" | "CAMPUS_ZONE" | "TEACHER_SELECTED" | null
  gpsCenterLatitude: { toNumber: () => number } | null
  gpsCenterLongitude: { toNumber: () => number } | null
  gpsAnchorLabel: string | null
  gpsRadiusMeters: number | null
  qrRotationWindowSeconds: number | null
  bluetoothRotationWindowSeconds: number | null
  blePublicId: string | null
  bleProtocolVersion: number | null
  rosterSnapshotCount: number
  presentCount: number
  absentCount: number
}

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
    await this.normalizeExpiredActiveSessions(auth, this.buildHistoryScopeWhere(auth, filters))

    const sessions = await this.database.prisma.attendanceSession.findMany({
      where: this.buildHistoryWhere(auth, filters),
      include: attendanceHistoryReadInclude,
      orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
    })

    const now = new Date()

    return sessions.map((session) =>
      toAttendanceSessionHistoryItem({
        summary: this.toStoredSessionSummary(session),
        session,
        now,
      }),
    )
  }

  async listStudentHistory(
    auth: AuthRequestContext,
    filters: StudentAttendanceHistoryListQuery = {},
  ): Promise<StudentAttendanceHistoryItem[]> {
    await this.normalizeExpiredActiveSessions(auth, {
      ...this.buildStudentHistoryWhere(filters),
      attendanceRecords: {
        some: {
          studentId: auth.userId,
        },
      },
    })

    const records = await this.database.prisma.attendanceRecord.findMany({
      where: {
        studentId: auth.userId,
        session: this.buildStudentHistoryWhere(filters),
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
    await this.normalizeExpiredActiveSessions(auth, this.buildLiveSessionScopeWhere(auth, filters))

    const sessions = await this.database.prisma.attendanceSession.findMany({
      where: this.buildLiveSessionWhere(auth, filters),
      include: attendanceHistoryReadInclude,
      orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
    })

    return sessions.map((session) => this.toLiveAttendanceSessionSummary(session))
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

    const requestedChangeIds = request.changes.map((change) => change.attendanceRecordId)
    const requestedChanges = new Map(
      request.changes.map((change) => [change.attendanceRecordId, change.status] as const),
    )

    const updateResult = await runSerializableTransaction(
      this.database.prisma,
      async (transaction) => {
        const session = await transaction.attendanceSession.findUnique({
          where: {
            id: params.sessionId,
          },
        })

        if (!session) {
          throw new NotFoundException("Attendance session not found.")
        }

        const currentEditability = deriveAttendanceSessionEditability({
          endedAt: session.endedAt?.toISOString() ?? null,
          editableUntil: session.editableUntil?.toISOString() ?? null,
          now,
        })

        if (!currentEditability.isEditable) {
          throw new ConflictException("This attendance session is locked for manual edits.")
        }

        const records = await transaction.attendanceRecord.findMany({
          where: {
            sessionId: params.sessionId,
            id: {
              in: requestedChangeIds,
            },
          },
          orderBy: {
            id: "asc",
          },
        })

        if (records.length !== requestedChangeIds.length) {
          throw new BadRequestException(
            "One or more attendance rows do not belong to this attendance session.",
          )
        }

        let appliedChangeCount = 0

        for (const record of records) {
          const nextStatus = requestedChanges.get(record.id)

          if (!nextStatus) {
            continue
          }

          if (record.status === nextStatus) {
            continue
          }

          const updatedRecord = await transaction.attendanceRecord.update({
            where: {
              id: record.id,
            },
            data: {
              status: nextStatus,
              markSource: nextStatus === "PRESENT" ? "MANUAL" : null,
              markedAt: nextStatus === "PRESENT" ? now : null,
              markedByUserId: nextStatus === "PRESENT" ? auth.userId : null,
            },
          })

          await recordAttendanceEditTrail(transaction, {
            attendanceEvent: {
              sessionId: params.sessionId,
              attendanceRecordId: updatedRecord.id,
              studentId: updatedRecord.studentId,
              actorUserId: auth.userId,
              eventType: nextStatus === "PRESENT" ? "MANUAL_MARK_PRESENT" : "MANUAL_MARK_ABSENT",
              mode: session.mode,
              previousStatus: record.status,
              newStatus: nextStatus,
              metadata: {
                editedAt: now.toISOString(),
              },
            },
            auditLog: {
              sessionId: params.sessionId,
              attendanceRecordId: updatedRecord.id,
              studentId: updatedRecord.studentId,
              editedByUserId: auth.userId,
              previousStatus: record.status,
              newStatus: nextStatus,
              editedAt: now,
            },
          })

          appliedChangeCount += 1
        }

        const [presentCount, absentCount] = await Promise.all([
          transaction.attendanceRecord.count({
            where: {
              sessionId: params.sessionId,
              status: "PRESENT",
            },
          }),
          transaction.attendanceRecord.count({
            where: {
              sessionId: params.sessionId,
              status: "ABSENT",
            },
          }),
        ])

        await transaction.attendanceSession.update({
          where: {
            id: params.sessionId,
          },
          data: {
            presentCount,
            absentCount,
          },
        })

        if (appliedChangeCount > 0) {
          await queueOutboxEvent(transaction, {
            topic: "attendance.session.edited",
            aggregateType: "attendance_session",
            aggregateId: params.sessionId,
            payload: {
              sessionId: params.sessionId,
              actorUserId: auth.userId,
              appliedChangeCount,
              presentCount,
              absentCount,
            },
          })
        }

        return {
          presentCount,
          absentCount,
          appliedChangeCount,
          rosterSnapshotCount: session.rosterSnapshotCount,
        }
      },
    )

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

  private buildHistoryWhere(
    auth: AuthRequestContext,
    filters: AttendanceSessionHistoryListQuery,
  ): Prisma.AttendanceSessionWhereInput {
    return {
      ...this.buildTeacherAdminHistoryAccessWhere(auth),
      ...(filters.classroomId ? { courseOfferingId: filters.classroomId } : {}),
      ...(filters.classId ? { classId: filters.classId } : {}),
      ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters.mode ? { mode: filters.mode } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...((filters.from || filters.to) && {
        startedAt: {
          ...(filters.from ? { gte: new Date(filters.from) } : {}),
          ...(filters.to ? { lte: new Date(filters.to) } : {}),
        },
      }),
    }
  }

  private buildHistoryScopeWhere(
    auth: AuthRequestContext,
    filters: AttendanceSessionHistoryListQuery,
  ): Prisma.AttendanceSessionWhereInput {
    return {
      ...this.buildTeacherAdminHistoryAccessWhere(auth),
      ...(filters.classroomId ? { courseOfferingId: filters.classroomId } : {}),
      ...(filters.classId ? { classId: filters.classId } : {}),
      ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters.mode ? { mode: filters.mode } : {}),
      ...((filters.from || filters.to) && {
        startedAt: {
          ...(filters.from ? { gte: new Date(filters.from) } : {}),
          ...(filters.to ? { lte: new Date(filters.to) } : {}),
        },
      }),
    }
  }

  private buildStudentHistoryWhere(
    filters: StudentAttendanceHistoryListQuery,
  ): Prisma.AttendanceSessionWhereInput {
    return {
      ...(filters.classroomId ? { courseOfferingId: filters.classroomId } : {}),
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters.mode ? { mode: filters.mode } : {}),
      ...((filters.from || filters.to) && {
        startedAt: {
          ...(filters.from ? { gte: new Date(filters.from) } : {}),
          ...(filters.to ? { lte: new Date(filters.to) } : {}),
        },
      }),
    }
  }

  private buildLiveSessionWhere(
    auth: AuthRequestContext,
    filters: LiveAttendanceSessionDiscoveryQuery,
  ): Prisma.AttendanceSessionWhereInput {
    return {
      ...this.buildLiveSessionScopeWhere(auth, filters),
      status: "ACTIVE",
    }
  }

  private buildLiveSessionScopeWhere(
    auth: AuthRequestContext,
    filters: LiveAttendanceSessionDiscoveryQuery,
  ): Prisma.AttendanceSessionWhereInput {
    return {
      ...(auth.activeRole === "ADMIN"
        ? {}
        : auth.activeRole === "STUDENT"
          ? {
              attendanceRecords: {
                some: {
                  studentId: auth.userId,
                },
              },
            }
          : {
              teacherId: auth.userId,
            }),
      ...(filters.classroomId ? { courseOfferingId: filters.classroomId } : {}),
      ...(filters.lectureId ? { lectureId: filters.lectureId } : {}),
      ...(filters.mode ? { mode: filters.mode } : {}),
    }
  }

  private buildTeacherAdminHistoryAccessWhere(
    auth: AuthRequestContext,
  ): Prisma.AttendanceSessionWhereInput {
    return auth.activeRole === "ADMIN" ? {} : { teacherId: auth.userId }
  }

  private async normalizeExpiredActiveSessions(
    auth: AuthRequestContext,
    scopeWhere: Prisma.AttendanceSessionWhereInput,
  ) {
    const now = new Date()
    const overdueSessions = await this.database.prisma.attendanceSession.findMany({
      where: {
        AND: [
          scopeWhere,
          {
            status: "ACTIVE",
            scheduledEndAt: {
              lte: now,
            },
          },
        ],
      },
      select: {
        id: true,
      },
    })

    if (overdueSessions.length === 0) {
      return
    }

    await Promise.all(
      overdueSessions.map((session) =>
        this.qrAttendanceService.getSession(auth, {
          sessionId: session.id,
        }),
      ),
    )
  }

  private toStoredSessionSummary(input: AttendanceHistorySessionRow): AttendanceSessionSummary {
    return attendanceSessionSummarySchema.parse({
      id: input.id,
      classroomId: input.courseOfferingId,
      lectureId: input.lectureId,
      teacherAssignmentId: input.teacherAssignmentId,
      mode: input.mode,
      status: input.status,
      startedAt: input.startedAt?.toISOString() ?? null,
      scheduledEndAt: input.scheduledEndAt?.toISOString() ?? null,
      endedAt: input.endedAt?.toISOString() ?? null,
      editableUntil: input.editableUntil?.toISOString() ?? null,
      durationSeconds: input.durationSeconds,
      anchorType: input.gpsAnchorType,
      anchorLatitude: this.toNullableNumber(input.gpsCenterLatitude),
      anchorLongitude: this.toNullableNumber(input.gpsCenterLongitude),
      anchorLabel: input.gpsAnchorLabel,
      gpsRadiusMeters: input.gpsRadiusMeters,
      qrRotationWindowSeconds: input.qrRotationWindowSeconds,
      bluetoothRotationWindowSeconds: input.bluetoothRotationWindowSeconds,
      blePublicId: input.blePublicId,
      bleProtocolVersion: input.bleProtocolVersion,
      rosterSnapshotCount: input.rosterSnapshotCount,
      presentCount: input.presentCount,
      absentCount: input.absentCount,
      currentQrPayload: null,
      currentQrExpiresAt: null,
    })
  }

  private toLiveAttendanceSessionSummary(
    input: AttendanceHistorySessionRow,
  ): LiveAttendanceSessionSummary {
    return liveAttendanceSessionSummarySchema.parse({
      id: input.id,
      classroomId: input.courseOfferingId,
      classroomCode: input.courseOffering.code,
      classroomDisplayTitle: input.courseOffering.displayTitle,
      lectureId: input.lectureId,
      lectureTitle: input.lecture?.title ?? null,
      lectureDate: input.lecture?.lectureDate?.toISOString() ?? null,
      classId: input.classId,
      classCode: input.academicClass?.code ?? input.classId,
      classTitle: input.academicClass?.title ?? input.classId,
      sectionId: input.sectionId,
      sectionCode: input.section?.code ?? input.sectionId,
      sectionTitle: input.section?.title ?? input.sectionId,
      subjectId: input.subjectId,
      subjectCode: input.subject?.code ?? input.subjectId,
      subjectTitle: input.subject?.title ?? input.subjectId,
      mode: input.mode,
      status: input.status,
      startedAt: input.startedAt?.toISOString() ?? null,
      scheduledEndAt: input.scheduledEndAt?.toISOString() ?? null,
      presentCount: input.presentCount,
      absentCount: input.absentCount,
    })
  }

  private toNullableNumber(value: { toNumber: () => number } | null): number | null {
    return value ? value.toNumber() : null
  }
}
