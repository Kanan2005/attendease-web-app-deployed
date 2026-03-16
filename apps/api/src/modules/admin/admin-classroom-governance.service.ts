import type {
  AdminArchiveClassroomRequest,
  AdminClassroomGovernance,
  AdminClassroomGovernanceDetail,
  AdminClassroomGovernanceSearchQuery,
  AdminClassroomGovernanceSummary,
  ClassroomDetail,
  ClassroomStatus,
} from "@attendease/contracts"
import {
  adminClassroomGovernanceDetailSchema,
  adminClassroomGovernanceSummarySchema,
} from "@attendease/contracts"
import type { Prisma } from "@attendease/db"
import { deriveClassroomCrudPermissions } from "@attendease/domain"
import { BadRequestException, Inject, Injectable } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import { ClassroomsService } from "../academic/classrooms.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { buildClassroomSearchWhere } from "./admin-classroom-governance.search.js"

const classroomGovernanceInclude = {
  joinCodes: {
    where: {
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 1,
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
  primaryTeacher: {
    select: {
      displayName: true,
    },
  },
} satisfies Prisma.CourseOfferingInclude

type ClassroomGovernanceRecord = Prisma.CourseOfferingGetPayload<{
  include: typeof classroomGovernanceInclude
}>

type GovernanceAccumulator = {
  activeStudentCount: number
  pendingStudentCount: number
  blockedStudentCount: number
  droppedStudentCount: number
  attendanceSessionCount: number
  liveAttendanceSessionCount: number
  presentRecordCount: number
  absentRecordCount: number
  latestAttendanceAt: Date | null
}

@Injectable()
export class AdminAcademicGovernanceService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ClassroomsService) private readonly classroomsService: ClassroomsService,
  ) {}

  async listClassroomGovernance(
    auth: AuthRequestContext,
    filters: AdminClassroomGovernanceSearchQuery,
  ): Promise<AdminClassroomGovernanceSummary[]> {
    const classrooms = await this.database.prisma.courseOffering.findMany({
      where: {
        ...(filters.semesterId ? { semesterId: filters.semesterId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.query ? { OR: buildClassroomSearchWhere(filters.query) } : {}),
      },
      include: this.getClassroomSummaryInclude(),
      take: filters.limit,
      orderBy: [{ status: "asc" }, { displayTitle: "asc" }],
    })

    const governanceByClassroom = await this.loadGovernanceMap(
      classrooms.map((classroom) => classroom.id),
    )

    return classrooms.map((classroom) =>
      adminClassroomGovernanceSummarySchema.parse({
        ...this.toClassroomSummary(classroom, auth),
        governance: this.toGovernanceSummary(
          governanceByClassroom.get(classroom.id),
          classroom.status,
        ),
      }),
    )
  }

  async getClassroomGovernanceDetail(
    auth: AuthRequestContext,
    classroomId: string,
  ): Promise<AdminClassroomGovernanceDetail> {
    const classroom = await this.classroomsService.getClassroom(auth, classroomId)
    const governanceByClassroom = await this.loadGovernanceMap([classroomId])

    return adminClassroomGovernanceDetailSchema.parse({
      ...classroom,
      governance: this.toGovernanceSummary(
        governanceByClassroom.get(classroomId),
        classroom.status,
      ),
    })
  }

  async archiveClassroom(
    auth: AuthRequestContext,
    classroomId: string,
    request: AdminArchiveClassroomRequest,
  ): Promise<AdminClassroomGovernanceDetail> {
    const current = await this.getClassroomGovernanceDetail(auth, classroomId)

    if (!current.governance.canArchiveNow) {
      throw new BadRequestException(current.governance.archiveEffectMessage)
    }

    await this.classroomsService.archiveClassroom(auth, classroomId, {
      adminReason: request.reason.trim(),
    })

    return this.getClassroomGovernanceDetail(auth, classroomId)
  }

  private getClassroomSummaryInclude(): Prisma.CourseOfferingInclude {
    return classroomGovernanceInclude
  }

  private async loadGovernanceMap(classroomIds: string[]) {
    const governanceMap = new Map<string, GovernanceAccumulator>()

    if (classroomIds.length === 0) {
      return governanceMap
    }

    const enrollmentCounts = await this.database.prisma.enrollment.groupBy({
      by: ["courseOfferingId", "status"],
      where: {
        courseOfferingId: {
          in: classroomIds,
        },
      },
      _count: {
        _all: true,
      },
    })

    const sessionStats = await this.database.prisma.attendanceSession.groupBy({
      by: ["courseOfferingId", "status"],
      where: {
        courseOfferingId: {
          in: classroomIds,
        },
      },
      _count: {
        _all: true,
      },
      _sum: {
        presentCount: true,
        absentCount: true,
      },
      _max: {
        startedAt: true,
        endedAt: true,
      },
    })

    for (const classroomId of classroomIds) {
      governanceMap.set(classroomId, {
        activeStudentCount: 0,
        pendingStudentCount: 0,
        blockedStudentCount: 0,
        droppedStudentCount: 0,
        attendanceSessionCount: 0,
        liveAttendanceSessionCount: 0,
        presentRecordCount: 0,
        absentRecordCount: 0,
        latestAttendanceAt: null,
      })
    }

    for (const row of enrollmentCounts) {
      const accumulator = governanceMap.get(row.courseOfferingId)
      if (!accumulator) {
        continue
      }

      switch (row.status) {
        case "ACTIVE":
          accumulator.activeStudentCount += row._count._all
          break
        case "PENDING":
          accumulator.pendingStudentCount += row._count._all
          break
        case "BLOCKED":
          accumulator.blockedStudentCount += row._count._all
          break
        case "DROPPED":
          accumulator.droppedStudentCount += row._count._all
          break
      }
    }

    for (const row of sessionStats) {
      const accumulator = governanceMap.get(row.courseOfferingId)
      if (!accumulator) {
        continue
      }

      accumulator.attendanceSessionCount += row._count._all
      accumulator.presentRecordCount += row._sum.presentCount ?? 0
      accumulator.absentRecordCount += row._sum.absentCount ?? 0

      if (row.status === "ACTIVE") {
        accumulator.liveAttendanceSessionCount += row._count._all
      }

      accumulator.latestAttendanceAt = this.maxDate(
        accumulator.latestAttendanceAt,
        row._max.endedAt ?? row._max.startedAt ?? null,
      )
    }

    return governanceMap
  }

  private maxDate(left: Date | null, right: Date | null) {
    if (!left) {
      return right
    }

    if (!right) {
      return left
    }

    return left >= right ? left : right
  }

  private toGovernanceSummary(
    stats: GovernanceAccumulator | undefined,
    classroomStatus: ClassroomStatus,
  ): AdminClassroomGovernance {
    const safeStats = stats ?? {
      activeStudentCount: 0,
      pendingStudentCount: 0,
      blockedStudentCount: 0,
      droppedStudentCount: 0,
      attendanceSessionCount: 0,
      liveAttendanceSessionCount: 0,
      presentRecordCount: 0,
      absentRecordCount: 0,
      latestAttendanceAt: null,
    }

    const canArchiveNow =
      classroomStatus !== "ARCHIVED" && safeStats.liveAttendanceSessionCount === 0

    const archiveEffect =
      classroomStatus === "ARCHIVED"
        ? {
            archiveEffectLabel: "Already archived",
            archiveEffectMessage:
              "This classroom is already archived. Attendance history, roster history, and the audit trail remain available.",
          }
        : safeStats.liveAttendanceSessionCount > 0
          ? {
              archiveEffectLabel: "End the live session first",
              archiveEffectMessage:
                "End the live attendance session before archiving this classroom so attendance closes cleanly and history stays trustworthy.",
            }
          : {
              archiveEffectLabel: "Archive the classroom",
              archiveEffectMessage:
                "Archiving revokes the join code, stops new classroom changes, and keeps attendance history available for review and audits.",
            }

    return {
      ...safeStats,
      latestAttendanceAt: safeStats.latestAttendanceAt?.toISOString() ?? null,
      canArchiveNow,
      historyPreservedNote:
        "Archive keeps saved attendance sessions, present and absent counts, roster history, and admin audit records.",
      ...archiveEffect,
    }
  }

  private toClassroomSummary(
    input: ClassroomGovernanceRecord,
    auth: Pick<AuthRequestContext, "activeRole">,
  ): ClassroomDetail {
    return {
      id: input.id,
      semesterId: input.semesterId,
      classId: input.classId,
      sectionId: input.sectionId,
      subjectId: input.subjectId,
      primaryTeacherId: input.primaryTeacherId,
      primaryTeacherDisplayName: input.primaryTeacher?.displayName ?? null,
      createdByUserId: input.createdByUserId,
      code: input.code,
      courseCode: input.code,
      displayTitle: input.displayTitle,
      classroomTitle: input.displayTitle,
      semesterCode: input.semester?.code ?? null,
      semesterTitle: input.semester?.title ?? null,
      classCode: input.academicClass?.code ?? null,
      classTitle: input.academicClass?.title ?? null,
      sectionCode: input.section?.code ?? null,
      sectionTitle: input.section?.title ?? null,
      subjectCode: input.subject?.code ?? null,
      subjectTitle: input.subject?.title ?? null,
      status: input.status,
      defaultAttendanceMode: input.defaultAttendanceMode,
      defaultGpsRadiusMeters: input.defaultGpsRadiusMeters,
      defaultSessionDurationMinutes: input.defaultSessionDurationMinutes,
      qrRotationWindowSeconds: input.qrRotationWindowSeconds,
      bluetoothRotationWindowSeconds: input.bluetoothRotationWindowSeconds,
      timezone: input.timezone,
      requiresTrustedDevice: input.requiresTrustedDevice,
      archivedAt: input.archivedAt?.toISOString() ?? null,
      activeJoinCode:
        input.joinCodes[0] === undefined
          ? null
          : {
              id: input.joinCodes[0].id,
              courseOfferingId: input.joinCodes[0].courseOfferingId,
              classroomId: input.joinCodes[0].courseOfferingId,
              code: input.joinCodes[0].code,
              status: input.joinCodes[0].status,
              expiresAt: input.joinCodes[0].expiresAt.toISOString(),
            },
      permissions: deriveClassroomCrudPermissions({
        role: auth.activeRole,
        status: input.status,
      }),
      scheduleSlots: [],
      scheduleExceptions: [],
    }
  }
}
