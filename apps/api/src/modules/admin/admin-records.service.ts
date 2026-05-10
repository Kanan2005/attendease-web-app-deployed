import type {
  AdminRecordsArchiveRequest,
  AdminRecordsArchiveResponse,
  AdminRecordsCourseListResponse,
  AdminRecordsCourseSearchHit,
  AdminRecordsCourseSearchQuery,
  AdminRecordsCourseSearchResponse,
  AdminRecordsCourseSummary,
  AdminRecordsDepartmentListResponse,
  AdminRecordsDepartmentSummary,
  AdminRecordsStudentListResponse,
  AdminRecordsStudentSummary,
  AdminRecordsTeacherListResponse,
  AdminRecordsTeacherSummary,
} from "@attendease/contracts"
import { runInTransaction } from "@attendease/db"
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"

const LOW_ATTENDANCE_THRESHOLD_PERCENT = 75
const COURSE_SEARCH_DEFAULT_LIMIT = 15

type AggregateBucket = {
  totalSessions: number
  presentSessions: number
}

function computePercent(bucket: AggregateBucket): number | null {
  if (bucket.totalSessions <= 0) {
    return null
  }
  return Number(((bucket.presentSessions / bucket.totalSessions) * 100).toFixed(2))
}

function classifyAttendance(percent: number | null): "LOW" | "NORMAL" {
  if (percent === null) {
    return "NORMAL"
  }
  return percent < LOW_ATTENDANCE_THRESHOLD_PERCENT ? "LOW" : "NORMAL"
}

@Injectable()
export class AdminRecordsService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}

  // -------------------------------------------------------------------
  // Level 1: Departments
  // -------------------------------------------------------------------
  async listDepartments(): Promise<AdminRecordsDepartmentListResponse> {
    const teacherProfiles = await this.database.prisma.teacherProfile.findMany({
      where: {
        department: { not: null },
      },
      select: {
        userId: true,
        department: true,
      },
    })

    if (teacherProfiles.length === 0) {
      return { departments: [] }
    }

    // Group teachers by department.
    const teachersByDepartment = new Map<string, string[]>()
    for (const profile of teacherProfiles) {
      const department = profile.department?.trim()
      if (!department) {
        continue
      }
      const existing = teachersByDepartment.get(department) ?? []
      existing.push(profile.userId)
      teachersByDepartment.set(department, existing)
    }

    if (teachersByDepartment.size === 0) {
      return { departments: [] }
    }

    const allTeacherIds = Array.from(teachersByDepartment.values()).flat()

    // Fetch course offerings + their analytics in one shot.
    const offerings = await this.database.prisma.courseOffering.findMany({
      where: {
        primaryTeacherId: { in: allTeacherIds },
      },
      select: {
        id: true,
        primaryTeacherId: true,
        status: true,
      },
    })

    const offeringIdsByTeacher = new Map<string, string[]>()
    for (const offering of offerings) {
      const existing = offeringIdsByTeacher.get(offering.primaryTeacherId) ?? []
      existing.push(offering.id)
      offeringIdsByTeacher.set(offering.primaryTeacherId, existing)
    }

    const allOfferingIds = offerings.map((o) => o.id)
    const summaries =
      allOfferingIds.length > 0
        ? await this.database.prisma.analyticsStudentCourseSummary.findMany({
            where: { courseOfferingId: { in: allOfferingIds } },
            select: {
              courseOfferingId: true,
              studentId: true,
              totalSessions: true,
              presentSessions: true,
            },
          })
        : []

    const summariesByOffering = new Map<
      string,
      Array<{ studentId: string; totalSessions: number; presentSessions: number }>
    >()
    for (const summary of summaries) {
      const list = summariesByOffering.get(summary.courseOfferingId) ?? []
      list.push({
        studentId: summary.studentId,
        totalSessions: summary.totalSessions,
        presentSessions: summary.presentSessions,
      })
      summariesByOffering.set(summary.courseOfferingId, list)
    }

    const departments: AdminRecordsDepartmentSummary[] = []
    for (const [department, teacherIds] of teachersByDepartment.entries()) {
      let courseCount = 0
      let activeCourseCount = 0
      let archivedCourseCount = 0
      const studentSet = new Set<string>()
      const aggregate: AggregateBucket = { totalSessions: 0, presentSessions: 0 }

      for (const teacherId of teacherIds) {
        const offeringIds = offeringIdsByTeacher.get(teacherId) ?? []
        for (const offeringId of offeringIds) {
          const offering = offerings.find((o) => o.id === offeringId)
          if (!offering) continue
          courseCount += 1
          if (offering.status === "ARCHIVED") {
            archivedCourseCount += 1
          } else if (offering.status === "ACTIVE") {
            activeCourseCount += 1
          }
          for (const summary of summariesByOffering.get(offeringId) ?? []) {
            studentSet.add(summary.studentId)
            aggregate.totalSessions += summary.totalSessions
            aggregate.presentSessions += summary.presentSessions
          }
        }
      }

      departments.push({
        department,
        teacherCount: teacherIds.length,
        studentCount: studentSet.size,
        courseCount,
        activeCourseCount,
        archivedCourseCount,
        averageAttendancePercent: computePercent(aggregate),
      })
    }

    departments.sort((a, b) => a.department.localeCompare(b.department))
    return { departments }
  }

  // -------------------------------------------------------------------
  // Level 2: Teachers in a department
  // -------------------------------------------------------------------
  async listTeachersInDepartment(department: string): Promise<AdminRecordsTeacherListResponse> {
    const trimmed = department.trim()
    if (!trimmed) {
      throw new BadRequestException("Department name must not be empty.")
    }

    const teachers = await this.database.prisma.user.findMany({
      where: {
        roles: { some: { role: "TEACHER" } },
        teacherProfile: {
          is: { department: trimmed },
        },
      },
      include: {
        teacherProfile: true,
      },
      orderBy: { displayName: "asc" },
    })

    if (teachers.length === 0) {
      return { department: trimmed, teachers: [] }
    }

    const teacherIds = teachers.map((t) => t.id)
    const offerings = await this.database.prisma.courseOffering.findMany({
      where: { primaryTeacherId: { in: teacherIds } },
      select: { id: true, primaryTeacherId: true, status: true },
    })

    const offeringIdsByTeacher = new Map<string, string[]>()
    const statusByOfferingId = new Map<string, string>()
    for (const offering of offerings) {
      const list = offeringIdsByTeacher.get(offering.primaryTeacherId) ?? []
      list.push(offering.id)
      offeringIdsByTeacher.set(offering.primaryTeacherId, list)
      statusByOfferingId.set(offering.id, offering.status)
    }

    const allOfferingIds = offerings.map((o) => o.id)
    const [summaries, sessionCounts] = await Promise.all([
      allOfferingIds.length > 0
        ? this.database.prisma.analyticsStudentCourseSummary.findMany({
            where: { courseOfferingId: { in: allOfferingIds } },
            select: {
              courseOfferingId: true,
              studentId: true,
              totalSessions: true,
              presentSessions: true,
            },
          })
        : [],
      // Count finalized attendance sessions per teacher (= "classes taken")
      teacherIds.length > 0
        ? this.database.prisma.attendanceSession.groupBy({
            by: ["teacherId"],
            where: {
              teacherId: { in: teacherIds },
              status: { in: ["ENDED", "EXPIRED"] },
            },
            _count: true,
          })
        : [],
    ])

    const classesTakenByTeacher = new Map<string, number>()
    for (const row of sessionCounts) {
      classesTakenByTeacher.set(row.teacherId, row._count)
    }

    const summariesByOffering = new Map<
      string,
      Array<{ studentId: string; totalSessions: number; presentSessions: number }>
    >()
    for (const summary of summaries) {
      const list = summariesByOffering.get(summary.courseOfferingId) ?? []
      list.push(summary)
      summariesByOffering.set(summary.courseOfferingId, list)
    }

    const teacherSummaries: AdminRecordsTeacherSummary[] = teachers.map((teacher) => {
      const offeringIds = offeringIdsByTeacher.get(teacher.id) ?? []
      let activeCourseCount = 0
      let archivedCourseCount = 0
      const studentSet = new Set<string>()
      const aggregate: AggregateBucket = { totalSessions: 0, presentSessions: 0 }

      for (const offeringId of offeringIds) {
        const status = statusByOfferingId.get(offeringId)
        if (status === "ARCHIVED") {
          archivedCourseCount += 1
        } else if (status === "ACTIVE") {
          activeCourseCount += 1
        }
        for (const summary of summariesByOffering.get(offeringId) ?? []) {
          studentSet.add(summary.studentId)
          aggregate.totalSessions += summary.totalSessions
          aggregate.presentSessions += summary.presentSessions
        }
      }

      return {
        teacherId: teacher.id,
        displayName: teacher.displayName,
        employeeCode: teacher.teacherProfile?.employeeCode ?? null,
        department: teacher.teacherProfile?.department ?? trimmed,
        courseCount: offeringIds.length,
        activeCourseCount,
        archivedCourseCount,
        studentCount: studentSet.size,
        classesTaken: classesTakenByTeacher.get(teacher.id) ?? 0,
        averageAttendancePercent: computePercent(aggregate),
      }
    })

    return { department: trimmed, teachers: teacherSummaries }
  }

  // -------------------------------------------------------------------
  // Level 3: Courses owned by a teacher
  // -------------------------------------------------------------------
  async listCoursesByTeacher(teacherId: string): Promise<AdminRecordsCourseListResponse> {
    const teacher = await this.database.prisma.user.findFirst({
      where: {
        id: teacherId,
        roles: { some: { role: "TEACHER" } },
      },
      include: { teacherProfile: true },
    })

    if (!teacher) {
      throw new NotFoundException(`Teacher ${teacherId} not found.`)
    }

    const offerings = await this.database.prisma.courseOffering.findMany({
      where: { primaryTeacherId: teacherId },
      include: {
        semester: { select: { title: true } },
      },
      orderBy: [{ status: "asc" }, { code: "asc" }],
    })

    if (offerings.length === 0) {
      return {
        teacherId,
        teacherName: teacher.displayName,
        department: teacher.teacherProfile?.department ?? "",
        courses: [],
      }
    }

    const offeringIds = offerings.map((o) => o.id)

    const [summaries, lastSessions, recordCountsByOffering] = await Promise.all([
      this.database.prisma.analyticsStudentCourseSummary.findMany({
        where: { courseOfferingId: { in: offeringIds } },
        select: {
          courseOfferingId: true,
          studentId: true,
          totalSessions: true,
          presentSessions: true,
        },
      }),
      this.database.prisma.attendanceSession.groupBy({
        by: ["courseOfferingId"],
        where: { courseOfferingId: { in: offeringIds } },
        _max: { startedAt: true },
        _count: { _all: true },
      }),
      // Fallback: raw AttendanceRecord counts per course offering for when
      // the analytics summary table hasn't been populated yet.
      (async () => {
        const raw = await this.database.prisma.$queryRawUnsafe<
          Array<{ courseOfferingId: string; total: bigint; present: bigint; students: bigint }>
        >(
          `SELECT s."courseOfferingId", COUNT(*)::bigint AS total, COUNT(*) FILTER (WHERE r.status = 'PRESENT')::bigint AS present, COUNT(DISTINCT r."studentId")::bigint AS students FROM attendance_records r JOIN attendance_sessions s ON s.id = r."sessionId" WHERE s."courseOfferingId" = ANY($1) GROUP BY s."courseOfferingId"`,
          offeringIds,
        )
        const map = new Map<string, { total: number; present: number; students: number }>()
        for (const row of raw) {
          map.set(row.courseOfferingId, {
            total: Number(row.total),
            present: Number(row.present),
            students: Number(row.students),
          })
        }
        return map
      })(),
    ])

    const summariesByOffering = new Map<
      string,
      Array<{ studentId: string; totalSessions: number; presentSessions: number }>
    >()
    for (const s of summaries) {
      const list = summariesByOffering.get(s.courseOfferingId) ?? []
      list.push(s)
      summariesByOffering.set(s.courseOfferingId, list)
    }

    const sessionsMetaByOffering = new Map<
      string,
      { lastSessionAt: Date | null; sessionCount: number }
    >()
    for (const row of lastSessions) {
      sessionsMetaByOffering.set(row.courseOfferingId, {
        lastSessionAt: row._max.startedAt ?? null,
        sessionCount: row._count._all,
      })
    }

    const courses: AdminRecordsCourseSummary[] = offerings.map((offering) => {
      const offeringSummaries = summariesByOffering.get(offering.id) ?? []
      const studentSet = new Set<string>(offeringSummaries.map((s) => s.studentId))
      let aggregate: AggregateBucket = offeringSummaries.reduce(
        (acc, summary) => ({
          totalSessions: acc.totalSessions + summary.totalSessions,
          presentSessions: acc.presentSessions + summary.presentSessions,
        }),
        { totalSessions: 0, presentSessions: 0 },
      )

      // Fallback to raw AttendanceRecord counts when analytics is empty
      const rawFallback = recordCountsByOffering.get(offering.id)
      if (aggregate.totalSessions === 0 && rawFallback && rawFallback.total > 0) {
        aggregate = { totalSessions: rawFallback.total, presentSessions: rawFallback.present }
      }

      const effectiveStudentCount = studentSet.size > 0 ? studentSet.size : (rawFallback?.students ?? 0)
      const meta = sessionsMetaByOffering.get(offering.id)

      return {
        courseOfferingId: offering.id,
        code: offering.code,
        displayTitle: offering.displayTitle,
        status: offering.status,
        isArchived: offering.status === "ARCHIVED",
        primaryTeacherId: offering.primaryTeacherId,
        primaryTeacherName: teacher.displayName,
        studentCount: effectiveStudentCount,
        sessionsConductedCount: meta?.sessionCount ?? 0,
        averageAttendancePercent: computePercent(aggregate),
        lastSessionAt: meta?.lastSessionAt?.toISOString() ?? null,
        semesterLabel: offering.semester?.title ?? null,
      }
    })

    return {
      teacherId,
      teacherName: teacher.displayName,
      department: teacher.teacherProfile?.department ?? "",
      courses,
    }
  }

  // -------------------------------------------------------------------
  // Level 4: Students enrolled in a course offering
  // -------------------------------------------------------------------
  async listStudentsInCourse(courseOfferingId: string): Promise<AdminRecordsStudentListResponse> {
    const offering = await this.database.prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      select: {
        id: true,
        code: true,
        displayTitle: true,
        status: true,
      },
    })

    if (!offering) {
      throw new NotFoundException(`Course offering ${courseOfferingId} not found.`)
    }

    const enrollments = await this.database.prisma.enrollment.findMany({
      where: {
        courseOfferingId,
        status: "ACTIVE",
      },
      include: {
        student: {
          include: {
            studentProfile: true,
          },
        },
      },
      orderBy: { studentId: "asc" },
    })

    const studentIds = enrollments.map((e) => e.studentId)
    const [summaries, totalSessionsConducted, activeJoinCode, lastSession] = await Promise.all([
      studentIds.length > 0
        ? this.database.prisma.analyticsStudentCourseSummary.findMany({
            where: {
              courseOfferingId,
              studentId: { in: studentIds },
            },
            select: {
              studentId: true,
              totalSessions: true,
              presentSessions: true,
              lastSessionAt: true,
            },
          })
        : [],
      this.database.prisma.attendanceSession.count({
        where: {
          courseOfferingId,
          status: { in: ["ENDED", "EXPIRED"] },
        },
      }),
      this.database.prisma.classroomJoinCode.findFirst({
        where: { courseOfferingId, status: "ACTIVE" },
        select: { code: true },
        orderBy: { createdAt: "desc" },
      }),
      this.database.prisma.attendanceSession.findFirst({
        where: {
          courseOfferingId,
          status: { in: ["ENDED", "EXPIRED"] },
        },
        select: { endedAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ])

    const summaryByStudent = new Map<
      string,
      { totalSessions: number; presentSessions: number; lastSessionAt: Date | null }
    >()
    for (const s of summaries) {
      summaryByStudent.set(s.studentId, {
        totalSessions: s.totalSessions,
        presentSessions: s.presentSessions,
        lastSessionAt: s.lastSessionAt,
      })
    }

    const students: AdminRecordsStudentSummary[] = enrollments.map((enrollment) => {
      const summary = summaryByStudent.get(enrollment.studentId)
      const totalSessions = summary?.totalSessions ?? 0
      const presentSessions = summary?.presentSessions ?? 0
      const percent = computePercent({ totalSessions, presentSessions })
      return {
        studentId: enrollment.student.id,
        rollNumber: enrollment.student.studentProfile?.rollNumber ?? null,
        displayName: enrollment.student.displayName,
        email: enrollment.student.email,
        branch: enrollment.student.studentProfile?.branch ?? null,
        currentSemester: enrollment.student.studentProfile?.currentSemester ?? null,
        totalSessions,
        presentSessions,
        attendancePercent: percent,
        attendanceStatus: classifyAttendance(percent),
        attendanceDisabled: enrollment.student.studentProfile?.attendanceDisabled ?? false,
        lastSessionAt: summary?.lastSessionAt?.toISOString() ?? null,
      }
    })

    const aggregate: AggregateBucket = students.reduce(
      (acc, student) => ({
        totalSessions: acc.totalSessions + student.totalSessions,
        presentSessions: acc.presentSessions + student.presentSessions,
      }),
      { totalSessions: 0, presentSessions: 0 },
    )

    const lowAttendanceCount = students.filter((s) => s.attendanceStatus === "LOW").length

    return {
      courseOfferingId: offering.id,
      courseCode: offering.code,
      courseTitle: offering.displayTitle,
      status: offering.status,
      isArchived: offering.status === "ARCHIVED",
      studentCount: students.length,
      totalSessionsConducted,
      averageAttendancePercent: computePercent(aggregate),
      lowAttendanceCount,
      lowAttendanceThresholdPercent: LOW_ATTENDANCE_THRESHOLD_PERCENT,
      joinCode: activeJoinCode?.code ?? null,
      lastSessionAt: (lastSession?.endedAt ?? lastSession?.createdAt)?.toISOString() ?? null,
      students,
    }
  }

  // -------------------------------------------------------------------
  // Course-code search across all records
  // -------------------------------------------------------------------
  async searchCourses(
    query: AdminRecordsCourseSearchQuery,
  ): Promise<AdminRecordsCourseSearchResponse> {
    const trimmed = query.q.trim()
    if (!trimmed) {
      throw new BadRequestException("Search query must not be empty.")
    }
    const limit = query.limit ?? COURSE_SEARCH_DEFAULT_LIMIT

    const offerings = await this.database.prisma.courseOffering.findMany({
      where: {
        OR: [
          { code: { contains: trimmed, mode: "insensitive" } },
          { displayTitle: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      include: {
        primaryTeacher: {
          include: { teacherProfile: true },
        },
      },
      orderBy: { code: "asc" },
      take: limit,
    })

    const hits: AdminRecordsCourseSearchHit[] = offerings.map((offering) => ({
      courseOfferingId: offering.id,
      code: offering.code,
      displayTitle: offering.displayTitle,
      status: offering.status,
      primaryTeacherId: offering.primaryTeacherId,
      primaryTeacherName: offering.primaryTeacher?.displayName ?? "Unknown",
      department: offering.primaryTeacher?.teacherProfile?.department ?? null,
    }))

    return { query: trimmed, hits }
  }

  // -------------------------------------------------------------------
  // Archive / unarchive
  // -------------------------------------------------------------------
  async archiveCourse(
    auth: AuthRequestContext,
    courseOfferingId: string,
    request: AdminRecordsArchiveRequest,
  ): Promise<AdminRecordsArchiveResponse> {
    return this.toggleCourseStatus(auth, courseOfferingId, "ARCHIVE", request.reason)
  }

  async unarchiveCourse(
    auth: AuthRequestContext,
    courseOfferingId: string,
    request: AdminRecordsArchiveRequest,
  ): Promise<AdminRecordsArchiveResponse> {
    return this.toggleCourseStatus(auth, courseOfferingId, "UNARCHIVE", request.reason)
  }

  private async toggleCourseStatus(
    auth: AuthRequestContext,
    courseOfferingId: string,
    operation: "ARCHIVE" | "UNARCHIVE",
    reason: string | undefined,
  ): Promise<AdminRecordsArchiveResponse> {
    const offering = await this.database.prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      select: { id: true, status: true, primaryTeacherId: true },
    })

    if (!offering) {
      throw new NotFoundException(`Course offering ${courseOfferingId} not found.`)
    }

    const targetStatus = operation === "ARCHIVE" ? "ARCHIVED" : "ACTIVE"
    const actionType =
      operation === "ARCHIVE" ? "COURSE_OFFERING_ARCHIVE" : "COURSE_OFFERING_UNARCHIVE"

    if (offering.status === targetStatus) {
      // Idempotent: nothing to do.
      const fresh = await this.database.prisma.courseOffering.findUnique({
        where: { id: courseOfferingId },
        select: { id: true, status: true, updatedAt: true },
      })
      return {
        courseOfferingId: fresh?.id ?? courseOfferingId,
        status: fresh?.status ?? targetStatus,
        isArchived: targetStatus === "ARCHIVED",
        archivedAt: targetStatus === "ARCHIVED" ? (fresh?.updatedAt.toISOString() ?? null) : null,
      }
    }

    const updated = await runInTransaction(this.database.prisma, async (transaction) => {
      const next = await transaction.courseOffering.update({
        where: { id: courseOfferingId },
        data: { status: targetStatus },
        select: { id: true, status: true, updatedAt: true },
      })

      await transaction.adminActionLog.create({
        data: {
          adminUserId: auth.userId,
          targetCourseOfferingId: courseOfferingId,
          targetUserId: offering.primaryTeacherId,
          actionType,
          metadata: {
            previousStatus: offering.status,
            nextStatus: targetStatus,
            ...(reason ? { reason } : {}),
          },
        },
      })

      return next
    })

    return {
      courseOfferingId: updated.id,
      status: updated.status,
      isArchived: updated.status === "ARCHIVED",
      archivedAt: updated.status === "ARCHIVED" ? updated.updatedAt.toISOString() : null,
    }
  }
}
