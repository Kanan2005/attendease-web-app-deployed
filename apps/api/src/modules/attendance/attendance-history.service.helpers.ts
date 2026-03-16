import type {
  AttendanceSessionHistoryListQuery,
  AttendanceSessionSummary,
  LiveAttendanceSessionDiscoveryQuery,
  LiveAttendanceSessionSummary,
  StudentAttendanceHistoryListQuery,
} from "@attendease/contracts"
import {
  attendanceSessionSummarySchema,
  liveAttendanceSessionSummarySchema,
} from "@attendease/contracts"
import type { Prisma } from "@attendease/db"

import type { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import type { AttendanceHistoryReadRecord } from "./attendance-history.models.js"

export const attendanceHistoryReadInclude = {
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

export type AttendanceHistorySessionRow = AttendanceHistoryReadRecord & {
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

export function buildHistoryWhere(
  auth: AuthRequestContext,
  filters: AttendanceSessionHistoryListQuery,
): Prisma.AttendanceSessionWhereInput {
  return {
    ...buildTeacherAdminHistoryAccessWhere(auth),
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

export function buildHistoryScopeWhere(
  auth: AuthRequestContext,
  filters: AttendanceSessionHistoryListQuery,
): Prisma.AttendanceSessionWhereInput {
  return {
    ...buildTeacherAdminHistoryAccessWhere(auth),
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

export function buildStudentHistoryWhere(
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

export function buildLiveSessionWhere(
  auth: AuthRequestContext,
  filters: LiveAttendanceSessionDiscoveryQuery,
): Prisma.AttendanceSessionWhereInput {
  return {
    ...buildLiveSessionScopeWhere(auth, filters),
    status: "ACTIVE",
  }
}

export function buildLiveSessionScopeWhere(
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

function buildTeacherAdminHistoryAccessWhere(
  auth: AuthRequestContext,
): Prisma.AttendanceSessionWhereInput {
  return auth.activeRole === "ADMIN" ? {} : { teacherId: auth.userId }
}

export async function normalizeExpiredActiveSessions(input: {
  database: DatabaseService["prisma"]
  auth: AuthRequestContext
  scopeWhere: Prisma.AttendanceSessionWhereInput
  resolveSession(input: { auth: AuthRequestContext; sessionId: string }): Promise<unknown>
}) {
  const now = new Date()
  const overdueSessions = await input.database.attendanceSession.findMany({
    where: {
      AND: [
        input.scopeWhere,
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
      input.resolveSession({
        auth: input.auth,
        sessionId: session.id,
      }),
    ),
  )
}

export function toStoredSessionSummary(
  input: AttendanceHistorySessionRow,
): AttendanceSessionSummary {
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
    anchorLatitude: toNullableNumber(input.gpsCenterLatitude),
    anchorLongitude: toNullableNumber(input.gpsCenterLongitude),
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

export function toLiveAttendanceSessionSummary(
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

function toNullableNumber(value: { toNumber: () => number } | null): number | null {
  return value ? value.toNumber() : null
}
