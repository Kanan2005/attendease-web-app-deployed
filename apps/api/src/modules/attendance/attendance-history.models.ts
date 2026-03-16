import {
  type AttendanceSessionDetail,
  type AttendanceSessionEditability,
  type AttendanceSessionHistoryItem,
  type AttendanceSessionStudentSummary,
  type AttendanceSessionSummary,
  type StudentAttendanceHistoryItem,
  attendanceSessionDetailSchema,
  attendanceSessionEditabilitySchema,
  attendanceSessionHistoryItemSchema,
  attendanceSessionStudentSummarySchema,
  studentAttendanceHistoryItemSchema,
} from "@attendease/contracts"
import type { SecurityEventType } from "@attendease/db"

export type AttendanceHistoryReadRecord = {
  id: string
  courseOfferingId: string
  teacherId: string
  teacherAssignmentId: string
  semesterId: string
  classId: string
  sectionId: string
  subjectId: string
  lectureId: string | null
  courseOffering: {
    code: string
    displayTitle: string
  }
  teacher: {
    displayName: string
    email: string
  }
  semester: {
    code: string
    title: string
  }
  academicClass: {
    code: string
    title: string
  }
  section: {
    code: string
    title: string
  }
  subject: {
    code: string
    title: string
  }
  lecture: {
    title: string | null
    lectureDate: Date
  } | null
}

export type AttendanceStudentReadRecord = {
  id: string
  enrollmentId: string
  studentId: string
  status: "PRESENT" | "ABSENT"
  markedAt: Date | null
  student: {
    displayName: string
    email: string
    rollNumber: string | null
  }
}

export type StudentAttendanceHistoryReadRecord = {
  id: string
  enrollmentId: string
  studentId: string
  status: "PRESENT" | "ABSENT"
  markSource: "QR_GPS" | "BLUETOOTH" | "MANUAL" | null
  markedAt: Date | null
  session: AttendanceHistoryReadRecord & {
    mode: "QR_GPS" | "BLUETOOTH" | "MANUAL"
    status: "DRAFT" | "ACTIVE" | "ENDED" | "CANCELLED" | "EXPIRED"
    startedAt: Date | null
    endedAt: Date | null
  }
}

export type AttendanceSecurityBreakdown = {
  suspiciousAttemptCount: number
  blockedUntrustedDeviceCount: number
  locationValidationFailureCount: number
  bluetoothValidationFailureCount: number
  revokedDeviceAttemptCount: number
}

const suspiciousAttendanceSecurityEventTypes = new Set<SecurityEventType>([
  "ATTENDANCE_BLOCKED_UNTRUSTED_DEVICE",
  "ATTENDANCE_LOCATION_VALIDATION_FAILED",
  "ATTENDANCE_BLUETOOTH_VALIDATION_FAILED",
  "REVOKED_DEVICE_USED",
])

export function deriveAttendanceSessionEditability(input: {
  endedAt: string | null
  editableUntil: string | null
  now?: Date | undefined
}): AttendanceSessionEditability {
  const now = input.now ?? new Date()

  if (!input.endedAt) {
    return attendanceSessionEditabilitySchema.parse({
      isEditable: false,
      state: "PENDING_SESSION_END",
      endedAt: input.endedAt,
      editableUntil: input.editableUntil,
    })
  }

  if (input.editableUntil && new Date(input.editableUntil) > now) {
    return attendanceSessionEditabilitySchema.parse({
      isEditable: true,
      state: "OPEN",
      endedAt: input.endedAt,
      editableUntil: input.editableUntil,
    })
  }

  return attendanceSessionEditabilitySchema.parse({
    isEditable: false,
    state: "LOCKED",
    endedAt: input.endedAt,
    editableUntil: input.editableUntil,
  })
}

export function buildAttendanceSecurityBreakdown(
  input: Array<{ eventType: SecurityEventType; count: number }>,
): AttendanceSecurityBreakdown {
  const breakdown: AttendanceSecurityBreakdown = {
    suspiciousAttemptCount: 0,
    blockedUntrustedDeviceCount: 0,
    locationValidationFailureCount: 0,
    bluetoothValidationFailureCount: 0,
    revokedDeviceAttemptCount: 0,
  }

  for (const event of input) {
    if (!suspiciousAttendanceSecurityEventTypes.has(event.eventType)) {
      continue
    }

    breakdown.suspiciousAttemptCount += event.count

    if (event.eventType === "ATTENDANCE_BLOCKED_UNTRUSTED_DEVICE") {
      breakdown.blockedUntrustedDeviceCount += event.count
    }

    if (event.eventType === "ATTENDANCE_LOCATION_VALIDATION_FAILED") {
      breakdown.locationValidationFailureCount += event.count
    }

    if (event.eventType === "ATTENDANCE_BLUETOOTH_VALIDATION_FAILED") {
      breakdown.bluetoothValidationFailureCount += event.count
    }

    if (event.eventType === "REVOKED_DEVICE_USED") {
      breakdown.revokedDeviceAttemptCount += event.count
    }
  }

  return breakdown
}

export function toAttendanceSessionHistoryItem(input: {
  summary: AttendanceSessionSummary
  session: AttendanceHistoryReadRecord
  now?: Date
}): AttendanceSessionHistoryItem {
  return attendanceSessionHistoryItemSchema.parse({
    id: input.summary.id,
    classroomId: input.summary.classroomId,
    classroomCode: input.session.courseOffering.code,
    classroomDisplayTitle: input.session.courseOffering.displayTitle,
    lectureId: input.summary.lectureId,
    lectureTitle: input.session.lecture?.title ?? null,
    lectureDate: input.session.lecture?.lectureDate.toISOString() ?? null,
    teacherAssignmentId: input.summary.teacherAssignmentId,
    mode: input.summary.mode,
    status: input.summary.status,
    startedAt: input.summary.startedAt,
    scheduledEndAt: input.summary.scheduledEndAt,
    endedAt: input.summary.endedAt,
    editableUntil: input.summary.editableUntil,
    classId: input.session.classId,
    classCode: input.session.academicClass.code,
    classTitle: input.session.academicClass.title,
    sectionId: input.session.sectionId,
    sectionCode: input.session.section.code,
    sectionTitle: input.session.section.title,
    subjectId: input.session.subjectId,
    subjectCode: input.session.subject.code,
    subjectTitle: input.session.subject.title,
    presentCount: input.summary.presentCount,
    absentCount: input.summary.absentCount,
    editability: deriveAttendanceSessionEditability({
      endedAt: input.summary.endedAt,
      editableUntil: input.summary.editableUntil,
      now: input.now,
    }),
  })
}

export function toAttendanceSessionDetail(input: {
  summary: AttendanceSessionSummary
  session: AttendanceHistoryReadRecord
  security: AttendanceSecurityBreakdown
  now?: Date
}): AttendanceSessionDetail {
  return attendanceSessionDetailSchema.parse({
    ...input.summary,
    classroomCode: input.session.courseOffering.code,
    classroomDisplayTitle: input.session.courseOffering.displayTitle,
    lectureTitle: input.session.lecture?.title ?? null,
    lectureDate: input.session.lecture?.lectureDate.toISOString() ?? null,
    teacherId: input.session.teacherId,
    teacherDisplayName: input.session.teacher.displayName,
    teacherEmail: input.session.teacher.email,
    semesterCode: input.session.semester.code,
    semesterTitle: input.session.semester.title,
    classCode: input.session.academicClass.code,
    classTitle: input.session.academicClass.title,
    sectionCode: input.session.section.code,
    sectionTitle: input.session.section.title,
    subjectCode: input.session.subject.code,
    subjectTitle: input.session.subject.title,
    editability: deriveAttendanceSessionEditability({
      endedAt: input.summary.endedAt,
      editableUntil: input.summary.editableUntil,
      now: input.now,
    }),
    suspiciousAttemptCount: input.security.suspiciousAttemptCount,
    blockedUntrustedDeviceCount: input.security.blockedUntrustedDeviceCount,
    locationValidationFailureCount: input.security.locationValidationFailureCount,
    bluetoothValidationFailureCount: input.security.bluetoothValidationFailureCount,
    revokedDeviceAttemptCount: input.security.revokedDeviceAttemptCount,
  })
}

export function toAttendanceSessionStudentSummary(
  record: AttendanceStudentReadRecord,
): AttendanceSessionStudentSummary {
  return attendanceSessionStudentSummarySchema.parse({
    attendanceRecordId: record.id,
    enrollmentId: record.enrollmentId,
    studentId: record.studentId,
    studentDisplayName: record.student.displayName,
    studentEmail: record.student.email,
    studentRollNumber: record.student.rollNumber,
    status: record.status,
    markedAt: record.markedAt?.toISOString() ?? null,
  })
}

export function toStudentAttendanceHistoryItem(
  record: StudentAttendanceHistoryReadRecord,
): StudentAttendanceHistoryItem {
  return studentAttendanceHistoryItemSchema.parse({
    attendanceRecordId: record.id,
    sessionId: record.session.id,
    classroomId: record.session.courseOfferingId,
    classroomCode: record.session.courseOffering.code,
    classroomDisplayTitle: record.session.courseOffering.displayTitle,
    lectureId: record.session.lectureId,
    lectureTitle: record.session.lecture?.title ?? null,
    lectureDate: record.session.lecture?.lectureDate.toISOString() ?? null,
    mode: record.session.mode,
    sessionStatus: record.session.status,
    attendanceStatus: record.status,
    markSource: record.markSource,
    markedAt: record.markedAt?.toISOString() ?? null,
    startedAt: record.session.startedAt?.toISOString() ?? null,
    endedAt: record.session.endedAt?.toISOString() ?? null,
    subjectId: record.session.subjectId,
    subjectCode: record.session.subject.code,
    subjectTitle: record.session.subject.title,
  })
}
