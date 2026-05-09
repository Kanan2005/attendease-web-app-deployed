import { z } from "zod"

// ---------------------------------------------------------------------------
// Audience preview
// ---------------------------------------------------------------------------

export const adminCommunicationAudienceTypeSchema = z.enum(["STUDENT", "PARENT"])
export type AdminCommunicationAudienceType = z.infer<typeof adminCommunicationAudienceTypeSchema>

export const adminCommunicationAttendanceComparatorSchema = z.enum(["BELOW", "ABOVE"])
export type AdminCommunicationAttendanceComparator = z.infer<
  typeof adminCommunicationAttendanceComparatorSchema
>

export const adminCommunicationAudiencePreviewRequestSchema = z
  .object({
    audience: adminCommunicationAudienceTypeSchema,
    degree: z.string().trim().min(1).optional(),
    branch: z.string().trim().min(1).optional(),
    currentSemester: z.coerce.number().int().min(1).max(12).optional(),
    courseOfferingId: z.string().trim().min(1).optional(),
    attendanceThresholdPercent: z.coerce.number().min(0).max(100).optional(),
    attendanceComparator: adminCommunicationAttendanceComparatorSchema.optional(),
    sampleLimit: z.coerce.number().int().min(1).max(50).default(5),
  })
  .refine(
    (value) =>
      Boolean(
        value.degree ||
          value.branch ||
          value.currentSemester !== undefined ||
          value.courseOfferingId ||
          value.attendanceThresholdPercent !== undefined,
      ),
    {
      message:
        "Provide at least one filter (degree, branch, currentSemester, courseOfferingId, or attendanceThresholdPercent) to avoid emailing the entire institution by accident.",
    },
  )
  .refine(
    (value) =>
      value.attendanceThresholdPercent === undefined
        ? true
        : value.attendanceComparator !== undefined,
    {
      message:
        "attendanceComparator (BELOW or ABOVE) is required when attendanceThresholdPercent is provided.",
    },
  )

export type AdminCommunicationAudiencePreviewRequest = z.infer<
  typeof adminCommunicationAudiencePreviewRequestSchema
>

export const adminCommunicationAudienceSampleEntrySchema = z.object({
  studentId: z.string(),
  displayName: z.string(),
  rollNumber: z.string().nullable(),
  branch: z.string().nullable(),
  currentSemester: z.number().int().nullable(),
  attendancePercent: z.number().nullable(),
  email: z.string().email().nullable().catch(null),
})
export type AdminCommunicationAudienceSampleEntry = z.infer<
  typeof adminCommunicationAudienceSampleEntrySchema
>

export const adminCommunicationAudiencePreviewResponseSchema = z.object({
  audience: adminCommunicationAudienceTypeSchema,
  studentCount: z.number().int().nonnegative(),
  emailCount: z.number().int().nonnegative(),
  missingEmailCount: z.number().int().nonnegative(),
  emails: z.array(z.string().email()),
  sample: z.array(adminCommunicationAudienceSampleEntrySchema),
})
export type AdminCommunicationAudiencePreviewResponse = z.infer<
  typeof adminCommunicationAudiencePreviewResponseSchema
>

// ---------------------------------------------------------------------------
// Dispatch logging — admin clicked "Open in Gmail" / "Open in mail app".
// We never actually send mail server-side; this is just an audit row.
// ---------------------------------------------------------------------------

export const adminCommunicationDispatchChannelSchema = z.enum(["GMAIL", "MAILTO"])
export type AdminCommunicationDispatchChannel = z.infer<
  typeof adminCommunicationDispatchChannelSchema
>

export const adminCommunicationLogDispatchRequestSchema = z.object({
  audience: adminCommunicationAudienceTypeSchema,
  channel: adminCommunicationDispatchChannelSchema,
  recipientCount: z.number().int().min(1),
  subjectPreview: z.string().trim().min(1).max(240),
  filtersSummary: z.string().trim().min(1).max(500),
})
export type AdminCommunicationLogDispatchRequest = z.infer<
  typeof adminCommunicationLogDispatchRequestSchema
>

export const adminCommunicationLogDispatchResponseSchema = z.object({
  loggedAt: z.string().datetime(),
})
export type AdminCommunicationLogDispatchResponse = z.infer<
  typeof adminCommunicationLogDispatchResponseSchema
>
