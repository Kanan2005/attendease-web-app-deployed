import type {
  AnalyticsFilters,
  CreateEmailAutomationRuleRequest,
  LowAttendanceEmailPreviewRequest,
} from "@attendease/contracts"

export type TeacherAnalyticsFilterDraft = {
  classroomId: string
  fromDate: string
  toDate: string
}

export type TeacherEmailAutomationRuleDraft = {
  classroomId: string
  thresholdPercent: string
  scheduleHourLocal: string
  scheduleMinuteLocal: string
  timezone: string
  templateSubject: string
  templateBody: string
  status: CreateEmailAutomationRuleRequest["status"]
}

export type TeacherLowAttendanceEmailDraft = {
  ruleId: string
  fromDate: string
  toDate: string
  thresholdPercent: string
  templateSubject: string
  templateBody: string
}

function toIsoStartOfDay(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString()
}

function toIsoEndOfDay(value: string): string {
  return new Date(`${value}T23:59:59.999Z`).toISOString()
}

export function createTeacherAnalyticsFilterDraft(): TeacherAnalyticsFilterDraft {
  return {
    classroomId: "",
    fromDate: "",
    toDate: "",
  }
}

export function buildTeacherAnalyticsFilters(draft: TeacherAnalyticsFilterDraft): AnalyticsFilters {
  return {
    ...(draft.classroomId.trim() ? { classroomId: draft.classroomId.trim() } : {}),
    ...(draft.fromDate ? { from: toIsoStartOfDay(draft.fromDate) } : {}),
    ...(draft.toDate ? { to: toIsoEndOfDay(draft.toDate) } : {}),
  }
}

export function createTeacherEmailAutomationRuleDraft(
  classroomId = "",
): TeacherEmailAutomationRuleDraft {
  return {
    classroomId,
    thresholdPercent: "75",
    scheduleHourLocal: "18",
    scheduleMinuteLocal: "0",
    timezone: "Asia/Kolkata",
    templateSubject: "Attendance below {{thresholdPercent}} for {{classroomTitle}}",
    templateBody: [
      "Hello {{studentName}},",
      "",
      "Your attendance for {{subjectTitle}} in {{classroomTitle}} is currently {{attendancePercentage}}.",
      "Please improve it above {{thresholdPercent}} and contact your teacher if you need support.",
    ].join("\n"),
    status: "ACTIVE",
  }
}

export function buildTeacherEmailAutomationRuleRequest(
  draft: TeacherEmailAutomationRuleDraft,
): CreateEmailAutomationRuleRequest {
  return {
    classroomId: draft.classroomId.trim(),
    thresholdPercent: Number(draft.thresholdPercent),
    scheduleHourLocal: Number(draft.scheduleHourLocal),
    scheduleMinuteLocal: Number(draft.scheduleMinuteLocal),
    timezone: draft.timezone.trim(),
    templateSubject: draft.templateSubject.trim(),
    templateBody: draft.templateBody.trim(),
    status: draft.status,
  }
}

export function createTeacherLowAttendanceEmailDraft(ruleId = ""): TeacherLowAttendanceEmailDraft {
  return {
    ruleId,
    fromDate: "",
    toDate: "",
    thresholdPercent: "",
    templateSubject: "",
    templateBody: "",
  }
}

export function buildLowAttendancePreviewRequest(
  draft: TeacherLowAttendanceEmailDraft,
): LowAttendanceEmailPreviewRequest {
  return {
    ruleId: draft.ruleId.trim(),
    ...(draft.fromDate ? { from: toIsoStartOfDay(draft.fromDate) } : {}),
    ...(draft.toDate ? { to: toIsoEndOfDay(draft.toDate) } : {}),
    ...(draft.thresholdPercent.trim() ? { thresholdPercent: Number(draft.thresholdPercent) } : {}),
    ...(draft.templateSubject.trim() ? { templateSubject: draft.templateSubject.trim() } : {}),
    ...(draft.templateBody.trim() ? { templateBody: draft.templateBody.trim() } : {}),
  }
}
