import { describe, expect, it } from "vitest"

import {
  buildAnalyticsModeUsageResponse,
  buildAnalyticsTrendResponse,
  toAnalyticsStudentTimelineItem,
} from "./analytics.models.js"

describe("analytics models", () => {
  it("builds compact weekly and monthly trend payloads from daily rows", () => {
    const response = buildAnalyticsTrendResponse([
      {
        attendanceDate: new Date("2026-03-10T00:00:00.000Z"),
        sessionCount: 1,
        totalStudents: 4,
        presentCount: 3,
        absentCount: 1,
      },
      {
        attendanceDate: new Date("2026-03-12T00:00:00.000Z"),
        sessionCount: 1,
        totalStudents: 4,
        presentCount: 2,
        absentCount: 2,
      },
    ])

    expect(response.weekly).toEqual([
      expect.objectContaining({
        periodKey: "2026-W11",
        sessionCount: 2,
        totalStudents: 8,
        presentCount: 5,
        absentCount: 3,
        attendancePercentage: 62.5,
      }),
    ])
    expect(response.monthly).toEqual([
      expect.objectContaining({
        periodKey: "2026-03",
        sessionCount: 2,
        totalStudents: 8,
        presentCount: 5,
        absentCount: 3,
        attendancePercentage: 62.5,
      }),
    ])
  })

  it("builds compact mode usage totals and trend rows", () => {
    const response = buildAnalyticsModeUsageResponse([
      {
        usageDate: new Date("2026-03-10T00:00:00.000Z"),
        mode: "QR_GPS",
        sessionCount: 1,
        markedCount: 3,
      },
      {
        usageDate: new Date("2026-03-12T00:00:00.000Z"),
        mode: "BLUETOOTH",
        sessionCount: 1,
        markedCount: 2,
      },
    ])

    expect(response.totals).toEqual([
      {
        mode: "BLUETOOTH",
        sessionCount: 1,
        markedCount: 2,
      },
      {
        mode: "QR_GPS",
        sessionCount: 1,
        markedCount: 3,
      },
    ])
    expect(response.trend[0]?.usageDate).toBe("2026-03-10T00:00:00.000Z")
  })

  it("maps timeline rows into compact drill-down records", () => {
    expect(
      toAnalyticsStudentTimelineItem({
        sessionId: "session_1",
        classroomId: "classroom_1",
        classroomCode: "MATH6A",
        classroomDisplayTitle: "Maths",
        subjectId: "subject_1",
        subjectCode: "MATH101",
        subjectTitle: "Mathematics",
        lectureId: "lecture_1",
        lectureTitle: "Lecture 1",
        lectureDate: new Date("2026-03-10T00:00:00.000Z"),
        mode: "QR_GPS",
        sessionStatus: "ENDED",
        attendanceStatus: "PRESENT",
        markedAt: new Date("2026-03-10T03:35:00.000Z"),
        startedAt: new Date("2026-03-10T03:30:00.000Z"),
        endedAt: new Date("2026-03-10T03:45:00.000Z"),
      }),
    ).toMatchObject({
      sessionId: "session_1",
      classroomCode: "MATH6A",
      attendanceStatus: "PRESENT",
    })
  })
})
