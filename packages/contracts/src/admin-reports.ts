import { z } from "zod"

// ---------------------------------------------------------------------------
// Shared response shape for any admin report generation. The handler builds
// the XLSX synchronously, uploads it to storage, and returns the signed URL
// so the admin can download immediately.
// ---------------------------------------------------------------------------

export const adminReportJobSummarySchema = z.object({
  jobId: z.string(),
  jobType: z.enum([
    "ADMIN_STUDENT_REPORT_XLSX",
    "ADMIN_TEACHER_REPORT_XLSX",
    "ADMIN_COURSE_REPORT_XLSX",
  ]),
  status: z.enum(["COMPLETED", "FAILED"]),
  fileName: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  rowCount: z.number().int().nonnegative(),
  generatedAt: z.string().datetime(),
  /**
   * Pre-signed download URL. Treated as short-lived (~1 hour) to match the
   * existing teacher export storage configuration.
   */
  downloadUrl: z.string().url().nullable(),
  filtersSummary: z.string(),
  errorMessage: z.string().nullable(),
})
export type AdminReportJobSummary = z.infer<typeof adminReportJobSummarySchema>

export const adminReportRecentListResponseSchema = z.object({
  jobs: z.array(adminReportJobSummarySchema),
})
export type AdminReportRecentListResponse = z.infer<typeof adminReportRecentListResponseSchema>

// ---------------------------------------------------------------------------
// Shared date helpers
// ---------------------------------------------------------------------------
const optionalIsoDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().date())
  .optional()

// ---------------------------------------------------------------------------
// Student report — one sheet per subject, rows = students.
// At least one filter must be provided.
// ---------------------------------------------------------------------------

export const adminStudentReportRequestSchema = z
  .object({
    studentId: z.string().trim().min(1).optional(),
    branch: z.string().trim().min(1).optional(),
    currentSemester: z.coerce.number().int().min(1).max(12).optional(),
    courseOfferingId: z.string().trim().min(1).optional(),
    semesterId: z.string().trim().min(1).optional(),
    fromDate: optionalIsoDate,
    toDate: optionalIsoDate,
  })
  .refine(
    (value) =>
      Boolean(
        value.studentId ||
          value.branch ||
          value.currentSemester !== undefined ||
          value.courseOfferingId ||
          value.semesterId ||
          value.fromDate ||
          value.toDate,
      ),
    {
      message:
        "Provide at least one filter (studentId, branch, currentSemester, courseOfferingId, semesterId, or a date range).",
    },
  )
export type AdminStudentReportRequest = z.infer<typeof adminStudentReportRequestSchema>

// ---------------------------------------------------------------------------
// Teacher report — single sheet, rows = course offering owned by the teacher
// (or the whole department if no teacherId given).
// ---------------------------------------------------------------------------

export const adminTeacherReportRequestSchema = z
  .object({
    teacherId: z.string().trim().min(1).optional(),
    department: z.string().trim().min(1).optional(),
    semesterId: z.string().trim().min(1).optional(),
    includeArchived: z.boolean().default(false),
    fromDate: optionalIsoDate,
    toDate: optionalIsoDate,
  })
  .refine(
    (value) => Boolean(value.teacherId || value.department || value.semesterId || value.fromDate || value.toDate),
    {
      message: "Provide at least one filter (teacherId, department, semesterId, or a date range).",
    },
  )
export type AdminTeacherReportRequest = z.infer<typeof adminTeacherReportRequestSchema>

// ---------------------------------------------------------------------------
// Course report — single sheet, rows = student in the chosen course offering.
// ---------------------------------------------------------------------------

export const adminCourseReportRequestSchema = z.object({
  courseOfferingId: z.string().trim().min(1),
  fromDate: optionalIsoDate,
  toDate: optionalIsoDate,
})
export type AdminCourseReportRequest = z.infer<typeof adminCourseReportRequestSchema>
