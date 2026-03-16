import type { AttendanceSessionStudentSummary } from "@attendease/contracts"
import { describe, expect, it } from "vitest"

import {
  attendanceCorrectionReviewRefreshIntervalMs,
  buildAttendanceCorrectionSaveMessage,
  buildAttendanceEditChanges,
  createAttendanceEditDraft,
  getAttendanceCorrectionActionLabel,
  getAttendanceCorrectionPendingLabel,
  getAttendanceCorrectionReviewPollInterval,
  hasAttendanceEditChanges,
  updateAttendanceEditDraft,
} from "./attendance-edit"

function createStudent(
  overrides: Partial<AttendanceSessionStudentSummary> = {},
): AttendanceSessionStudentSummary {
  return {
    attendanceRecordId: "record_1",
    enrollmentId: "enrollment_1",
    studentId: "student_1",
    studentDisplayName: "Student One",
    studentEmail: "student1@attendease.dev",
    studentRollNumber: "BT23CSE001",
    status: "ABSENT",
    markedAt: null,
    ...overrides,
  }
}

describe("attendance edit helpers", () => {
  it("creates a draft from final session-student truth", () => {
    const draft = createAttendanceEditDraft([
      createStudent(),
      createStudent({
        attendanceRecordId: "record_2",
        status: "PRESENT",
      }),
    ])

    expect(draft).toEqual({
      record_1: "ABSENT",
      record_2: "PRESENT",
    })
  })

  it("builds only changed attendance edits from the draft", () => {
    const students = [
      createStudent(),
      createStudent({
        attendanceRecordId: "record_2",
        status: "PRESENT",
      }),
    ]
    let draft = createAttendanceEditDraft(students)

    draft = updateAttendanceEditDraft(draft, "record_1", "PRESENT")
    draft = updateAttendanceEditDraft(draft, "record_2", "ABSENT")

    expect(buildAttendanceEditChanges(students, draft)).toEqual([
      {
        attendanceRecordId: "record_1",
        status: "PRESENT",
      },
      {
        attendanceRecordId: "record_2",
        status: "ABSENT",
      },
    ])
    expect(hasAttendanceEditChanges(students, draft)).toBe(true)
  })

  it("does not emit no-op manual edits", () => {
    const students = [createStudent()]
    const draft = createAttendanceEditDraft(students)

    expect(buildAttendanceEditChanges(students, draft)).toEqual([])
    expect(hasAttendanceEditChanges(students, draft)).toBe(false)
  })

  it("keeps correction review polling active only while the live or editable window is open", () => {
    expect(
      getAttendanceCorrectionReviewPollInterval({
        status: "ACTIVE",
        editability: {
          isEditable: false,
        },
      }),
    ).toBe(attendanceCorrectionReviewRefreshIntervalMs)
    expect(
      getAttendanceCorrectionReviewPollInterval({
        status: "ENDED",
        editability: {
          isEditable: true,
        },
      }),
    ).toBe(attendanceCorrectionReviewRefreshIntervalMs)
    expect(
      getAttendanceCorrectionReviewPollInterval({
        status: "ENDED",
        editability: {
          isEditable: false,
        },
      }),
    ).toBe(false)
  })

  it("builds shared correction labels and save messages for mobile and web", () => {
    expect(getAttendanceCorrectionPendingLabel("PRESENT")).toBe("Will save as present")
    expect(getAttendanceCorrectionPendingLabel("ABSENT")).toBe("Will save as absent")
    expect(getAttendanceCorrectionActionLabel("PRESENT")).toBe("Mark present")
    expect(getAttendanceCorrectionActionLabel("ABSENT")).toBe("Mark absent")
    expect(buildAttendanceCorrectionSaveMessage(2)).toBe(
      "Saved 2 attendance edits and refreshed the session totals.",
    )
    expect(buildAttendanceCorrectionSaveMessage(0)).toBe(
      "Attendance was already aligned with the saved draft.",
    )
  })
})
