import type {
  AdminDashboardAttendanceOverviewResponse,
  AdminDashboardBranchComparisonResponse,
  AdminDashboardLeaderboardEntry,
  AdminDashboardLeaderboardQuery,
  AdminDashboardLeaderboardResponse,
  AdminDashboardSessionsGraphQuery,
  AdminDashboardSessionsGraphResponse,
  AdminDashboardStats,
  AdminDashboardTodayBranchAttendanceResponse,
  AdminSecurityEventSummary,
} from "@attendease/contracts"
import { Inject, Injectable } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"

const DEFAULT_LOW_ATTENDANCE_THRESHOLD = 75

@Injectable()
export class AdminDashboardService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}

  async getDashboardStats(): Promise<AdminDashboardStats> {
    const prisma = this.database.prisma
    const lowAttendanceThresholdPercent = await this.resolveLowAttendanceThreshold()

    const now = new Date()
    const last7Start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const prior14Start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const [
      studentCounts,
      teacherCounts,
      classroomCounts,
      semesterCounts,
      pendingDeviceRequests,
      recentSecurityEvents,
      attendanceTotals,
      lowAttendanceStudentCount,
      sessionsLast7Days,
      sessionsPrior7Days,
    ] = await Promise.all([
      this.countStudentsByStatus(prisma),
      this.countTeachersByStatus(prisma),
      this.countClassroomsByStatus(prisma),
      this.countSemestersByStatus(prisma),
      this.countPendingDeviceRequests(prisma),
      this.listRecentSecurityEvents(prisma),
      prisma.analyticsStudentCourseSummary.aggregate({
        _sum: { presentSessions: true, totalSessions: true },
      }),
      this.countLowAttendanceStudents(lowAttendanceThresholdPercent),
      prisma.attendanceSession.count({
        where: { startedAt: { gte: last7Start } },
      }),
      prisma.attendanceSession.count({
        where: { startedAt: { gte: prior14Start, lt: last7Start } },
      }),
    ])

    const totalSessionsAcrossEnrollments = attendanceTotals._sum.totalSessions ?? 0
    const presentSessionsAcrossEnrollments = attendanceTotals._sum.presentSessions ?? 0
    let averageAttendancePercent: number | null =
      totalSessionsAcrossEnrollments === 0
        ? null
        : round1((presentSessionsAcrossEnrollments / totalSessionsAcrossEnrollments) * 100)

    // Fallback: when the analytics summary table hasn't been populated yet
    // (e.g. analytics worker hasn't processed events, or data was seeded
    // directly), compute average attendance from raw AttendanceRecord rows.
    if (averageAttendancePercent === null) {
      const [totalRecords, presentRecords] = await Promise.all([
        prisma.attendanceRecord.count(),
        prisma.attendanceRecord.count({ where: { status: "PRESENT" } }),
      ])
      if (totalRecords > 0) {
        averageAttendancePercent = round1((presentRecords / totalRecords) * 100)
      }
    }

    return {
      students: studentCounts,
      teachers: teacherCounts,
      classrooms: classroomCounts,
      semesters: semesterCounts,
      pendingDeviceRequests,
      recentSecurityEvents,
      insights: {
        averageAttendancePercent,
        lowAttendanceStudentCount,
        lowAttendanceThresholdPercent,
        sessionsLast7Days,
        sessionsPrior7Days,
      },
    }
  }

  // -------------------------------------------------------------------
  // Phase 6 endpoints
  // -------------------------------------------------------------------

  async getSessionsGraph(
    query: AdminDashboardSessionsGraphQuery,
  ): Promise<AdminDashboardSessionsGraphResponse> {
    const prisma = this.database.prisma
    const now = new Date()
    const buckets = buildBuckets(query.range, now)

    const earliest = buckets[0]?.start ?? now
    const sessions = await prisma.attendanceSession.findMany({
      where: { startedAt: { gte: earliest, lt: buckets[buckets.length - 1]?.end ?? now } },
      select: { startedAt: true },
    })

    const counts = new Array(buckets.length).fill(0)
    for (const session of sessions) {
      if (!session.startedAt) continue
      for (let i = 0; i < buckets.length; i += 1) {
        const bucket = buckets[i]
        if (!bucket) continue
        if (session.startedAt >= bucket.start && session.startedAt < bucket.end) {
          counts[i] += 1
          break
        }
      }
    }

    const points = buckets.map((bucket, index) => ({
      bucketStart: bucket.start.toISOString(),
      label: bucket.label,
      sessionCount: counts[index] ?? 0,
    }))

    return {
      range: query.range,
      points,
      totalSessions: counts.reduce((sum, n) => sum + n, 0),
    }
  }

  async getBranchComparison(): Promise<AdminDashboardBranchComparisonResponse> {
    const prisma = this.database.prisma

    const summaries = await prisma.analyticsStudentCourseSummary.findMany({
      select: {
        studentId: true,
        presentSessions: true,
        totalSessions: true,
        student: { select: { studentProfile: { select: { branch: true } } } },
      },
    })

    type Agg = { sumPresent: number; sumTotal: number; studentIds: Set<string> }
    const byBranch = new Map<string, Agg>()
    for (const row of summaries) {
      const branch = row.student.studentProfile?.branch || "Unassigned"
      const existing = byBranch.get(branch) ?? {
        sumPresent: 0,
        sumTotal: 0,
        studentIds: new Set<string>(),
      }
      existing.sumPresent += row.presentSessions
      existing.sumTotal += row.totalSessions
      existing.studentIds.add(row.studentId)
      byBranch.set(branch, existing)
    }

    const branches = [...byBranch.entries()]
      .map(([branch, agg]) => ({
        branch,
        studentCount: agg.studentIds.size,
        averageAttendancePercent:
          agg.sumTotal === 0 ? null : round1((agg.sumPresent / agg.sumTotal) * 100),
      }))
      .sort((a, b) => {
        const av = a.averageAttendancePercent ?? -1
        const bv = b.averageAttendancePercent ?? -1
        return bv - av
      })

    return { branches }
  }

  async getLeaderboard(
    query: AdminDashboardLeaderboardQuery,
  ): Promise<AdminDashboardLeaderboardResponse> {
    const prisma = this.database.prisma

    const summaries = await prisma.analyticsStudentCourseSummary.findMany({
      select: {
        courseOfferingId: true,
        presentSessions: true,
        totalSessions: true,
        courseOffering: {
          select: {
            id: true,
            displayTitle: true,
            primaryTeacher: { select: { displayName: true } },
            subject: { select: { code: true, title: true } },
          },
        },
      },
    })

    type CourseAgg = {
      sumPresent: number
      sumTotal: number
      studentIds: Set<string>
      maxSessions: number
      offering: (typeof summaries)[number]["courseOffering"]
    }
    const byCourse = new Map<string, CourseAgg>()
    for (const row of summaries) {
      const existing = byCourse.get(row.courseOfferingId) ?? {
        sumPresent: 0,
        sumTotal: 0,
        studentIds: new Set<string>(),
        maxSessions: 0,
        offering: row.courseOffering,
      }
      existing.sumPresent += row.presentSessions
      existing.sumTotal += row.totalSessions
      existing.maxSessions = Math.max(existing.maxSessions, row.totalSessions)
      byCourse.set(row.courseOfferingId, existing)
    }

    // Need student counts per course; AnalyticsStudentCourseSummary already
    // has one row per (course × student) so the row count per course is the
    // student count.
    const studentCountByCourse = new Map<string, number>()
    for (const row of summaries) {
      studentCountByCourse.set(
        row.courseOfferingId,
        (studentCountByCourse.get(row.courseOfferingId) ?? 0) + 1,
      )
    }

    const entries: AdminDashboardLeaderboardEntry[] = [...byCourse.entries()]
      .filter(([, agg]) => agg.sumTotal > 0)
      .map(([courseOfferingId, agg]) => ({
        courseOfferingId,
        code: agg.offering.subject?.code ?? "",
        displayTitle: agg.offering.subject?.title ?? agg.offering.displayTitle,
        teacherName: agg.offering.primaryTeacher.displayName,
        studentCount: studentCountByCourse.get(courseOfferingId) ?? 0,
        averageAttendancePercent: round1((agg.sumPresent / agg.sumTotal) * 100),
        sessionsConducted: agg.maxSessions,
      }))

    entries.sort((a, b) =>
      query.direction === "top"
        ? b.averageAttendancePercent - a.averageAttendancePercent
        : a.averageAttendancePercent - b.averageAttendancePercent,
    )

    return {
      direction: query.direction,
      entries: entries.slice(0, query.limit),
    }
  }

  // -------------------------------------------------------------------
  // Phase 4A — Attendance overview pie chart brackets
  // -------------------------------------------------------------------

  async getAttendanceOverview(): Promise<AdminDashboardAttendanceOverviewResponse> {
    const prisma = this.database.prisma

    const summaries = await prisma.analyticsStudentCourseSummary.findMany({
      select: { studentId: true, presentSessions: true, totalSessions: true },
    })

    type Agg = { sumPresent: number; sumTotal: number }
    const byStudent = new Map<string, Agg>()
    for (const row of summaries) {
      const existing = byStudent.get(row.studentId) ?? { sumPresent: 0, sumTotal: 0 }
      existing.sumPresent += row.presentSessions
      existing.sumTotal += row.totalSessions
      byStudent.set(row.studentId, existing)
    }

    let high = 0
    let mid = 0
    let low = 0

    for (const agg of byStudent.values()) {
      if (agg.sumTotal === 0) continue
      const pct = (agg.sumPresent / agg.sumTotal) * 100
      if (pct >= 75) high += 1
      else if (pct >= 50) mid += 1
      else low += 1
    }

    return {
      brackets: [
        { bracket: ">=75%", studentCount: high },
        { bracket: "50-75%", studentCount: mid },
        { bracket: "<50%", studentCount: low },
      ],
      totalStudents: high + mid + low,
    }
  }

  // -------------------------------------------------------------------
  // Phase 4C — Today's branch attendance
  // -------------------------------------------------------------------

  async getTodayBranchAttendance(): Promise<AdminDashboardTodayBranchAttendanceResponse> {
    const prisma = this.database.prisma
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    const todaysSessions = await prisma.attendanceSession.findMany({
      where: { startedAt: { gte: todayStart, lt: todayEnd } },
      select: { id: true },
    })

    if (todaysSessions.length === 0) {
      return {
        date: todayStart.toISOString().slice(0, 10),
        branches: [],
      }
    }

    const sessionIds = todaysSessions.map((s) => s.id)

    const records = await prisma.attendanceRecord.findMany({
      where: { sessionId: { in: sessionIds } },
      select: {
        status: true,
        student: { select: { studentProfile: { select: { branch: true } } } },
      },
    })

    type BranchAgg = { present: number; total: number }
    const byBranch = new Map<string, BranchAgg>()

    for (const record of records) {
      const branch = record.student.studentProfile?.branch || "Unassigned"
      const existing = byBranch.get(branch) ?? { present: 0, total: 0 }
      existing.total += 1
      if (record.status === "PRESENT") existing.present += 1
      byBranch.set(branch, existing)
    }

    const branches = [...byBranch.entries()]
      .map(([branch, agg]) => ({
        branch,
        attendancePercent: agg.total === 0 ? null : round1((agg.present / agg.total) * 100),
        presentCount: agg.present,
        totalCount: agg.total,
      }))
      .sort((a, b) => {
        const av = a.attendancePercent ?? -1
        const bv = b.attendancePercent ?? -1
        return bv - av
      })

    return {
      date: todayStart.toISOString().slice(0, 10),
      branches,
    }
  }

  // -------------------------------------------------------------------
  // Existing helpers
  // -------------------------------------------------------------------

  private async countStudentsByStatus(prisma: DatabaseService["prisma"]) {
    const studentWhere = { roles: { some: { role: "STUDENT" as const } } }

    const [total, active, blocked, pending] = await Promise.all([
      prisma.user.count({ where: studentWhere }),
      prisma.user.count({ where: { ...studentWhere, status: "ACTIVE" } }),
      prisma.user.count({ where: { ...studentWhere, status: "BLOCKED" } }),
      prisma.user.count({ where: { ...studentWhere, status: "PENDING" } }),
    ])

    return { total, active, blocked, pending }
  }

  private async countTeachersByStatus(prisma: DatabaseService["prisma"]) {
    const teacherWhere = { roles: { some: { role: "TEACHER" as const } } }

    const [total, active] = await Promise.all([
      prisma.user.count({ where: teacherWhere }),
      prisma.user.count({ where: { ...teacherWhere, status: "ACTIVE" } }),
    ])

    return { total, active }
  }

  private async countClassroomsByStatus(prisma: DatabaseService["prisma"]) {
    const [total, active, archived] = await Promise.all([
      prisma.courseOffering.count(),
      prisma.courseOffering.count({ where: { status: "ACTIVE" } }),
      prisma.courseOffering.count({ where: { status: "ARCHIVED" } }),
    ])

    return { total, active, archived }
  }

  private async countSemestersByStatus(prisma: DatabaseService["prisma"]) {
    const [total, active] = await Promise.all([
      prisma.semester.count(),
      prisma.semester.count({ where: { status: "ACTIVE" } }),
    ])

    return { total, active }
  }

  private async countPendingDeviceRequests(prisma: DatabaseService["prisma"]): Promise<number> {
    return prisma.userDeviceBinding.count({
      where: {
        bindingType: "STUDENT_ATTENDANCE",
        status: "PENDING",
      },
    })
  }

  private async listRecentSecurityEvents(
    prisma: DatabaseService["prisma"],
  ): Promise<AdminSecurityEventSummary[]> {
    const events = await prisma.securityEvent.findMany({
      where: { userId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        eventType: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    })

    return events
      .filter(
        (event): event is typeof event & { user: NonNullable<typeof event.user> } =>
          event.user !== null,
      )
      .map((event) => ({
        id: event.id,
        eventType: event.eventType,
        userId: event.user.id,
        userEmail: event.user.email,
        userDisplayName: event.user.displayName,
        createdAt: event.createdAt.toISOString(),
      }))
  }

  // -------------------------------------------------------------------
  // Phase 6 helpers
  // -------------------------------------------------------------------

  private async resolveLowAttendanceThreshold(): Promise<number> {
    const row = await this.database.prisma.systemSetting.findUnique({
      where: { key: "system.lowAttendanceThresholdPercent" },
    })
    if (!row) return DEFAULT_LOW_ATTENDANCE_THRESHOLD
    if (typeof row.value === "number") return Math.round(row.value)
    if (typeof row.value === "string") {
      const parsed = Number(row.value)
      if (Number.isFinite(parsed)) return Math.round(parsed)
    }
    return DEFAULT_LOW_ATTENDANCE_THRESHOLD
  }

  private async countLowAttendanceStudents(thresholdPercent: number): Promise<number> {
    const summaries = await this.database.prisma.analyticsStudentCourseSummary.findMany({
      select: {
        studentId: true,
        presentSessions: true,
        totalSessions: true,
      },
    })

    type Agg = { sumPresent: number; sumTotal: number }
    const byStudent = new Map<string, Agg>()
    for (const row of summaries) {
      const existing = byStudent.get(row.studentId) ?? { sumPresent: 0, sumTotal: 0 }
      existing.sumPresent += row.presentSessions
      existing.sumTotal += row.totalSessions
      byStudent.set(row.studentId, existing)
    }

    let count = 0
    for (const agg of byStudent.values()) {
      if (agg.sumTotal === 0) continue
      const percent = (agg.sumPresent / agg.sumTotal) * 100
      if (percent < thresholdPercent) count += 1
    }
    return count
  }
}

// ----------------------------- helpers -----------------------------

type Bucket = { start: Date; end: Date; label: string }

function buildBuckets(range: "weekly" | "monthly" | "yearly", now: Date): Bucket[] {
  if (range === "weekly") {
    // 7 daily buckets ending today.
    const buckets: Bucket[] = []
    const startOfToday = startOfDay(now)
    for (let i = 6; i >= 0; i -= 1) {
      const start = new Date(startOfToday.getTime() - i * 24 * 60 * 60 * 1000)
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
      buckets.push({
        start,
        end,
        label: start.toLocaleDateString("en-US", { weekday: "short" }),
      })
    }
    return buckets
  }
  if (range === "monthly") {
    // 4 weekly buckets ending this week (Sun→Sat each), 7-day windows back from today.
    const buckets: Bucket[] = []
    const startOfToday = startOfDay(now)
    for (let i = 3; i >= 0; i -= 1) {
      const start = new Date(
        startOfToday.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000,
      )
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
      const labelEnd = new Date(end.getTime() - 1)
      buckets.push({
        start,
        end,
        label: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${labelEnd.toLocaleDateString("en-US", { day: "numeric" })}`,
      })
    }
    return buckets
  }
  // yearly: 12 monthly buckets ending current month.
  const buckets: Bucket[] = []
  const baseYear = now.getFullYear()
  const baseMonth = now.getMonth()
  for (let i = 11; i >= 0; i -= 1) {
    const start = new Date(baseYear, baseMonth - i, 1)
    const end = new Date(baseYear, baseMonth - i + 1, 1)
    buckets.push({
      start,
      end,
      label: start.toLocaleDateString("en-US", { month: "short" }),
    })
  }
  return buckets
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}
