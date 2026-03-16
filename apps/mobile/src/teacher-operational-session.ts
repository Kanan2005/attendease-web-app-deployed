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
    presentSummary:
      presentRows.length === 0
        ? "No students are currently marked present."
        : `${presentRows.length} student${presentRows.length === 1 ? "" : "s"} currently marked present.`,
    absentSummary:
      absentRows.length === 0
        ? "Everyone in this session is currently marked present."
        : `${absentRows.length} student${absentRows.length === 1 ? "" : "s"} currently marked absent.`,
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
        ? `${input.session?.presentCount ?? 0} of ${totalStudents} students are currently marked present.`
        : "No student roster has been loaded for this attendance session yet.",
    timingSummary:
      input.session?.endedAt && input.session?.editableUntil
        ? `Ended ${formatTeacherDateTime(input.session.endedAt)} · editable until ${formatTeacherDateTime(input.session.editableUntil)}.`
        : input.session?.endedAt
          ? `Ended ${formatTeacherDateTime(input.session.endedAt)}.`
          : input.session?.startedAt
            ? `Live since ${formatTeacherDateTime(input.session.startedAt)}.`
            : "Timing details will appear here once the session starts.",
    correctionSummary: input.session?.editability.isEditable
      ? input.pendingChangeCount > 0
        ? `${input.pendingChangeCount} correction${input.pendingChangeCount === 1 ? "" : "s"} will refresh the saved attendance totals everywhere once you save.`
        : "Use the lists below to move a student between present and absent, then save once."
      : input.session?.status === "ACTIVE"
        ? "Bluetooth attendance is still live. Present and absent lists keep updating until the session ends."
        : "The manual correction window is closed. The lists below are now the final saved result.",
    presentSectionSubtitle:
      input.session?.status === "ACTIVE"
        ? "Students already marked during the live attendance session appear here first."
        : "Students counted present in the saved result stay here unless you move them back to absent.",
    absentSectionSubtitle:
      input.session?.status === "ACTIVE"
        ? "Students who have not checked in yet remain here until the live session ends."
        : "Students still counted absent stay here unless you move them into the present list.",
  }
}

export function buildTeacherSessionDetailStatusModel(input: {
  sessionStatus: AttendanceSessionStatus | null
  editability: AttendanceSessionEditability | null
  pendingChangeCount: number
}): TeacherSessionDetailStatusModel {
  if (input.sessionStatus === "ACTIVE" || input.editability?.state === "PENDING_SESSION_END") {
    return {
      title: "Attendance is still live",
      message:
        "Present and absent lists update below while students check in. End the session before making manual corrections.",
      stateTone: "warning",
    }
  }

  if (input.editability?.isEditable && input.pendingChangeCount > 0) {
    return {
      title: `${input.pendingChangeCount} correction${input.pendingChangeCount === 1 ? "" : "s"} ready to save`,
      message:
        "Review the updated present and absent lists, then save once to refresh final counts everywhere.",
      stateTone: "warning",
    }
  }

  if (input.editability?.isEditable) {
    return {
      title: "Corrections are open",
      message:
        "Mark students present or absent from these lists, then save once when the attendance truth looks right.",
      stateTone: "success",
    }
  }

  return {
    title: "Session is read-only",
    message:
      "The manual correction window is closed. The present and absent lists below are the final saved result.",
    stateTone: "warning",
  }
}
