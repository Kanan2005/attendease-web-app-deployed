import { z } from "zod"

export const adminSecurityEventSummarySchema = z.object({
  id: z.string().min(1),
  eventType: z.string().min(1),
  userId: z.string().min(1),
  userEmail: z.string().min(1),
  userDisplayName: z.string().min(1),
  createdAt: z.string().min(1),
})
export type AdminSecurityEventSummary = z.infer<typeof adminSecurityEventSummarySchema>

export const adminDashboardStatsSchema = z.object({
  students: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    blocked: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
  }),
  teachers: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
  }),
  classrooms: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    archived: z.number().int().nonnegative(),
  }),
  semesters: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
  }),
  pendingDeviceRequests: z.number().int().nonnegative(),
  recentSecurityEvents: z.array(adminSecurityEventSummarySchema),
})
export type AdminDashboardStats = z.infer<typeof adminDashboardStatsSchema>

export const adminTeacherSummarySchema = z.object({
  id: z.string().min(1),
  email: z.string().min(1),
  displayName: z.string().min(1),
  status: z.string().min(1),
  employeeCode: z.string().nullable(),
  department: z.string().nullable(),
  designation: z.string().nullable(),
  classroomCount: z.number().int().nonnegative(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string().min(1),
})
export type AdminTeacherSummary = z.infer<typeof adminTeacherSummarySchema>

export const adminTeacherSearchQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  status: z.enum(["ACTIVE", "BLOCKED", "ARCHIVED", "PENDING", "SUSPENDED"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
})
export type AdminTeacherSearchQuery = z.infer<typeof adminTeacherSearchQuerySchema>

export const adminTeacherListResponseSchema = z.array(adminTeacherSummarySchema)
export type AdminTeacherListResponse = z.infer<typeof adminTeacherListResponseSchema>

export const adminTeacherClassroomSchema = z.object({
  classroomId: z.string().min(1),
  classroomTitle: z.string().min(1),
  courseCode: z.string().min(1),
  semesterTitle: z.string().min(1),
  status: z.string().min(1),
  studentCount: z.number().int().nonnegative(),
})
export type AdminTeacherClassroom = z.infer<typeof adminTeacherClassroomSchema>

export const adminTeacherDetailSchema = adminTeacherSummarySchema.extend({
  classrooms: z.array(adminTeacherClassroomSchema),
})
export type AdminTeacherDetail = z.infer<typeof adminTeacherDetailSchema>
