import { describe, expect, it } from "vitest"

import {
  getLocalClockParts,
  isRuleDueAt,
  selectLowAttendanceRecipients,
  toDispatchDateForRule,
  toManualDispatchDateRange,
} from "./email-automation.js"

describe("email automation domain helpers", () => {
  it("derives local clock parts and due-state in the configured timezone", () => {
    const now = new Date("2026-03-15T12:30:00.000Z")

    expect(getLocalClockParts(now, "Asia/Kolkata")).toEqual({
      localDate: "2026-03-15",
      hour: 18,
      minute: 0,
    })
    expect(
      isRuleDueAt({
        now,
        timezone: "Asia/Kolkata",
        scheduleHourLocal: 18,
        scheduleMinuteLocal: 0,
      }),
    ).toBe(true)
    expect(
      isRuleDueAt({
        now,
        timezone: "Asia/Kolkata",
        scheduleHourLocal: 18,
        scheduleMinuteLocal: 5,
      }),
    ).toBe(false)
  })

  it("pins the dispatch date to the teacher local day", () => {
    expect(toDispatchDateForRule(new Date("2026-03-15T23:45:00.000Z"), "Asia/Kolkata")).toEqual(
      new Date("2026-03-16T00:00:00.000Z"),
    )
  })

  it("selects and sorts only low-attendance recipients", () => {
    const recipients = selectLowAttendanceRecipients(
      [
        {
          studentId: "student_2",
          studentEmail: "student.two@attendease.dev",
          studentDisplayName: "Student Two",
          studentRollNumber: "23CS002",
          attendancePercentage: 74.5,
        },
        {
          studentId: "student_1",
          studentEmail: "student.one@attendease.dev",
          studentDisplayName: "Student One",
          studentRollNumber: "23CS001",
          attendancePercentage: 74.5,
        },
        {
          studentId: "student_3",
          studentEmail: "student.three@attendease.dev",
          studentDisplayName: "Student Three",
          studentRollNumber: null,
          attendancePercentage: 80,
        },
        {
          studentId: "student_4",
          studentEmail: "student.four@attendease.dev",
          studentDisplayName: "Student Four",
          studentRollNumber: "23CS004",
          attendancePercentage: 75,
        },
      ],
      75,
    )

    expect(recipients).toEqual([
      expect.objectContaining({
        studentId: "student_1",
        attendancePercentage: 74.5,
      }),
      expect.objectContaining({
        studentId: "student_2",
        attendancePercentage: 74.5,
      }),
    ])
  })

  it("keeps manual dispatch date ranges nullable and API-friendly", () => {
    expect(toManualDispatchDateRange({})).toEqual({
      from: null,
      to: null,
    })
    expect(
      toManualDispatchDateRange({
        from: "2026-03-01T00:00:00.000Z",
        to: "2026-03-31T23:59:59.999Z",
      }),
    ).toEqual({
      from: "2026-03-01T00:00:00.000Z",
      to: "2026-03-31T23:59:59.999Z",
    })
  })
})
