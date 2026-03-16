import { z } from "zod"

import { attendanceModeSchema } from "./academic"
import {
  attendanceRecordStatusSchema,
  attendanceSessionDetailSchema,
  attendanceSessionStatusSchema,
  attendanceSessionStudentsResponseSchema,
} from "./attendance"
import { teacherReportFiltersSchema } from "./reports"

const isoDateTimeSchema = z.string().datetime()

export const analyticsFiltersSchema = teacherReportFiltersSchema
export type AnalyticsFilters = z.infer<typeof analyticsFiltersSchema>

export const analyticsTrendPointSchema = z.object({
  periodKey: z.string().min(1),
  label: z.string().min(1),
  startDate: isoDateTimeSchema,
  endDate: isoDateTimeSchema,
  sessionCount: z.number().int().nonnegative(),
  totalStudents: z.number().int().nonnegative(),
  presentCount: z.number().int().nonnegative(),
  absentCount: z.number().int().nonnegative(),
  attendancePercentage: z.number().min(0).max(100),
})
export type AnalyticsTrendPoint = z.infer<typeof analyticsTrendPointSchema>

export const analyticsTrendResponseSchema = z.object({
  weekly: z.array(analyticsTrendPointSchema),
  monthly: z.array(analyticsTrendPointSchema),
})
export type AnalyticsTrendResponse = z.infer<typeof analyticsTrendResponseSchema>

export const analyticsDistributionBucketValues = [
  "ABOVE_90",
  "BETWEEN_75_AND_90",
  "BELOW_75",
] as const
export const analyticsDistributionBucketSchema = z.enum(analyticsDistributionBucketValues)
export type AnalyticsDistributionBucket = z.infer<typeof analyticsDistributionBucketSchema>

export const analyticsDistributionBucketSummarySchema = z.object({
  bucket: analyticsDistributionBucketSchema,
  label: z.string().min(1),
  studentCount: z.number().int().nonnegative(),
})
export type AnalyticsDistributionBucketSummary = z.infer<
  typeof analyticsDistributionBucketSummarySchema
>

export const analyticsDistributionResponseSchema = z.object({
  totalStudents: z.number().int().nonnegative(),
  buckets: z.array(analyticsDistributionBucketSummarySchema),
})
export type AnalyticsDistributionResponse = z.infer<typeof analyticsDistributionResponseSchema>

export const analyticsClassComparisonRowSchema = z.object({
  classroomId: z.string().min(1),
  classroomCode: z.string().min(1),
  classroomDisplayTitle: z.string().min(1),
  totalSessions: z.number().int().nonnegative(),
  presentCount: z.number().int().nonnegative(),
  absentCount: z.number().int().nonnegative(),
  attendancePercentage: z.number().min(0).max(100),
})
export type AnalyticsClassComparisonRow = z.infer<typeof analyticsClassComparisonRowSchema>

export const analyticsSubjectComparisonRowSchema = z.object({
  subjectId: z.string().min(1),
  subjectCode: z.string().min(1),
  subjectTitle: z.string().min(1),
  totalSessions: z.number().int().nonnegative(),
  presentCount: z.number().int().nonnegative(),
  absentCount: z.number().int().nonnegative(),
  attendancePercentage: z.number().min(0).max(100),
})
export type AnalyticsSubjectComparisonRow = z.infer<typeof analyticsSubjectComparisonRowSchema>

export const analyticsComparisonsResponseSchema = z.object({
  classrooms: z.array(analyticsClassComparisonRowSchema),
  subjects: z.array(analyticsSubjectComparisonRowSchema),
})
export type AnalyticsComparisonsResponse = z.infer<typeof analyticsComparisonsResponseSchema>

export const analyticsModeUsageTotalSchema = z.object({
  mode: attendanceModeSchema,
  sessionCount: z.number().int().nonnegative(),
  markedCount: z.number().int().nonnegative(),
})
export type AnalyticsModeUsageTotal = z.infer<typeof analyticsModeUsageTotalSchema>

export const analyticsModeUsagePointSchema = z.object({
  usageDate: isoDateTimeSchema,
  mode: attendanceModeSchema,
  sessionCount: z.number().int().nonnegative(),
  markedCount: z.number().int().nonnegative(),
})
export type AnalyticsModeUsagePoint = z.infer<typeof analyticsModeUsagePointSchema>

export const analyticsModeUsageResponseSchema = z.object({
  totals: z.array(analyticsModeUsageTotalSchema),
  trend: z.array(analyticsModeUsagePointSchema),
})
export type AnalyticsModeUsageResponse = z.infer<typeof analyticsModeUsageResponseSchema>

export const analyticsStudentTimelineParamsSchema = z.object({
  studentId: z.string().min(1),
})
export type AnalyticsStudentTimelineParams = z.infer<typeof analyticsStudentTimelineParamsSchema>

export const analyticsStudentTimelineItemSchema = z.object({
  sessionId: z.string().min(1),
  classroomId: z.string().min(1),
  classroomCode: z.string().min(1),
  classroomDisplayTitle: z.string().min(1),
  subjectId: z.string().min(1),
  subjectCode: z.string().min(1),
  subjectTitle: z.string().min(1),
  lectureId: z.string().nullable(),
  lectureTitle: z.string().nullable(),
  lectureDate: isoDateTimeSchema.nullable(),
  mode: attendanceModeSchema,
  sessionStatus: attendanceSessionStatusSchema,
  attendanceStatus: attendanceRecordStatusSchema,
  markedAt: isoDateTimeSchema.nullable(),
  startedAt: isoDateTimeSchema.nullable(),
  endedAt: isoDateTimeSchema.nullable(),
})
export type AnalyticsStudentTimelineItem = z.infer<typeof analyticsStudentTimelineItemSchema>

export const analyticsStudentTimelineResponseSchema = z.array(analyticsStudentTimelineItemSchema)
export type AnalyticsStudentTimelineResponse = z.infer<
  typeof analyticsStudentTimelineResponseSchema
>

export const analyticsSessionDrilldownResponseSchema = z.object({
  session: attendanceSessionDetailSchema,
  students: attendanceSessionStudentsResponseSchema,
})
export type AnalyticsSessionDrilldownResponse = z.infer<
  typeof analyticsSessionDrilldownResponseSchema
>
