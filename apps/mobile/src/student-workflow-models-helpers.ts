import type {
  ClassroomSchedule,
  LectureSummary,
  StudentAttendanceHistoryItem,
  StudentClassroomMembershipSummary,
} from "@attendease/contracts"

import type { StudentAttendanceCandidate } from "./student-workflow-models-types"

export const weekdayLabels = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

export function buildExceptionTitle(
  exceptionType: ClassroomSchedule["scheduleExceptions"][number]["exceptionType"],
) {
  switch (exceptionType) {
    case "CANCELLED":
      return "Cancelled class"
    case "RESCHEDULED":
      return "Rescheduled class"
    default:
      return "One-off class"
  }
}

export function resolveLectureTimestamp(lecture: LectureSummary) {
  return lecture.actualStartAt ?? lecture.plannedStartAt ?? lecture.lectureDate
}

export function resolveStudentAttendanceHistoryTimestamp(item: StudentAttendanceHistoryItem) {
  return (
    item.markedAt ?? item.startedAt ?? item.lectureDate ?? item.endedAt ?? new Date(0).toISOString()
  )
}

export function compareStudentAttendanceHistoryItems(
  left: StudentAttendanceHistoryItem,
  right: StudentAttendanceHistoryItem,
) {
  return (
    new Date(resolveStudentAttendanceHistoryTimestamp(right)).getTime() -
    new Date(resolveStudentAttendanceHistoryTimestamp(left)).getTime()
  )
}

export function formatHistoryMode(mode: StudentAttendanceHistoryItem["mode"]) {
  return mode === "QR_GPS" ? "QR + GPS" : mode === "BLUETOOTH" ? "Bluetooth" : "Manual"
}

export function buildStudentAttendanceHistoryDetailLabel(item: StudentAttendanceHistoryItem) {
  const title = item.lectureTitle ?? "Attendance session"
  const sourceLabel =
    item.markSource === "QR_GPS"
      ? "Marked with QR + GPS"
      : item.markSource === "BLUETOOTH"
        ? "Marked with Bluetooth"
        : item.markSource === "MANUAL"
          ? "Updated manually"
          : item.sessionStatus === "ACTIVE"
            ? "Session is still open"
            : "Recorded attendance"

  return `${title} · ${sourceLabel}`
}

export function formatMinutes(minutes: number) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  const normalizedHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const suffix = hour >= 12 ? "PM" : "AM"

  return `${normalizedHour}:${String(minute).padStart(2, "0")} ${suffix}`
}

export function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    dateStyle: "medium",
  })
}

export function formatDateTimeLabel(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

// v2.0: Date-only format — avoids the "5:30 am" bug when only a date
// (no time component) is available.
export function formatDateOnlyLabel(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    dateStyle: "medium",
  })
}

export function formatEnrollmentStatusLabel(
  status: StudentClassroomMembershipSummary["enrollmentStatus"],
) {
  switch (status) {
    case "ACTIVE":
      return "Joined"
    case "PENDING":
      return "Pending"
    case "DROPPED":
      return "Removed"
    case "BLOCKED":
      return "Blocked"
    default:
      return "Classroom"
  }
}

export function formatAttendanceModeLabel(
  mode: StudentClassroomMembershipSummary["defaultAttendanceMode"],
) {
  switch (mode) {
    case "QR_GPS":
      return "QR + GPS"
    case "BLUETOOTH":
      return "Bluetooth"
    case "MANUAL":
      return "Manual"
    default:
      return "Attendance"
  }
}

export function buildAttendanceCandidateMessage(candidates: StudentAttendanceCandidate[]) {
  if (candidates.length === 1) {
    return `${formatAttendanceModeLabel(candidates[0]?.mode ?? "QR_GPS")} is ready for ${candidates[0]?.lectureTitle ?? "this class session"}.`
  }

  const qrCount = candidates.filter((candidate) => candidate.mode === "QR_GPS").length
  const bluetoothCount = candidates.filter((candidate) => candidate.mode === "BLUETOOTH").length
  const parts = [
    qrCount > 0 ? `${qrCount} QR + GPS` : null,
    bluetoothCount > 0 ? `${bluetoothCount} Bluetooth` : null,
  ].filter((value): value is string => Boolean(value))

  return `${parts.join(" and ")} ${pluralizeLabel("session", candidates.length)} are ready in this course.`
}

export function pluralizeLabel(label: string, count: number) {
  return count === 1 ? label : `${label}s`
}
