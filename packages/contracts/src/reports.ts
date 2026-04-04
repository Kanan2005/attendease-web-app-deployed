import { z } from "zod"

const isoDateTimeSchema = z.string().datetime()

export const teacherReportFiltersSchema = z
  .object({
    classroomId: z.string().min(1).optional(),
    classId: z.string().min(1).optional(),
    sectionId: z.string().min(1).optional(),
    subjectId: z.string().min(1).optional(),
    from: isoDateTimeSchema.optional(),
    to: isoDateTimeSchema.optional(),
  })
  .refine(
    (value) =>
      value.from === undefined ||
      value.to === undefined ||
      new Date(value.from) <= new Date(value.to),
    {
      message: "The report start date must be before or equal to the end date.",
      path: ["to"],
    },
  )
export type TeacherReportFilters = z.infer<typeof teacherReportFiltersSchema>

const attendancePercentageSchema = z.number().min(0).max(100)

export const teacherDaywiseAttendanceReportRowSchema = z.object({
  attendanceDate: isoDateTimeSchema,
  classroomId: z.string().min(1),
  classroomCode: z.string().min(1),
  classroomDisplayTitle: z.string().min(1),
  classId: z.string().min(1),
  classCode: z.string().min(1),
  classTitle: z.string().min(1),
  sectionId: z.string().min(1),
  sectionCode: z.string().min(1),
  sectionTitle: z.string().min(1),
  subjectId: z.string().min(1),
  subjectCode: z.string().min(1),
  subjectTitle: z.string().min(1),
  sessionCount: z.number().int().nonnegative(),
  totalStudents: z.number().int().nonnegative(),
  presentCount: z.number().int().nonnegative(),
  absentCount: z.number().int().nonnegative(),
  attendancePercentage: attendancePercentageSchema,
  lastSessionAt: isoDateTimeSchema.nullable(),
})
export type TeacherDaywiseAttendanceReportRow = z.infer<
  typeof teacherDaywiseAttendanceReportRowSchema
>

export const teacherDaywiseAttendanceReportResponseSchema = z.array(
  teacherDaywiseAttendanceReportRowSchema,
)
export type TeacherDaywiseAttendanceReportResponse = z.infer<
  typeof teacherDaywiseAttendanceReportResponseSchema
>

export const teacherSubjectwiseAttendanceReportRowSchema = z.object({
  classroomId: z.string().min(1),
  classroomCode: z.string().min(1),
  classroomDisplayTitle: z.string().min(1),
  classId: z.string().min(1),
  classCode: z.string().min(1),
  classTitle: z.string().min(1),
  sectionId: z.string().min(1),
  sectionCode: z.string().min(1),
  sectionTitle: z.string().min(1),
  subjectId: z.string().min(1),
  subjectCode: z.string().min(1),
  subjectTitle: z.string().min(1),
  totalSessions: z.number().int().nonnegative(),
  totalStudents: z.number().int().nonnegative(),
  presentCount: z.number().int().nonnegative(),
  absentCount: z.number().int().nonnegative(),
  attendancePercentage: attendancePercentageSchema,
  lastSessionAt: isoDateTimeSchema.nullable(),
})
export type TeacherSubjectwiseAttendanceReportRow = z.infer<
  typeof teacherSubjectwiseAttendanceReportRowSchema
>

export const teacherSubjectwiseAttendanceReportResponseSchema = z.array(
  teacherSubjectwiseAttendanceReportRowSchema,
)
export type TeacherSubjectwiseAttendanceReportResponse = z.infer<
  typeof teacherSubjectwiseAttendanceReportResponseSchema
>

export const teacherStudentAttendancePercentageReportRowSchema = z.object({
  classroomId: z.string().min(1),
  classroomCode: z.string().min(1),
  classroomDisplayTitle: z.string().min(1),
  classId: z.string().min(1),
  classCode: z.string().min(1),
  classTitle: z.string().min(1),
  sectionId: z.string().min(1),
  sectionCode: z.string().min(1),
  sectionTitle: z.string().min(1),
  subjectId: z.string().min(1),
  subjectCode: z.string().min(1),
  subjectTitle: z.string().min(1),
  studentId: z.string().min(1),
  studentEmail: z.string().email(),
  studentDisplayName: z.string().min(1),
  studentRollNumber: z.string().nullable(),
  studentParentEmail: z.string().email().nullable(),
  enrollmentStatus: z.enum(["ACTIVE", "PENDING", "DROPPED", "BLOCKED"]),
  totalSessions: z.number().int().nonnegative(),
  presentSessions: z.number().int().nonnegative(),
  absentSessions: z.number().int().nonnegative(),
  attendancePercentage: attendancePercentageSchema,
  lastSessionAt: isoDateTimeSchema.nullable(),
  emailSentCount: z.number().int().nonnegative(),
})
export type TeacherStudentAttendancePercentageReportRow = z.infer<
  typeof teacherStudentAttendancePercentageReportRowSchema
>

export const teacherStudentAttendancePercentageReportResponseSchema = z.array(
  teacherStudentAttendancePercentageReportRowSchema,
)
export type TeacherStudentAttendancePercentageReportResponse = z.infer<
  typeof teacherStudentAttendancePercentageReportResponseSchema
>

export const studentReportOverviewSchema = z.object({
  studentId: z.string().min(1),
  trackedClassroomCount: z.number().int().nonnegative(),
  totalSessions: z.number().int().nonnegative(),
  presentSessions: z.number().int().nonnegative(),
  absentSessions: z.number().int().nonnegative(),
  attendancePercentage: attendancePercentageSchema,
  lastSessionAt: isoDateTimeSchema.nullable(),
})
export type StudentReportOverview = z.infer<typeof studentReportOverviewSchema>

export const studentSubjectReportSummarySchema = z.object({
  subjectId: z.string().min(1),
  subjectCode: z.string().min(1),
  subjectTitle: z.string().min(1),
  classroomCount: z.number().int().nonnegative(),
  totalSessions: z.number().int().nonnegative(),
  presentSessions: z.number().int().nonnegative(),
  absentSessions: z.number().int().nonnegative(),
  attendancePercentage: attendancePercentageSchema,
  lastSessionAt: isoDateTimeSchema.nullable(),
})
export type StudentSubjectReportSummary = z.infer<typeof studentSubjectReportSummarySchema>

export const studentSubjectReportSummaryResponseSchema = z.array(studentSubjectReportSummarySchema)
export type StudentSubjectReportSummaryResponse = z.infer<
  typeof studentSubjectReportSummaryResponseSchema
>

export const studentSubjectReportClassroomRowSchema = z.object({
  classroomId: z.string().min(1),
  classroomCode: z.string().min(1),
  classroomDisplayTitle: z.string().min(1),
  totalSessions: z.number().int().nonnegative(),
  presentSessions: z.number().int().nonnegative(),
  absentSessions: z.number().int().nonnegative(),
  attendancePercentage: attendancePercentageSchema,
  lastSessionAt: isoDateTimeSchema.nullable(),
})
export type StudentSubjectReportClassroomRow = z.infer<
  typeof studentSubjectReportClassroomRowSchema
>

export const studentSubjectReportParamsSchema = z.object({
  subjectId: z.string().min(1),
})
export type StudentSubjectReportParams = z.infer<typeof studentSubjectReportParamsSchema>

export const studentSubjectReportDetailSchema = studentSubjectReportSummarySchema.extend({
  classrooms: z.array(studentSubjectReportClassroomRowSchema),
})
export type StudentSubjectReportDetail = z.infer<typeof studentSubjectReportDetailSchema>

// --- Threshold email notifications (teacher → selected students / parents) ---

export const sendThresholdEmailsRequestSchema = z
  .object({
    studentIds: z.array(z.string().min(1)).min(1).max(200),
    classroomId: z.string().min(1),
    emailStudents: z.boolean(),
    emailParents: z.boolean(),
    subject: z.string().min(1).max(200),
    body: z.string().min(1).max(5000),
    thresholdPercent: z.number().min(0).max(100),
  })
  .refine((v) => v.emailStudents || v.emailParents, {
    message: "At least one of emailStudents or emailParents must be true.",
  })
export type SendThresholdEmailsRequest = z.infer<typeof sendThresholdEmailsRequestSchema>

export const sendThresholdEmailsResponseSchema = z.object({
  queuedCount: z.number().int().nonnegative(),
  sentCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  skippedNoParentEmail: z.number().int().nonnegative(),
})
export type SendThresholdEmailsResponse = z.infer<typeof sendThresholdEmailsResponseSchema>
