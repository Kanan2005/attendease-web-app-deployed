import { z } from "zod"

// =====================================================================
// Records explorer (Department -> Teacher -> Course -> Students)
//
// Hierarchy:
//   1. Department  : grouped by `TeacherProfile.department` (non-null,
//                    distinct values)
//   2. Teacher     : teachers in a given department
//   3. Course      : course offerings owned by a teacher (active/archived)
//   4. Student     : students enrolled in a course offering
//
// All endpoints under /admin/records are admin-only (AdminRoleGuard).
// =====================================================================

const isoDateString = z.string().min(1)
const nonNegativeInt = z.number().int().nonnegative()
const percentSchema = z.number().min(0).max(100)

export const adminRecordsDepartmentSummarySchema = z.object({
  department: z.string().min(1),
  teacherCount: nonNegativeInt,
  studentCount: nonNegativeInt,
  courseCount: nonNegativeInt,
  activeCourseCount: nonNegativeInt,
  archivedCourseCount: nonNegativeInt,
  averageAttendancePercent: percentSchema.nullable(),
})
export type AdminRecordsDepartmentSummary = z.infer<typeof adminRecordsDepartmentSummarySchema>

export const adminRecordsDepartmentListResponseSchema = z.object({
  departments: z.array(adminRecordsDepartmentSummarySchema),
})
export type AdminRecordsDepartmentListResponse = z.infer<
  typeof adminRecordsDepartmentListResponseSchema
>

export const adminRecordsTeacherSummarySchema = z.object({
  teacherId: z.string().min(1),
  displayName: z.string().min(1),
  employeeCode: z.string().nullable(),
  department: z.string().min(1),
  courseCount: nonNegativeInt,
  activeCourseCount: nonNegativeInt,
  archivedCourseCount: nonNegativeInt,
  studentCount: nonNegativeInt,
  averageAttendancePercent: percentSchema.nullable(),
})
export type AdminRecordsTeacherSummary = z.infer<typeof adminRecordsTeacherSummarySchema>

export const adminRecordsTeacherListResponseSchema = z.object({
  department: z.string().min(1),
  teachers: z.array(adminRecordsTeacherSummarySchema),
})
export type AdminRecordsTeacherListResponse = z.infer<typeof adminRecordsTeacherListResponseSchema>

export const adminRecordsCourseStatusSchema = z.enum(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"])
export type AdminRecordsCourseStatus = z.infer<typeof adminRecordsCourseStatusSchema>

export const adminRecordsCourseSummarySchema = z.object({
  courseOfferingId: z.string().min(1),
  code: z.string().min(1),
  displayTitle: z.string().min(1),
  status: adminRecordsCourseStatusSchema,
  isArchived: z.boolean(),
  primaryTeacherId: z.string().min(1),
  primaryTeacherName: z.string().min(1),
  studentCount: nonNegativeInt,
  sessionsConductedCount: nonNegativeInt,
  averageAttendancePercent: percentSchema.nullable(),
  lastSessionAt: isoDateString.nullable(),
  semesterLabel: z.string().nullable(),
})
export type AdminRecordsCourseSummary = z.infer<typeof adminRecordsCourseSummarySchema>

export const adminRecordsCourseListResponseSchema = z.object({
  teacherId: z.string().min(1),
  teacherName: z.string().min(1),
  department: z.string().min(1),
  courses: z.array(adminRecordsCourseSummarySchema),
})
export type AdminRecordsCourseListResponse = z.infer<typeof adminRecordsCourseListResponseSchema>

export const adminRecordsCourseSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(64),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})
export type AdminRecordsCourseSearchQuery = z.infer<typeof adminRecordsCourseSearchQuerySchema>

export const adminRecordsCourseSearchHitSchema = z.object({
  courseOfferingId: z.string().min(1),
  code: z.string().min(1),
  displayTitle: z.string().min(1),
  status: adminRecordsCourseStatusSchema,
  primaryTeacherId: z.string().min(1),
  primaryTeacherName: z.string().min(1),
  department: z.string().min(1).nullable(),
})
export type AdminRecordsCourseSearchHit = z.infer<typeof adminRecordsCourseSearchHitSchema>

export const adminRecordsCourseSearchResponseSchema = z.object({
  query: z.string().min(1),
  hits: z.array(adminRecordsCourseSearchHitSchema),
})
export type AdminRecordsCourseSearchResponse = z.infer<typeof adminRecordsCourseSearchResponseSchema>

export const adminRecordsStudentAttendanceStatusSchema = z.enum(["LOW", "NORMAL"])
export type AdminRecordsStudentAttendanceStatus = z.infer<
  typeof adminRecordsStudentAttendanceStatusSchema
>

export const adminRecordsStudentSummarySchema = z.object({
  studentId: z.string().min(1),
  rollNumber: z.string().nullable(),
  displayName: z.string().min(1),
  email: z.string().min(1),
  branch: z.string().nullable(),
  currentSemester: z.number().int().positive().nullable(),
  totalSessions: nonNegativeInt,
  presentSessions: nonNegativeInt,
  attendancePercent: percentSchema.nullable(),
  attendanceStatus: adminRecordsStudentAttendanceStatusSchema,
  attendanceDisabled: z.boolean(),
  lastSessionAt: isoDateString.nullable(),
})
export type AdminRecordsStudentSummary = z.infer<typeof adminRecordsStudentSummarySchema>

export const adminRecordsStudentListResponseSchema = z.object({
  courseOfferingId: z.string().min(1),
  courseCode: z.string().min(1),
  courseTitle: z.string().min(1),
  status: adminRecordsCourseStatusSchema,
  isArchived: z.boolean(),
  studentCount: nonNegativeInt,
  averageAttendancePercent: percentSchema.nullable(),
  lowAttendanceCount: nonNegativeInt,
  lowAttendanceThresholdPercent: percentSchema,
  students: z.array(adminRecordsStudentSummarySchema),
})
export type AdminRecordsStudentListResponse = z.infer<
  typeof adminRecordsStudentListResponseSchema
>

export const adminRecordsArchiveRequestSchema = z.object({
  reason: z.string().trim().min(1).max(280).optional(),
})
export type AdminRecordsArchiveRequest = z.infer<typeof adminRecordsArchiveRequestSchema>

export const adminRecordsArchiveResponseSchema = z.object({
  courseOfferingId: z.string().min(1),
  status: adminRecordsCourseStatusSchema,
  isArchived: z.boolean(),
  archivedAt: isoDateString.nullable(),
})
export type AdminRecordsArchiveResponse = z.infer<typeof adminRecordsArchiveResponseSchema>
