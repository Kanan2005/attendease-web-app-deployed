import {
  type ClassroomJoinCodeSummary,
  type StudentClassroomMembershipSummary,
  classroomJoinCodeSummarySchema,
  studentClassroomMembershipSummarySchema,
} from "@attendease/contracts"
import { BadRequestException } from "@nestjs/common"

import { toInclusiveDayEnd } from "./academic.helpers.js"
import type { ClassroomAccessContext } from "./classrooms.service.js"

export function assertClassroomAllowsRosterMutations(
  classroom: Pick<ClassroomAccessContext, "status" | "semester">,
) {
  if (classroom.status === "COMPLETED" || classroom.status === "ARCHIVED") {
    throw new BadRequestException(
      "Join codes cannot be changed for completed or archived classrooms.",
    )
  }

  if (classroom.semester.status === "CLOSED" || classroom.semester.status === "ARCHIVED") {
    throw new BadRequestException(
      "Join codes cannot be changed inside a closed or archived semester.",
    )
  }
}

export function assertClassroomAllowsStudentJoin(classroom: {
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
  semester: {
    status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED"
  }
}) {
  if (classroom.status === "COMPLETED" || classroom.status === "ARCHIVED") {
    throw new BadRequestException("This classroom is no longer open for student joins.")
  }

  if (classroom.semester.status === "CLOSED" || classroom.semester.status === "ARCHIVED") {
    throw new BadRequestException("This semester is no longer open for student joins.")
  }
}

export function resolveJoinCodeExpiry(
  semesterEndDate: Date,
  requestedExpiresAt: string | undefined,
  now: Date,
) {
  const semesterEnd = toInclusiveDayEnd(semesterEndDate)
  const expiresAt = requestedExpiresAt ? new Date(requestedExpiresAt) : semesterEnd

  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= now) {
    throw new BadRequestException("Join code expiry must be in the future.")
  }

  if (expiresAt > semesterEnd) {
    throw new BadRequestException("Join code expiry must fall inside the semester window.")
  }

  return expiresAt
}

export function toJoinCodeSummary(
  input: {
    id: string
    courseOfferingId: string
    code: string
    status: "ACTIVE" | "EXPIRED" | "REVOKED"
    expiresAt: Date
  } | null,
): ClassroomJoinCodeSummary | null {
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

export function toStudentClassroomMembershipSummary(
  classroom: {
    id: string
    semesterId: string
    classId: string
    sectionId: string
    subjectId: string
    primaryTeacherId: string
    code: string
    displayTitle: string
    status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
    defaultAttendanceMode: "QR_GPS" | "BLUETOOTH" | "MANUAL"
    timezone: string
    requiresTrustedDevice: boolean
  },
  enrollment: {
    id: string
    status: "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED"
    source: "JOIN_CODE" | "IMPORT" | "MANUAL" | "ADMIN"
    joinedAt: Date
    droppedAt: Date | null
  },
): StudentClassroomMembershipSummary {
  return studentClassroomMembershipSummarySchema.parse({
    id: classroom.id,
    classroomId: classroom.id,
    semesterId: classroom.semesterId,
    classId: classroom.classId,
    sectionId: classroom.sectionId,
    subjectId: classroom.subjectId,
    primaryTeacherId: classroom.primaryTeacherId,
    code: classroom.code,
    displayTitle: classroom.displayTitle,
    classroomStatus: classroom.status,
    defaultAttendanceMode: classroom.defaultAttendanceMode,
    timezone: classroom.timezone,
    requiresTrustedDevice: classroom.requiresTrustedDevice,
    enrollmentId: enrollment.id,
    membershipId: enrollment.id,
    enrollmentStatus: enrollment.status,
    membershipStatus: enrollment.status,
    enrollmentSource: enrollment.source,
    membershipSource: enrollment.source,
    joinedAt: enrollment.joinedAt.toISOString(),
    droppedAt: enrollment.droppedAt?.toISOString() ?? null,
  })
}
