import {
  type ClassroomDetail,
  type ClassroomSummary,
  type ScheduleExceptionSummary,
  type ScheduleSlotSummary,
  classroomDetailSchema,
  classroomJoinCodeSummarySchema,
  classroomSummarySchema,
  scheduleExceptionSummarySchema,
  scheduleSlotSummarySchema,
} from "@attendease/contracts"
import type { Prisma } from "@attendease/db"
import { deriveClassroomCrudPermissions } from "@attendease/domain"

import type { AuthRequestContext } from "../auth/auth.types.js"
import type { ClassroomWithRelations } from "./classrooms.service.types.js"

export function getClassroomSummaryInclude(): Prisma.CourseOfferingInclude {
  return {
    joinCodes: {
      where: {
        status: "ACTIVE" as const,
      },
      orderBy: {
        createdAt: "desc" as const,
      },
      take: 1,
    },
    semester: {
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        startDate: true,
        endDate: true,
      },
    },
    academicClass: {
      select: {
        id: true,
        code: true,
        title: true,
      },
    },
    section: {
      select: {
        id: true,
        code: true,
        title: true,
      },
    },
    subject: {
      select: {
        id: true,
        code: true,
        title: true,
      },
    },
    primaryTeacher: {
      select: {
        id: true,
        displayName: true,
      },
    },
  }
}

export function getClassroomDetailInclude(): Prisma.CourseOfferingInclude {
  return {
    ...getClassroomSummaryInclude(),
    scheduleSlots: {
      orderBy: [{ weekday: "asc" as const }, { startMinutes: "asc" as const }],
    },
    scheduleExceptions: {
      orderBy: [{ effectiveDate: "asc" as const }, { startMinutes: "asc" as const }],
    },
  }
}

function toJoinCodeSummary(
  input: {
    id: string
    courseOfferingId: string
    code: string
    status: "ACTIVE" | "EXPIRED" | "REVOKED"
    expiresAt: Date
  } | null,
) {
  if (!input) {
    return null
  }

  return classroomJoinCodeSummarySchema.parse({
    id: input.id,
    courseOfferingId: input.courseOfferingId,
    classroomId: input.courseOfferingId,
    code: input.code,
    status: input.status,
    expiresAt: input.expiresAt.toISOString(),
  })
}

function toScheduleSlotSummary(input: {
  id: string
  courseOfferingId: string
  weekday: number
  startMinutes: number
  endMinutes: number
  locationLabel: string | null
  status: "ACTIVE" | "ARCHIVED"
}): ScheduleSlotSummary {
  return scheduleSlotSummarySchema.parse({
    id: input.id,
    courseOfferingId: input.courseOfferingId,
    classroomId: input.courseOfferingId,
    weekday: input.weekday,
    startMinutes: input.startMinutes,
    endMinutes: input.endMinutes,
    locationLabel: input.locationLabel,
    status: input.status,
  })
}

function toScheduleExceptionSummary(input: {
  id: string
  courseOfferingId: string
  scheduleSlotId: string | null
  exceptionType: "CANCELLED" | "RESCHEDULED" | "ONE_OFF"
  effectiveDate: Date
  startMinutes: number | null
  endMinutes: number | null
  locationLabel: string | null
  reason: string | null
}): ScheduleExceptionSummary {
  return scheduleExceptionSummarySchema.parse({
    id: input.id,
    courseOfferingId: input.courseOfferingId,
    classroomId: input.courseOfferingId,
    scheduleSlotId: input.scheduleSlotId,
    exceptionType: input.exceptionType,
    effectiveDate: input.effectiveDate.toISOString(),
    startMinutes: input.startMinutes,
    endMinutes: input.endMinutes,
    locationLabel: input.locationLabel,
    reason: input.reason,
  })
}

export function toClassroomSummary(
  input: ClassroomWithRelations,
  auth: Pick<AuthRequestContext, "activeRole">,
  options: {
    includeJoinCode?: boolean
  } = {},
): ClassroomSummary {
  return classroomSummarySchema.parse({
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
      options.includeJoinCode === false ? null : toJoinCodeSummary(input.joinCodes[0] ?? null),
    permissions: deriveClassroomCrudPermissions({
      role: auth.activeRole,
      status: input.status,
    }),
  })
}

export function toClassroomDetail(
  input: ClassroomWithRelations,
  auth: Pick<AuthRequestContext, "activeRole">,
  options: {
    includeJoinCode?: boolean
  } = {},
): ClassroomDetail {
  return classroomDetailSchema.parse({
    ...toClassroomSummary(input, auth, options),
    scheduleSlots: (input.scheduleSlots ?? []).map((slot) => toScheduleSlotSummary(slot)),
    scheduleExceptions: (input.scheduleExceptions ?? []).map((exception) =>
      toScheduleExceptionSummary(exception),
    ),
  })
}
