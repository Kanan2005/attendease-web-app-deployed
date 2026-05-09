import { z } from "zod"

import { courseOfferingStatusSchema } from "./academic.core"
import { userStatusSchema } from "./auth"

// ---------------------------------------------------------------------------
// Filter queries
// ---------------------------------------------------------------------------

export const adminUsersStudentListQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  degree: z.string().trim().min(1).optional(),
  branch: z.string().trim().min(1).optional(),
  currentSemester: z.coerce.number().int().min(1).max(12).optional(),
  sectionId: z.string().trim().min(1).optional(),
  attendanceDisabled: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
})
export type AdminUsersStudentListQuery = z.infer<typeof adminUsersStudentListQuerySchema>

export const adminUsersTeacherListQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  department: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
})
export type AdminUsersTeacherListQuery = z.infer<typeof adminUsersTeacherListQuerySchema>

// ---------------------------------------------------------------------------
// Student list + profile
// ---------------------------------------------------------------------------

export const adminUsersStudentSummarySchema = z.object({
  studentId: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  rollNumber: z.string().nullable(),
  degree: z.string().nullable(),
  branch: z.string().nullable(),
  currentSemester: z.number().int().nullable(),
  enrollmentCount: z.number().int().nonnegative(),
  totalSessions: z.number().int().nonnegative(),
  presentSessions: z.number().int().nonnegative(),
  attendancePercent: z.number().nullable(),
  attendanceDisabled: z.boolean(),
  accountStatus: userStatusSchema,
})
export type AdminUsersStudentSummary = z.infer<typeof adminUsersStudentSummarySchema>

export const adminUsersStudentListResponseSchema = z.object({
  students: z.array(adminUsersStudentSummarySchema),
  totalReturned: z.number().int().nonnegative(),
  lowAttendanceThresholdPercent: z.number().int(),
})
export type AdminUsersStudentListResponse = z.infer<typeof adminUsersStudentListResponseSchema>

export const adminUsersStudentCourseSchema = z.object({
  courseOfferingId: z.string(),
  code: z.string(),
  displayTitle: z.string(),
  status: courseOfferingStatusSchema,
  isArchived: z.boolean(),
  primaryTeacherName: z.string(),
  totalSessions: z.number().int().nonnegative(),
  presentSessions: z.number().int().nonnegative(),
  attendancePercent: z.number().nullable(),
  lastSessionAt: z.string().datetime().nullable(),
})
export type AdminUsersStudentCourse = z.infer<typeof adminUsersStudentCourseSchema>

export const adminUsersStudentProfileSchema = z.object({
  studentId: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  rollNumber: z.string().nullable(),
  universityId: z.string().nullable(),
  programName: z.string().nullable(),
  degree: z.string().nullable(),
  branch: z.string().nullable(),
  currentSemester: z.number().int().nullable(),
  parentEmail: z.string().email().nullable(),
  attendanceDisabled: z.boolean(),
  accountStatus: userStatusSchema,
  createdAt: z.string().datetime(),
  overallTotalSessions: z.number().int().nonnegative(),
  overallPresentSessions: z.number().int().nonnegative(),
  overallAttendancePercent: z.number().nullable(),
  courses: z.array(adminUsersStudentCourseSchema),
})
export type AdminUsersStudentProfile = z.infer<typeof adminUsersStudentProfileSchema>

// ---------------------------------------------------------------------------
// Teacher list + profile
// ---------------------------------------------------------------------------

export const adminUsersTeacherSummarySchema = z.object({
  teacherId: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  employeeCode: z.string().nullable(),
  department: z.string().nullable(),
  designation: z.string().nullable(),
  courseCount: z.number().int().nonnegative(),
  activeCourseCount: z.number().int().nonnegative(),
  archivedCourseCount: z.number().int().nonnegative(),
  studentCount: z.number().int().nonnegative(),
  accountStatus: userStatusSchema,
})
export type AdminUsersTeacherSummary = z.infer<typeof adminUsersTeacherSummarySchema>

export const adminUsersTeacherListResponseSchema = z.object({
  teachers: z.array(adminUsersTeacherSummarySchema),
  totalReturned: z.number().int().nonnegative(),
})
export type AdminUsersTeacherListResponse = z.infer<typeof adminUsersTeacherListResponseSchema>

export const adminUsersTeacherCourseSchema = z.object({
  courseOfferingId: z.string(),
  code: z.string(),
  displayTitle: z.string(),
  status: courseOfferingStatusSchema,
  isArchived: z.boolean(),
  studentCount: z.number().int().nonnegative(),
  sessionsConductedCount: z.number().int().nonnegative(),
  averageAttendancePercent: z.number().nullable(),
  lastSessionAt: z.string().datetime().nullable(),
})
export type AdminUsersTeacherCourse = z.infer<typeof adminUsersTeacherCourseSchema>

export const adminUsersTeacherProfileSchema = z.object({
  teacherId: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  employeeCode: z.string().nullable(),
  department: z.string().nullable(),
  designation: z.string().nullable(),
  accountStatus: userStatusSchema,
  createdAt: z.string().datetime(),
  courseCount: z.number().int().nonnegative(),
  activeCourseCount: z.number().int().nonnegative(),
  archivedCourseCount: z.number().int().nonnegative(),
  studentCount: z.number().int().nonnegative(),
  averageAttendancePercent: z.number().nullable(),
  courses: z.array(adminUsersTeacherCourseSchema),
})
export type AdminUsersTeacherProfile = z.infer<typeof adminUsersTeacherProfileSchema>

// ---------------------------------------------------------------------------
// Attendance disable / enable
// ---------------------------------------------------------------------------

export const adminUsersAttendanceToggleRequestSchema = z.object({
  reason: z.string().trim().min(3).max(240).optional(),
})
export type AdminUsersAttendanceToggleRequest = z.infer<
  typeof adminUsersAttendanceToggleRequestSchema
>

export const adminUsersAttendanceToggleResponseSchema = adminUsersStudentProfileSchema
export type AdminUsersAttendanceToggleResponse = z.infer<
  typeof adminUsersAttendanceToggleResponseSchema
>

// ---------------------------------------------------------------------------
// Filter options (distinct values for dropdowns)
// ---------------------------------------------------------------------------

export const adminUsersFilterOptionsSchema = z.object({
  degrees: z.array(z.string()),
  branches: z.array(z.string()),
  semesters: z.array(z.number().int().positive()),
  departments: z.array(z.string()),
})
export type AdminUsersFilterOptions = z.infer<typeof adminUsersFilterOptionsSchema>
