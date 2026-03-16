import { z } from "zod"

import { teacherReportFiltersSchema } from "./reports"

export const exportJobTypeSchema = z.enum([
  "SESSION_PDF",
  "SESSION_CSV",
  "STUDENT_PERCENT_CSV",
  "COMPREHENSIVE_CSV",
])
export type ExportJobType = z.infer<typeof exportJobTypeSchema>

export const exportJobStatusSchema = z.enum([
  "QUEUED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
])
export type ExportJobStatus = z.infer<typeof exportJobStatusSchema>

export const exportFileStatusSchema = z.enum(["GENERATING", "READY", "EXPIRED", "FAILED"])
export type ExportFileStatus = z.infer<typeof exportFileStatusSchema>

export const createExportJobRequestSchema = z
  .object({
    jobType: exportJobTypeSchema,
    sessionId: z.string().min(1).optional(),
    filters: teacherReportFiltersSchema.optional(),
  })
  .superRefine((value, context) => {
    const requiresSession = value.jobType === "SESSION_PDF" || value.jobType === "SESSION_CSV"

    if (requiresSession && !value.sessionId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sessionId"],
        message: "Session exports require a sessionId.",
      })
    }

    if (!requiresSession && value.sessionId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sessionId"],
        message: "Only session exports may include a sessionId.",
      })
    }
  })
export type CreateExportJobRequest = z.infer<typeof createExportJobRequestSchema>

export const exportJobListQuerySchema = z.object({
  status: exportJobStatusSchema.optional(),
  jobType: exportJobTypeSchema.optional(),
})
export type ExportJobListQuery = z.infer<typeof exportJobListQuerySchema>

export const exportJobParamsSchema = z.object({
  exportJobId: z.string().min(1),
})
export type ExportJobParams = z.infer<typeof exportJobParamsSchema>

export const exportJobFileSchema = z.object({
  id: z.string().min(1),
  objectKey: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  status: exportFileStatusSchema,
  sizeBytes: z.number().int().nonnegative().nullable(),
  checksumSha256: z.string().nullable(),
  createdAt: z.string().datetime(),
  readyAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
  downloadUrl: z.string().url().nullable(),
})
export type ExportJobFile = z.infer<typeof exportJobFileSchema>

export const exportJobSummarySchema = z.object({
  id: z.string().min(1),
  jobType: exportJobTypeSchema,
  status: exportJobStatusSchema,
  requestedAt: z.string().datetime(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  failedAt: z.string().datetime().nullable(),
  errorMessage: z.string().nullable(),
  courseOfferingId: z.string().nullable(),
  courseOfferingCode: z.string().nullable(),
  courseOfferingDisplayTitle: z.string().nullable(),
  sessionId: z.string().nullable(),
  filterSnapshot: z.record(z.string(), z.unknown()).nullable(),
  readyFileCount: z.number().int().nonnegative(),
  totalFileCount: z.number().int().nonnegative(),
  latestReadyDownloadUrl: z.string().url().nullable(),
})
export type ExportJobSummary = z.infer<typeof exportJobSummarySchema>

export const exportJobsResponseSchema = z.array(exportJobSummarySchema)
export type ExportJobsResponse = z.infer<typeof exportJobsResponseSchema>

export const exportJobDetailSchema = exportJobSummarySchema.extend({
  files: z.array(exportJobFileSchema),
})
export type ExportJobDetail = z.infer<typeof exportJobDetailSchema>
