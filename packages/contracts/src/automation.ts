import { z } from "zod"

const isoDateTimeSchema = z.string().datetime()

export const automationRuleStatusSchema = z.enum(["ACTIVE", "PAUSED", "ARCHIVED"])
export type AutomationRuleStatus = z.infer<typeof automationRuleStatusSchema>

export const emailDispatchTriggerTypeSchema = z.enum(["MANUAL", "AUTOMATED"])
export type EmailDispatchTriggerType = z.infer<typeof emailDispatchTriggerTypeSchema>

export const emailDispatchRunStatusSchema = z.enum([
  "QUEUED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
])
export type EmailDispatchRunStatus = z.infer<typeof emailDispatchRunStatusSchema>

export const emailLogStatusSchema = z.enum(["PENDING", "SENT", "FAILED", "BOUNCED", "DROPPED"])
export type EmailLogStatus = z.infer<typeof emailLogStatusSchema>

const thresholdPercentSchema = z.number().min(0).max(100)

export const emailAutomationRuleSummarySchema = z.object({
  id: z.string().min(1),
  classroomId: z.string().min(1),
  classroomCode: z.string().min(1),
  classroomDisplayTitle: z.string().min(1),
  subjectId: z.string().min(1),
  subjectCode: z.string().min(1),
  subjectTitle: z.string().min(1),
  status: automationRuleStatusSchema,
  thresholdPercent: thresholdPercentSchema,
  scheduleHourLocal: z.number().int().min(0).max(23),
  scheduleMinuteLocal: z.number().int().min(0).max(59),
  timezone: z.string().min(1),
  templateSubject: z.string().min(1),
  templateBody: z.string().min(1),
  lastEvaluatedAt: isoDateTimeSchema.nullable(),
  lastSuccessfulRunAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})
export type EmailAutomationRuleSummary = z.infer<typeof emailAutomationRuleSummarySchema>

export const emailAutomationRuleListQuerySchema = z.object({
  classroomId: z.string().min(1).optional(),
  status: automationRuleStatusSchema.optional(),
})
export type EmailAutomationRuleListQuery = z.infer<typeof emailAutomationRuleListQuerySchema>

export const createEmailAutomationRuleRequestSchema = z.object({
  classroomId: z.string().min(1),
  thresholdPercent: thresholdPercentSchema.default(75),
  scheduleHourLocal: z.number().int().min(0).max(23),
  scheduleMinuteLocal: z.number().int().min(0).max(59).default(0),
  timezone: z.string().min(1),
  templateSubject: z.string().min(1),
  templateBody: z.string().min(1),
  status: automationRuleStatusSchema.default("ACTIVE"),
})
export type CreateEmailAutomationRuleRequest = z.infer<
  typeof createEmailAutomationRuleRequestSchema
>

export const emailAutomationRuleParamsSchema = z.object({
  ruleId: z.string().min(1),
})
export type EmailAutomationRuleParams = z.infer<typeof emailAutomationRuleParamsSchema>

export const updateEmailAutomationRuleRequestSchema = z
  .object({
    thresholdPercent: thresholdPercentSchema.optional(),
    scheduleHourLocal: z.number().int().min(0).max(23).optional(),
    scheduleMinuteLocal: z.number().int().min(0).max(59).optional(),
    timezone: z.string().min(1).optional(),
    templateSubject: z.string().min(1).optional(),
    templateBody: z.string().min(1).optional(),
    status: automationRuleStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one rule field must be updated.",
  })
export type UpdateEmailAutomationRuleRequest = z.infer<
  typeof updateEmailAutomationRuleRequestSchema
>

export const emailAutomationRuleResponseSchema = emailAutomationRuleSummarySchema
export type EmailAutomationRuleResponse = z.infer<typeof emailAutomationRuleResponseSchema>

export const emailAutomationRulesResponseSchema = z.array(emailAutomationRuleSummarySchema)
export type EmailAutomationRulesResponse = z.infer<typeof emailAutomationRulesResponseSchema>

export const lowAttendanceEmailRecipientSummarySchema = z.object({
  studentId: z.string().min(1),
  studentEmail: z.string().email(),
  studentDisplayName: z.string().min(1),
  studentRollNumber: z.string().nullable(),
  attendancePercentage: thresholdPercentSchema,
})
export type LowAttendanceEmailRecipientSummary = z.infer<
  typeof lowAttendanceEmailRecipientSummarySchema
>

export const lowAttendanceEmailPreviewRequestSchema = z
  .object({
    ruleId: z.string().min(1),
    from: isoDateTimeSchema.optional(),
    to: isoDateTimeSchema.optional(),
    thresholdPercent: thresholdPercentSchema.optional(),
    templateSubject: z.string().min(1).optional(),
    templateBody: z.string().min(1).optional(),
  })
  .refine(
    (value) =>
      value.from === undefined ||
      value.to === undefined ||
      new Date(value.from) <= new Date(value.to),
    {
      message: "The preview start date must be before or equal to the end date.",
      path: ["to"],
    },
  )
export type LowAttendanceEmailPreviewRequest = z.infer<
  typeof lowAttendanceEmailPreviewRequestSchema
>

export const lowAttendanceEmailPreviewResponseSchema = z.object({
  rule: emailAutomationRuleSummarySchema,
  thresholdPercent: thresholdPercentSchema,
  recipientCount: z.number().int().nonnegative(),
  sampleRecipients: z.array(lowAttendanceEmailRecipientSummarySchema),
  previewSubject: z.string().min(1),
  previewText: z.string().min(1),
  previewHtml: z.string().min(1),
  dateRange: z
    .object({
      from: isoDateTimeSchema.nullable(),
      to: isoDateTimeSchema.nullable(),
    })
    .nullable(),
})
export type LowAttendanceEmailPreviewResponse = z.infer<
  typeof lowAttendanceEmailPreviewResponseSchema
>

export const manualLowAttendanceEmailSendRequestSchema = lowAttendanceEmailPreviewRequestSchema
export type ManualLowAttendanceEmailSendRequest = z.infer<
  typeof manualLowAttendanceEmailSendRequestSchema
>

export const emailDispatchRunSummarySchema = z.object({
  id: z.string().min(1),
  ruleId: z.string().min(1),
  classroomId: z.string().min(1),
  classroomCode: z.string().min(1),
  classroomDisplayTitle: z.string().min(1),
  triggerType: emailDispatchTriggerTypeSchema,
  dispatchDate: isoDateTimeSchema,
  status: emailDispatchRunStatusSchema,
  targetedStudentCount: z.number().int().nonnegative(),
  sentCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  startedAt: isoDateTimeSchema.nullable(),
  completedAt: isoDateTimeSchema.nullable(),
  failedAt: isoDateTimeSchema.nullable(),
  errorMessage: z.string().nullable(),
  createdAt: isoDateTimeSchema,
})
export type EmailDispatchRunSummary = z.infer<typeof emailDispatchRunSummarySchema>

export const manualLowAttendanceEmailSendResponseSchema = z.object({
  dispatchRun: emailDispatchRunSummarySchema,
})
export type ManualLowAttendanceEmailSendResponse = z.infer<
  typeof manualLowAttendanceEmailSendResponseSchema
>

export const emailDispatchRunListQuerySchema = z.object({
  classroomId: z.string().min(1).optional(),
  ruleId: z.string().min(1).optional(),
  status: emailDispatchRunStatusSchema.optional(),
  triggerType: emailDispatchTriggerTypeSchema.optional(),
})
export type EmailDispatchRunListQuery = z.infer<typeof emailDispatchRunListQuerySchema>

export const emailDispatchRunsResponseSchema = z.array(emailDispatchRunSummarySchema)
export type EmailDispatchRunsResponse = z.infer<typeof emailDispatchRunsResponseSchema>

export const emailLogSummarySchema = z.object({
  id: z.string().min(1),
  dispatchRunId: z.string().nullable(),
  ruleId: z.string().nullable(),
  classroomId: z.string().nullable(),
  classroomCode: z.string().nullable(),
  classroomDisplayTitle: z.string().nullable(),
  recipientEmail: z.string().email(),
  studentId: z.string().nullable(),
  studentDisplayName: z.string().nullable(),
  status: emailLogStatusSchema,
  subject: z.string().min(1),
  failureReason: z.string().nullable(),
  providerMessageId: z.string().nullable(),
  triggerType: emailDispatchTriggerTypeSchema.nullable(),
  sentAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
})
export type EmailLogSummary = z.infer<typeof emailLogSummarySchema>

export const emailLogListQuerySchema = z.object({
  classroomId: z.string().min(1).optional(),
  ruleId: z.string().min(1).optional(),
  dispatchRunId: z.string().min(1).optional(),
  status: emailLogStatusSchema.optional(),
})
export type EmailLogListQuery = z.infer<typeof emailLogListQuerySchema>

export const emailLogsResponseSchema = z.array(emailLogSummarySchema)
export type EmailLogsResponse = z.infer<typeof emailLogsResponseSchema>
