import { describe, expect, it } from "vitest"

import {
  buildLowAttendancePreviewRequest,
  buildTeacherAnalyticsFilters,
  buildTeacherEmailAutomationRuleRequest,
  createTeacherAnalyticsFilterDraft,
  createTeacherEmailAutomationRuleDraft,
  createTeacherLowAttendanceEmailDraft,
} from "./teacher-analytics-automation.js"

describe("teacher analytics and email helpers", () => {
  it("builds compact analytics filters from the web draft state", () => {
    expect(
      buildTeacherAnalyticsFilters({
        classroomId: "classroom_1",
        fromDate: "2026-03-01",
        toDate: "2026-03-31",
      }),
    ).toEqual({
      classroomId: "classroom_1",
      from: "2026-03-01T00:00:00.000Z",
      to: "2026-03-31T23:59:59.999Z",
    })
  })

  it("builds automation rule requests with numeric schedule and threshold values", () => {
    const draft = createTeacherEmailAutomationRuleDraft("classroom_1")

    expect(buildTeacherEmailAutomationRuleRequest(draft)).toEqual({
      classroomId: "classroom_1",
      thresholdPercent: 75,
      scheduleHourLocal: 18,
      scheduleMinuteLocal: 0,
      timezone: "Asia/Kolkata",
      templateSubject: "Attendance below {{thresholdPercent}} for {{classroomTitle}}",
      templateBody: expect.stringContaining("Hello {{studentName}}"),
      status: "ACTIVE",
    })
  })

  it("builds preview requests without forcing optional override fields", () => {
    const baseDraft = createTeacherLowAttendanceEmailDraft("rule_1")
    const fullDraft = {
      ...baseDraft,
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
      thresholdPercent: "72.5",
      templateSubject: "Custom subject",
      templateBody: "Custom body",
    }

    expect(createTeacherAnalyticsFilterDraft()).toEqual({
      classroomId: "",
      fromDate: "",
      toDate: "",
    })
    expect(buildLowAttendancePreviewRequest(baseDraft)).toEqual({
      ruleId: "rule_1",
    })
    expect(buildLowAttendancePreviewRequest(fullDraft)).toEqual({
      ruleId: "rule_1",
      from: "2026-03-01T00:00:00.000Z",
      to: "2026-03-31T23:59:59.999Z",
      thresholdPercent: 72.5,
      templateSubject: "Custom subject",
      templateBody: "Custom body",
    })
  })
})
