import type {
  AuthenticatedUser,
  StudentAttendanceHistoryItem,
  StudentReportOverview,
  StudentSubjectReportDetail,
  StudentSubjectReportSummary,
} from "@attendease/contracts"

import {
  buildStudentAttendanceHistoryDetailLabel,
  compareStudentAttendanceHistoryItems,
  formatDateTimeLabel,
  formatHistoryMode,
  resolveStudentAttendanceHistoryTimestamp,
} from "./student-workflow-models-helpers"
import type {
  StudentAttendanceHistoryRowModel,
  StudentAttendanceHistorySummaryModel,
  StudentAttendanceInsightModel,
  StudentDeviceStatusSummaryModel,
  StudentReportOverviewModel,
  StudentSubjectReportModel,
  StudentSubjectReportSummaryModel,
} from "./student-workflow-models-types"

export function buildStudentReportOverviewModel(
  reportOverview: StudentReportOverview,
): StudentReportOverviewModel {
  return {
    trackedClassroomCount: reportOverview.trackedClassroomCount,
    totalSessions: reportOverview.totalSessions,
    presentSessions: reportOverview.presentSessions,
    absentSessions: reportOverview.absentSessions,
    attendancePercentage: reportOverview.attendancePercentage,
    lastSessionAt: reportOverview.lastSessionAt,
  }
}

export function buildStudentAttendanceInsightModel(input: {
  attendancePercentage: number
  totalSessions: number
  presentSessions: number
  absentSessions: number
}): StudentAttendanceInsightModel {
  if (input.totalSessions === 0) {
    return {
      title: "No recorded sessions yet",
      message: "Attendance will appear after your first marked class session.",
      tone: "warning",
    }
  }

  if (input.attendancePercentage >= 75) {
    return {
      title: "Attendance is on track",
      message: `Present in ${input.presentSessions} of ${input.totalSessions} recorded sessions.`,
      tone: "success",
    }
  }

  if (input.attendancePercentage >= 50) {
    return {
      title: "Attendance needs attention",
      message: `Present in ${input.presentSessions} of ${input.totalSessions} recorded sessions. ${input.absentSessions} were missed.`,
      tone: "warning",
    }
  }

  return {
    title: "Attendance is at risk",
    message: `Present in ${input.presentSessions} of ${input.totalSessions} recorded sessions. ${input.absentSessions} were missed.`,
    tone: "danger",
  }
}

export function buildStudentSubjectReportSummaryModel(
  summary: StudentSubjectReportSummary,
): StudentSubjectReportSummaryModel {
  return {
    subjectId: summary.subjectId,
    subjectCode: summary.subjectCode,
    subjectTitle: summary.subjectTitle,
    classroomCount: summary.classroomCount,
    totalSessions: summary.totalSessions,
    presentSessions: summary.presentSessions,
    absentSessions: summary.absentSessions,
    attendancePercentage: summary.attendancePercentage,
    lastSessionAt: summary.lastSessionAt,
  }
}

export function buildStudentSubjectReportModel(
  detail: StudentSubjectReportDetail,
): StudentSubjectReportModel {
  return {
    ...buildStudentSubjectReportSummaryModel(detail),
    classrooms: detail.classrooms.map((classroom) => ({
      classroomId: classroom.classroomId,
      classroomCode: classroom.classroomCode,
      classroomTitle: classroom.classroomDisplayTitle,
      totalSessions: classroom.totalSessions,
      presentSessions: classroom.presentSessions,
      absentSessions: classroom.absentSessions,
      attendancePercentage: classroom.attendancePercentage,
      lastSessionAt: classroom.lastSessionAt,
    })),
  }
}

export function buildStudentAttendanceHistorySummaryModel(
  items: StudentAttendanceHistoryItem[],
): StudentAttendanceHistorySummaryModel {
  const presentCount = items.filter((item) => item.attendanceStatus === "PRESENT").length
  const absentCount = items.filter((item) => item.attendanceStatus === "ABSENT").length
  const totalRecords = items.length
  const latestItem = [...items].sort(compareStudentAttendanceHistoryItems)[0] ?? null

  return {
    totalRecords,
    presentCount,
    absentCount,
    attendancePercentage:
      totalRecords > 0 ? Number(((presentCount / totalRecords) * 100).toFixed(2)) : 0,
    lastRecordedAt: latestItem ? resolveStudentAttendanceHistoryTimestamp(latestItem) : null,
  }
}

export function buildStudentAttendanceHistoryRows(
  items: StudentAttendanceHistoryItem[],
): StudentAttendanceHistoryRowModel[] {
  return [...items].sort(compareStudentAttendanceHistoryItems).map((item) => ({
    attendanceRecordId: item.attendanceRecordId,
    sessionId: item.sessionId,
    classroomId: item.classroomId,
    title: item.classroomDisplayTitle,
    subtitle: `${item.subjectCode} · ${formatHistoryMode(item.mode)}`,
    statusLabel: item.attendanceStatus === "PRESENT" ? "Present" : "Absent",
    statusTone: item.attendanceStatus === "PRESENT" ? "success" : "danger",
    timeLabel: formatDateTimeLabel(resolveStudentAttendanceHistoryTimestamp(item)),
    detailLabel: buildStudentAttendanceHistoryDetailLabel(item),
  }))
}

export function buildStudentDeviceStatusSummaryModel(
  deviceTrust: AuthenticatedUser["deviceTrust"] | null | undefined,
): StudentDeviceStatusSummaryModel {
  if (!deviceTrust) {
    return {
      label: "Needs review",
      tone: "warning",
      helperText: "Sign in on your attendance phone to check whether it can mark attendance.",
    }
  }

  switch (deviceTrust.lifecycleState) {
    case "TRUSTED":
      return {
        label: "Trusted phone",
        tone: "success",
        helperText: "This phone is approved for student attendance.",
      }
    case "PENDING_REPLACEMENT":
      return {
        label: "Pending approval",
        tone: "warning",
        helperText: "This replacement phone is waiting for admin approval.",
      }
    case "REPLACED":
      return {
        label: "Replaced",
        tone: "danger",
        helperText: "Attendance stays blocked here until a new phone is approved.",
      }
    case "NOT_APPLICABLE":
      return {
        label: "Not required",
        tone: "primary",
        helperText: "Device approval is not required for the current role.",
      }
    default:
      return {
        label: "Needs review",
        tone: "warning",
        helperText: "Open device status if this phone cannot mark attendance yet.",
      }
  }
}
