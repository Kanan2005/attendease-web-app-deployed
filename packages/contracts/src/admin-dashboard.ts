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
  // Phase 6 insights — added in a backwards-compatible way.
  insights: z.object({
    averageAttendancePercent: z.number().nullable(),
    lowAttendanceStudentCount: z.number().int().nonnegative(),
    lowAttendanceThresholdPercent: z.number().int().min(40).max(100),
    sessionsLast7Days: z.number().int().nonnegative(),
    sessionsPrior7Days: z.number().int().nonnegative(),
  }),
})
export type AdminDashboardStats = z.infer<typeof adminDashboardStatsSchema>

// ---------------------------------------------------------------------------
// Phase 6 — Sessions trend graph.
// ---------------------------------------------------------------------------

export const adminDashboardSessionsRangeSchema = z.enum(["weekly", "monthly", "yearly"])
export type AdminDashboardSessionsRange = z.infer<typeof adminDashboardSessionsRangeSchema>

export const adminDashboardSessionsGraphQuerySchema = z.object({
  range: adminDashboardSessionsRangeSchema.default("weekly"),
})
export type AdminDashboardSessionsGraphQuery = z.infer<
  typeof adminDashboardSessionsGraphQuerySchema
>

export const adminDashboardSessionsGraphPointSchema = z.object({
  bucketStart: z.string().datetime(),
  label: z.string(),
  sessionCount: z.number().int().nonnegative(),
})
export type AdminDashboardSessionsGraphPoint = z.infer<
  typeof adminDashboardSessionsGraphPointSchema
>

export const adminDashboardSessionsGraphResponseSchema = z.object({
  range: adminDashboardSessionsRangeSchema,
  points: z.array(adminDashboardSessionsGraphPointSchema),
  totalSessions: z.number().int().nonnegative(),
})
export type AdminDashboardSessionsGraphResponse = z.infer<
  typeof adminDashboardSessionsGraphResponseSchema
>

// ---------------------------------------------------------------------------
// Phase 6 — Branch comparison bar chart.
// ---------------------------------------------------------------------------

export const adminDashboardBranchAttendanceRowSchema = z.object({
  branch: z.string(),
  studentCount: z.number().int().nonnegative(),
  averageAttendancePercent: z.number().nullable(),
})
export type AdminDashboardBranchAttendanceRow = z.infer<
  typeof adminDashboardBranchAttendanceRowSchema
>

export const adminDashboardBranchComparisonResponseSchema = z.object({
  branches: z.array(adminDashboardBranchAttendanceRowSchema),
})
export type AdminDashboardBranchComparisonResponse = z.infer<
  typeof adminDashboardBranchComparisonResponseSchema
>

// ---------------------------------------------------------------------------
// Phase 4A — Attendance overview pie chart brackets.
// ---------------------------------------------------------------------------

export const adminDashboardAttendanceBracketSchema = z.object({
  bracket: z.enum([">=75%", "50-75%", "<50%"]),
  studentCount: z.number().int().nonnegative(),
})
export type AdminDashboardAttendanceBracket = z.infer<
  typeof adminDashboardAttendanceBracketSchema
>

export const adminDashboardAttendanceOverviewResponseSchema = z.object({
  brackets: z.array(adminDashboardAttendanceBracketSchema),
  totalStudents: z.number().int().nonnegative(),
})
export type AdminDashboardAttendanceOverviewResponse = z.infer<
  typeof adminDashboardAttendanceOverviewResponseSchema
>

// ---------------------------------------------------------------------------
// Phase 4C — Today's branch attendance (horizontal bar chart).
// ---------------------------------------------------------------------------

export const adminDashboardTodayBranchRowSchema = z.object({
  branch: z.string(),
  attendancePercent: z.number().nullable(),
  presentCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
})
export type AdminDashboardTodayBranchRow = z.infer<
  typeof adminDashboardTodayBranchRowSchema
>

export const adminDashboardTodayBranchAttendanceResponseSchema = z.object({
  date: z.string().min(1),
  branches: z.array(adminDashboardTodayBranchRowSchema),
})
export type AdminDashboardTodayBranchAttendanceResponse = z.infer<
  typeof adminDashboardTodayBranchAttendanceResponseSchema
>

// ---------------------------------------------------------------------------
// Phase 6 — Course leaderboard (top / bottom by attendance %).
// ---------------------------------------------------------------------------

export const adminDashboardLeaderboardDirectionSchema = z.enum(["top", "bottom"])
export type AdminDashboardLeaderboardDirection = z.infer<
  typeof adminDashboardLeaderboardDirectionSchema
>

export const adminDashboardLeaderboardQuerySchema = z.object({
  direction: adminDashboardLeaderboardDirectionSchema.default("bottom"),
  limit: z.coerce.number().int().min(1).max(20).default(5),
})
export type AdminDashboardLeaderboardQuery = z.infer<typeof adminDashboardLeaderboardQuerySchema>

export const adminDashboardLeaderboardEntrySchema = z.object({
  courseOfferingId: z.string(),
  code: z.string(),
  displayTitle: z.string(),
  teacherName: z.string(),
  studentCount: z.number().int().nonnegative(),
  averageAttendancePercent: z.number(),
  sessionsConducted: z.number().int().nonnegative(),
})
export type AdminDashboardLeaderboardEntry = z.infer<typeof adminDashboardLeaderboardEntrySchema>

export const adminDashboardLeaderboardResponseSchema = z.object({
  direction: adminDashboardLeaderboardDirectionSchema,
  entries: z.array(adminDashboardLeaderboardEntrySchema),
})
export type AdminDashboardLeaderboardResponse = z.infer<
  typeof adminDashboardLeaderboardResponseSchema
>

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
