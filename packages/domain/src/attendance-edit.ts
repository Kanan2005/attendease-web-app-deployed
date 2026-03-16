import type {
  AttendanceRecordStatus,
  AttendanceSessionStatus,
  AttendanceSessionStudentSummary,
  UpdateAttendanceSessionStudentChange,
} from "@attendease/contracts"

export type AttendanceEditDraft = Record<string, AttendanceRecordStatus>
export interface AttendanceCorrectionReviewStatusLike {
  status: AttendanceSessionStatus | null | undefined
  editability?: {
    isEditable: boolean
  } | null
}

export const attendanceCorrectionReviewRefreshIntervalMs = 5_000

export function createAttendanceEditDraft(
  students: AttendanceSessionStudentSummary[],
): AttendanceEditDraft {
  return Object.fromEntries(
    students.map((student) => [student.attendanceRecordId, student.status] as const),
  )
}

export function updateAttendanceEditDraft(
  draft: AttendanceEditDraft,
  attendanceRecordId: string,
  status: AttendanceRecordStatus,
): AttendanceEditDraft {
  return {
    ...draft,
    [attendanceRecordId]: status,
  }
}

export function buildAttendanceEditChanges(
  students: AttendanceSessionStudentSummary[],
  draft: AttendanceEditDraft,
): UpdateAttendanceSessionStudentChange[] {
  return students.flatMap((student) => {
    const nextStatus = draft[student.attendanceRecordId]

    if (!nextStatus || nextStatus === student.status) {
      return []
    }

    return [
      {
        attendanceRecordId: student.attendanceRecordId,
        status: nextStatus,
      },
    ]
  })
}

export function hasAttendanceEditChanges(
  students: AttendanceSessionStudentSummary[],
  draft: AttendanceEditDraft,
): boolean {
  return buildAttendanceEditChanges(students, draft).length > 0
}

export function getAttendanceCorrectionReviewPollInterval(
  session: AttendanceCorrectionReviewStatusLike | null,
): number | false {
  if (!session) {
    return false
  }

  if (session.status === "ACTIVE" || session.editability?.isEditable) {
    return attendanceCorrectionReviewRefreshIntervalMs
  }

  return false
}

export function getAttendanceCorrectionPendingLabel(status: AttendanceRecordStatus): string {
  return `Will save as ${status === "PRESENT" ? "present" : "absent"}`
}

export function getAttendanceCorrectionActionLabel(status: AttendanceRecordStatus): string {
  return status === "PRESENT" ? "Mark present" : "Mark absent"
}

export function buildAttendanceCorrectionSaveMessage(appliedChangeCount: number): string {
  if (appliedChangeCount > 0) {
    return `Saved ${appliedChangeCount} attendance edit${appliedChangeCount === 1 ? "" : "s"} and refreshed the session totals.`
  }

  return "Attendance was already aligned with the saved draft."
}
