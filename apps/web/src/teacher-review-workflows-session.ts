import { AuthApiClientError } from "@attendease/auth"
import type {
  AttendanceRecordStatus,
  AttendanceSessionDetail,
  AttendanceSessionHistoryItem,
  AttendanceSessionStudentSummary,
} from "@attendease/contracts"
import {
  calculateAttendancePercentage,
  getAttendanceCorrectionActionLabel,
  getAttendanceCorrectionPendingLabel,
} from "@attendease/domain"

import {
  extractApiErrorMessage,
  formatReviewDateTime,
  toneForAttendancePercentage,
} from "./teacher-review-workflows-shared"
import type {
  TeacherWebSessionDetailOverviewModel,
  TeacherWebSessionDetailStatusModel,
  TeacherWebSessionHistorySummaryModel,
  TeacherWebSessionRosterModel,
  TeacherWebSessionRosterRowModel,
} from "./teacher-review-workflows-types"

export function buildTeacherWebSessionHistorySummaryModel(input: {
  sessions: AttendanceSessionHistoryItem[]
  filterSummary: string
}): TeacherWebSessionHistorySummaryModel {
  const editableSessions = input.sessions.filter((session) => session.editability.isEditable).length
  const activeSessions = input.sessions.filter((session) => session.status === "ACTIVE").length
  const sessionsNeedingReview = input.sessions.filter((session) => session.absentCount > 0).length
  const totalPresent = input.sessions.reduce((sum, session) => sum + session.presentCount, 0)
  const totalStudents = input.sessions.reduce(
    (sum, session) => sum + session.presentCount + session.absentCount,
    0,
  )
  const attendancePercentage = calculateAttendancePercentage({
    presentCount: totalPresent,
    totalCount: totalStudents,
  })

  return {
    summaryCards: [
      {
        label: "Sessions in view",
        value: String(input.sessions.length),
        tone: input.sessions.length > 0 ? "primary" : "warning",
      },
      {
        label: "Corrections open",
        value: String(editableSessions),
        tone: editableSessions > 0 ? "success" : "warning",
      },
      {
        label: "Need review",
        value: String(sessionsNeedingReview),
        tone: sessionsNeedingReview > 0 ? "warning" : "success",
      },
      {
        label: "Attendance",
        value: `${attendancePercentage}%`,
        tone: toneForAttendancePercentage(attendancePercentage),
      },
    ],
    filterSummary: input.filterSummary,
    availabilityMessage:
      activeSessions > 0
        ? `${activeSessions} live session${activeSessions === 1 ? "" : "s"} still appear here. End a live session before saving manual corrections.`
        : "Session review, reports, and exports all read the same finalized attendance truth.",
  }
}

export function buildTeacherWebSessionRosterModel(input: {
  students: AttendanceSessionStudentSummary[]
  draft?: Partial<Record<string, AttendanceRecordStatus>>
  isEditable: boolean
}): TeacherWebSessionRosterModel {
  const rows = input.students.map((student) => {
    const effectiveStatus = input.draft?.[student.attendanceRecordId] ?? student.status
    const isPendingChange = effectiveStatus !== student.status
    const actionTargetStatus = input.isEditable
      ? effectiveStatus === "PRESENT"
        ? "ABSENT"
        : "PRESENT"
      : null

    return {
      attendanceRecordId: student.attendanceRecordId,
      studentDisplayName: student.studentDisplayName,
      studentEmail: student.studentEmail,
      studentRollNumber: student.studentRollNumber,
      identityLabel: student.studentRollNumber
        ? `${student.studentRollNumber} · ${student.studentEmail}`
        : student.studentEmail,
      markedAt: student.markedAt,
      savedStatus: student.status,
      effectiveStatus,
      statusTone: effectiveStatus === "PRESENT" ? "success" : "warning",
      pendingChangeLabel: isPendingChange
        ? getAttendanceCorrectionPendingLabel(effectiveStatus)
        : null,
      actionLabel: actionTargetStatus
        ? getAttendanceCorrectionActionLabel(actionTargetStatus)
        : null,
      actionTargetStatus,
    } satisfies TeacherWebSessionRosterRowModel
  })

  const presentRows = rows
    .filter((row) => row.effectiveStatus === "PRESENT")
    .sort((left, right) => {
      const leftMarkedAt = left.markedAt ? new Date(left.markedAt).getTime() : 0
      const rightMarkedAt = right.markedAt ? new Date(right.markedAt).getTime() : 0

      if (leftMarkedAt !== rightMarkedAt) {
        return rightMarkedAt - leftMarkedAt
      }

      return left.studentDisplayName.localeCompare(right.studentDisplayName)
    })
  const absentRows = rows
    .filter((row) => row.effectiveStatus === "ABSENT")
    .sort((left, right) => left.studentDisplayName.localeCompare(right.studentDisplayName))

  return {
    presentRows,
    absentRows,
    presentSummary:
      presentRows.length === 0
        ? "No students are currently marked present."
        : `${presentRows.length} student${presentRows.length === 1 ? "" : "s"} will count as present after save.`,
    absentSummary:
      absentRows.length === 0
        ? "Everyone in this session is currently marked present."
        : `${absentRows.length} student${absentRows.length === 1 ? "" : "s"} will count as absent after save.`,
  }
}

export function buildTeacherWebSessionDetailOverviewModel(input: {
  session: AttendanceSessionDetail | null
  roster: TeacherWebSessionRosterModel
  pendingChangeCount: number
}): TeacherWebSessionDetailOverviewModel {
  const presentCount = input.roster.presentRows.length
  const absentCount = input.roster.absentRows.length
  const totalStudents = presentCount + absentCount
  const attendancePercentage = calculateAttendancePercentage({
    presentCount,
    totalCount: totalStudents,
  })

  return {
    summaryCards: [
      {
        label: "Present",
        value: String(presentCount),
        tone: "success",
      },
      {
        label: "Absent",
        value: String(absentCount),
        tone: absentCount > 0 ? "warning" : "success",
      },
      {
        label: "Attendance",
        value: `${attendancePercentage}%`,
        tone: toneForAttendancePercentage(attendancePercentage),
      },
      {
        label: "Corrections",
        value: input.session?.editability.isEditable
          ? input.pendingChangeCount > 0
            ? `${input.pendingChangeCount} waiting`
            : "Open"
          : "Locked",
        tone:
          input.session?.editability.isEditable && input.pendingChangeCount > 0
            ? "warning"
            : input.session?.editability.isEditable
              ? "success"
              : "primary",
      },
    ],
    rosterSummary:
      totalStudents > 0
        ? `${presentCount} of ${totalStudents} students are currently in the present list.`
        : "No student roster is available for this attendance session yet.",
    timingSummary:
      input.session?.endedAt && input.session?.editableUntil
        ? `Ended ${formatReviewDateTime(input.session.endedAt)} · editable until ${formatReviewDateTime(input.session.editableUntil)}.`
        : input.session?.endedAt
          ? `Ended ${formatReviewDateTime(input.session.endedAt)}.`
          : input.session?.startedAt
            ? `Live since ${formatReviewDateTime(input.session.startedAt)}.`
            : "Timing details will appear here once the session starts.",
    correctionSummary: input.session?.editability.isEditable
      ? input.pendingChangeCount > 0
        ? `${input.pendingChangeCount} correction${input.pendingChangeCount === 1 ? "" : "s"} will refresh saved totals in history, reports, and exports when you save.`
        : "Use the student lists below to mark present or mark absent, then save once."
      : input.session?.status === "ACTIVE"
        ? "Attendance is still live. Review the lists here, then end the session before making corrections."
        : "The correction window is closed. The present and absent lists below are now final.",
    presentSectionSubtitle:
      input.session?.status === "ACTIVE"
        ? "Students already marked during the live session appear here first."
        : "Students in the present list count toward the final saved result.",
    absentSectionSubtitle:
      input.session?.status === "ACTIVE"
        ? "Students who have not checked in yet remain here until the live session ends."
        : "Students in the absent list remain absent unless you move them into present.",
    securitySummary:
      input.session && input.session.suspiciousAttemptCount > 0
        ? `${input.session.suspiciousAttemptCount} suspicious attempt${input.session.suspiciousAttemptCount === 1 ? "" : "s"} recorded. Location: ${input.session.locationValidationFailureCount}, Bluetooth: ${input.session.bluetoothValidationFailureCount}, revoked device: ${input.session.revokedDeviceAttemptCount}.`
        : null,
  }
}

export function buildTeacherWebSessionDetailStatusModel(input: {
  session: AttendanceSessionDetail | null
  pendingChangeCount: number
}): TeacherWebSessionDetailStatusModel {
  if (
    input.session?.status === "ACTIVE" ||
    input.session?.editability.state === "PENDING_SESSION_END"
  ) {
    return {
      title: "Attendance is still live",
      message:
        "Present and absent lists keep updating while the session is open. End the session before saving manual corrections.",
      tone: "warning",
    }
  }

  if (input.session?.editability.isEditable && input.pendingChangeCount > 0) {
    return {
      title: `${input.pendingChangeCount} correction${input.pendingChangeCount === 1 ? "" : "s"} ready to save`,
      message:
        "Review the updated present and absent lists, then save once to refresh history, reports, and exports.",
      tone: "warning",
    }
  }

  if (input.session?.editability.isEditable) {
    return {
      title: "Corrections are open",
      message:
        "Use the present and absent lists below to correct attendance quickly before the edit window closes.",
      tone: "success",
    }
  }

  return {
    title: "Session is read-only",
    message:
      "The correction window is closed. The present and absent lists below are the final saved result.",
    tone: "warning",
  }
}

export function mapTeacherWebReviewErrorToMessage(
  error: unknown,
  fallback = "AttendEase couldn't finish the teacher review request.",
): string {
  if (error instanceof AuthApiClientError) {
    const detailMessage = extractApiErrorMessage(error.details)

    switch (error.status) {
      case 401:
        return "Your teacher session expired. Sign in again to continue reviewing attendance."
      case 403:
        return detailMessage ?? "This teacher review action is outside your classroom scope."
      case 404:
        return detailMessage ?? "The selected attendance session is no longer available."
      case 409:
        return (
          detailMessage ?? "This attendance session changed before the correction could be saved."
        )
      default:
        return detailMessage ?? fallback
    }
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message
  }

  return fallback
}
