import type {
  AttendanceRecordStatus,
  AttendanceSessionDetail,
  AttendanceSessionEditability,
  AttendanceSessionStatus,
  AttendanceSessionStudentSummary,
} from "@attendease/contracts"
import {
  calculateAttendancePercentage,
  getAttendanceCorrectionActionLabel,
  getAttendanceCorrectionPendingLabel,
} from "@attendease/domain"

import type { TeacherCardTone } from "./teacher-models"
import { formatTeacherDateTime, toneForAttendancePercentage } from "./teacher-operational-reports"
import type {
  TeacherSessionDetailOverviewModel,
  TeacherSessionDetailStatusModel,
  TeacherSessionRosterModel,
  TeacherSessionRosterRowModel,
} from "./teacher-operational-types"

export function buildTeacherSessionRosterModel(input: {
  students: AttendanceSessionStudentSummary[]
  draft?: Partial<Record<string, AttendanceRecordStatus>>
  isEditable: boolean
}): TeacherSessionRosterModel {
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
    } satisfies TeacherSessionRosterRowModel
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
    presentSummary: `${presentRows.length} present`,
    absentSummary: `${absentRows.length} absent`,
  }
}

export function buildTeacherSessionDetailOverviewModel(input: {
  session: AttendanceSessionDetail | null
  pendingChangeCount: number
}): TeacherSessionDetailOverviewModel {
  const totalStudents = (input.session?.presentCount ?? 0) + (input.session?.absentCount ?? 0)
  const attendancePercentage = calculateAttendancePercentage({
    presentCount: input.session?.presentCount ?? 0,
    totalCount: totalStudents,
  })
  const correctionTone: TeacherCardTone =
    input.session?.editability.isEditable && input.pendingChangeCount > 0
      ? "warning"
      : input.session?.editability.isEditable
        ? "success"
        : "primary"

  return {
    summaryCards: [
      {
        label: "Present",
        value: String(input.session?.presentCount ?? 0),
        tone: "success",
      },
      {
        label: "Absent",
        value: String(input.session?.absentCount ?? 0),
        tone: (input.session?.absentCount ?? 0) > 0 ? "warning" : "success",
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
        tone: correctionTone,
      },
    ],
    rosterSummary:
      totalStudents > 0
        ? `${input.session?.presentCount ?? 0} of ${totalStudents} present`
        : "",
    timingSummary:
      input.session?.endedAt
        ? `Ended ${formatTeacherDateTime(input.session.endedAt)}`
        : input.session?.startedAt
          ? `Started ${formatTeacherDateTime(input.session.startedAt)}`
          : "",
    correctionSummary: input.session?.editability.isEditable
      ? input.pendingChangeCount > 0
        ? `${input.pendingChangeCount} unsaved correction${input.pendingChangeCount === 1 ? "" : "s"}`
        : ""
      : "",
    presentSectionSubtitle: "",
    absentSectionSubtitle: "",
  }
}

export function buildTeacherSessionDetailStatusModel(input: {
  sessionStatus: AttendanceSessionStatus | null
  editability: AttendanceSessionEditability | null
  pendingChangeCount: number
}): TeacherSessionDetailStatusModel {
  if (input.sessionStatus === "ACTIVE" || input.editability?.state === "PENDING_SESSION_END") {
    return {
      title: "Session is live",
      message: "Students are checking in.",
      stateTone: "warning",
    }
  }

  if (input.editability?.isEditable && input.pendingChangeCount > 0) {
    return {
      title: `${input.pendingChangeCount} unsaved correction${input.pendingChangeCount === 1 ? "" : "s"}`,
      message: "Save when ready.",
      stateTone: "warning",
    }
  }

  if (input.editability?.isEditable) {
    return {
      title: "Corrections open",
      message: "Tap a student to change status.",
      stateTone: "success",
    }
  }

  return {
    title: "Session finalized",
    message: "No further edits allowed.",
    stateTone: "warning",
  }
}
