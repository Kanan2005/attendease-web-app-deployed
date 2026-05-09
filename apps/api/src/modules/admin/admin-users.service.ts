import type {
  AdminUsersAttendanceToggleRequest,
  AdminUsersStudentListQuery,
  AdminUsersStudentListResponse,
  AdminUsersStudentProfile,
  AdminUsersTeacherListQuery,
  AdminUsersTeacherListResponse,
  AdminUsersTeacherProfile,
} from "@attendease/contracts"
import { runInTransaction } from "@attendease/db"
import { Inject, Injectable, NotFoundException } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"

const LOW_ATTENDANCE_THRESHOLD_PERCENT = 75

type CourseOfferingLite = {
  id: string
  code: string
  displayTitle: string
  status: "DRAFT" | "ACTIVE" | "ARCHIVED" | "COMPLETED"
  primaryTeacherId: string
}

@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}

  // -------------------------------------------------------------------
  // Students — list with filters
  // -------------------------------------------------------------------
  async listStudents(filters: AdminUsersStudentListQuery): Promise<AdminUsersStudentListResponse> {
    const where = {
      roles: { some: { role: "STUDENT" as const } },
      ...(filters.query
        ? {
            OR: [
              { displayName: { contains: filters.query, mode: "insensitive" as const } },
              { email: { contains: filters.query, mode: "insensitive" as const } },
              {
                studentProfile: {
                  rollNumber: { contains: filters.query, mode: "insensitive" as const },
                },
              },
            ],
          }
        : {}),
      ...(filters.degree ||
      filters.branch ||
      filters.currentSemester !== undefined ||
      filters.attendanceDisabled !== undefined
        ? {
            studentProfile: {
              ...(filters.degree ? { degree: filters.degree } : {}),
              ...(filters.branch ? { branch: filters.branch } : {}),
              ...(filters.currentSemester !== undefined
                ? { currentSemester: filters.currentSemester }
                : {}),
              ...(filters.attendanceDisabled !== undefined
                ? { attendanceDisabled: filters.attendanceDisabled }
                : {}),
            },
          }
        : {}),
    }

    const sectionFilter = filters.sectionId
      ? { enrollments: { some: { sectionId: filters.sectionId, status: "ACTIVE" as const } } }
      : {}

    const students = await this.database.prisma.user.findMany({
      where: { ...where, ...sectionFilter },
      include: { studentProfile: true },
      orderBy: { displayName: "asc" },
      take: filters.limit,
    })

    if (students.length === 0) {
      return {
        students: [],
        totalReturned: 0,
        lowAttendanceThresholdPercent: LOW_ATTENDANCE_THRESHOLD_PERCENT,
      }
    }

    // Aggregate attendance per student.
    const studentIds = students.map((s) => s.id)
    const summaries = await this.database.prisma.analyticsStudentCourseSummary.findMany({
      where: { studentId: { in: studentIds } },
    })

    const aggregateByStudent = new Map<
      string,
      { total: number; present: number; courses: number }
    >()
    for (const summary of summaries) {
      const existing = aggregateByStudent.get(summary.studentId) ?? {
        total: 0,
        present: 0,
        courses: 0,
      }
      existing.total += summary.totalSessions
      existing.present += summary.presentSessions
      existing.courses += 1
      aggregateByStudent.set(summary.studentId, existing)
    }

    return {
      students: students.map((student) => {
        const agg = aggregateByStudent.get(student.id) ?? { total: 0, present: 0, courses: 0 }
        return {
          studentId: student.id,
          displayName: student.displayName,
          email: student.email,
          rollNumber: student.studentProfile?.rollNumber ?? null,
          degree: student.studentProfile?.degree ?? null,
          branch: student.studentProfile?.branch ?? null,
          currentSemester: student.studentProfile?.currentSemester ?? null,
          enrollmentCount: agg.courses,
          totalSessions: agg.total,
          presentSessions: agg.present,
          attendancePercent: agg.total > 0 ? round1((agg.present / agg.total) * 100) : null,
          attendanceDisabled: student.studentProfile?.attendanceDisabled ?? false,
          accountStatus: student.status,
        }
      }),
      totalReturned: students.length,
      lowAttendanceThresholdPercent: LOW_ATTENDANCE_THRESHOLD_PERCENT,
    }
  }

  // -------------------------------------------------------------------
  // Students — single profile
  // -------------------------------------------------------------------
  async getStudentProfile(studentId: string): Promise<AdminUsersStudentProfile> {
    const student = await this.database.prisma.user.findFirst({
      where: { id: studentId, roles: { some: { role: "STUDENT" } } },
      include: { studentProfile: true },
    })

    if (!student) {
      throw new NotFoundException(`Student ${studentId} not found.`)
    }

    const summaries = await this.database.prisma.analyticsStudentCourseSummary.findMany({
      where: { studentId },
      include: {
        courseOffering: {
          select: {
            id: true,
            code: true,
            displayTitle: true,
            status: true,
            primaryTeacherId: true,
          },
        },
      },
      orderBy: { lastSessionAt: "desc" },
    })

    const teacherIds = [...new Set(summaries.map((s) => s.courseOffering.primaryTeacherId))]
    const teachers =
      teacherIds.length > 0
        ? await this.database.prisma.user.findMany({
            where: { id: { in: teacherIds } },
            select: { id: true, displayName: true },
          })
        : []
    const teacherNameById = new Map(teachers.map((t) => [t.id, t.displayName]))

    let overallTotal = 0
    let overallPresent = 0
    for (const s of summaries) {
      overallTotal += s.totalSessions
      overallPresent += s.presentSessions
    }

    return {
      studentId: student.id,
      displayName: student.displayName,
      email: student.email,
      rollNumber: student.studentProfile?.rollNumber ?? null,
      universityId: student.studentProfile?.universityId ?? null,
      programName: student.studentProfile?.programName ?? null,
      degree: student.studentProfile?.degree ?? null,
      branch: student.studentProfile?.branch ?? null,
      currentSemester: student.studentProfile?.currentSemester ?? null,
      parentEmail: student.studentProfile?.parentEmail ?? null,
      attendanceDisabled: student.studentProfile?.attendanceDisabled ?? false,
      accountStatus: student.status,
      createdAt: student.createdAt.toISOString(),
      overallTotalSessions: overallTotal,
      overallPresentSessions: overallPresent,
      overallAttendancePercent:
        overallTotal > 0 ? round1((overallPresent / overallTotal) * 100) : null,
      courses: summaries.map((s) => {
        const offering: CourseOfferingLite = {
          id: s.courseOffering.id,
          code: s.courseOffering.code,
          displayTitle: s.courseOffering.displayTitle,
          status: s.courseOffering.status,
          primaryTeacherId: s.courseOffering.primaryTeacherId,
        }
        return {
          courseOfferingId: offering.id,
          code: offering.code,
          displayTitle: offering.displayTitle,
          status: offering.status,
          isArchived: offering.status === "ARCHIVED",
          primaryTeacherName: teacherNameById.get(offering.primaryTeacherId) ?? "Unknown teacher",
          totalSessions: s.totalSessions,
          presentSessions: s.presentSessions,
          attendancePercent:
            s.totalSessions > 0 ? round1((s.presentSessions / s.totalSessions) * 100) : null,
          lastSessionAt: s.lastSessionAt ? s.lastSessionAt.toISOString() : null,
        }
      }),
    }
  }

  // -------------------------------------------------------------------
  // Students — toggle attendance disabled flag
  // -------------------------------------------------------------------
  async toggleStudentAttendance(
    auth: AuthRequestContext,
    studentId: string,
    nextDisabled: boolean,
    payload: AdminUsersAttendanceToggleRequest,
  ): Promise<AdminUsersStudentProfile> {
    const student = await this.database.prisma.user.findFirst({
      where: { id: studentId, roles: { some: { role: "STUDENT" } } },
      include: { studentProfile: true },
    })

    if (!student) {
      throw new NotFoundException(`Student ${studentId} not found.`)
    }

    const previousDisabled = student.studentProfile?.attendanceDisabled ?? false

    if (previousDisabled !== nextDisabled) {
      await runInTransaction(this.database.prisma, async (transaction) => {
        await transaction.studentProfile.upsert({
          where: { userId: studentId },
          create: {
            userId: studentId,
            attendanceDisabled: nextDisabled,
          },
          update: { attendanceDisabled: nextDisabled },
        })

        await transaction.adminActionLog.create({
          data: {
            adminUserId: auth.userId,
            targetUserId: studentId,
            actionType: nextDisabled ? "STUDENT_ATTENDANCE_DISABLE" : "STUDENT_ATTENDANCE_ENABLE",
            metadata: {
              previousAttendanceDisabled: previousDisabled,
              nextAttendanceDisabled: nextDisabled,
              ...(payload.reason ? { reason: payload.reason } : {}),
            },
          },
        })
      })
    }

    return this.getStudentProfile(studentId)
  }

  // -------------------------------------------------------------------
  // Teachers — list with filters
  // -------------------------------------------------------------------
  async listTeachers(filters: AdminUsersTeacherListQuery): Promise<AdminUsersTeacherListResponse> {
    const where = {
      roles: { some: { role: "TEACHER" as const } },
      ...(filters.query
        ? {
            OR: [
              { displayName: { contains: filters.query, mode: "insensitive" as const } },
              { email: { contains: filters.query, mode: "insensitive" as const } },
              {
                teacherProfile: {
                  employeeCode: { contains: filters.query, mode: "insensitive" as const },
                },
              },
            ],
          }
        : {}),
      ...(filters.department ? { teacherProfile: { department: filters.department } } : {}),
    }

    const teachers = await this.database.prisma.user.findMany({
      where,
      include: { teacherProfile: true },
      orderBy: { displayName: "asc" },
      take: filters.limit,
    })

    if (teachers.length === 0) {
      return { teachers: [], totalReturned: 0 }
    }

    const teacherIds = teachers.map((t) => t.id)
    const offerings = await this.database.prisma.courseOffering.findMany({
      where: { primaryTeacherId: { in: teacherIds } },
      select: {
        id: true,
        primaryTeacherId: true,
        status: true,
      },
    })

    const offeringsByTeacher = groupBy(offerings, (o) => o.primaryTeacherId)

    const offeringIds = offerings.map((o) => o.id)
    const enrollmentCounts =
      offeringIds.length > 0
        ? await this.database.prisma.enrollment.groupBy({
            by: ["courseOfferingId"],
            where: {
              courseOfferingId: { in: offeringIds },
              status: "ACTIVE",
            },
            _count: { _all: true },
          })
        : []
    const studentCountByOffering = new Map(
      enrollmentCounts.map((row) => [row.courseOfferingId, row._count._all]),
    )

    return {
      teachers: teachers.map((teacher) => {
        const teacherOfferings = offeringsByTeacher.get(teacher.id) ?? []
        const studentCount = teacherOfferings.reduce(
          (sum, o) => sum + (studentCountByOffering.get(o.id) ?? 0),
          0,
        )
        return {
          teacherId: teacher.id,
          displayName: teacher.displayName,
          email: teacher.email,
          employeeCode: teacher.teacherProfile?.employeeCode ?? null,
          department: teacher.teacherProfile?.department ?? null,
          designation: teacher.teacherProfile?.designation ?? null,
          courseCount: teacherOfferings.length,
          activeCourseCount: teacherOfferings.filter((o) => o.status === "ACTIVE").length,
          archivedCourseCount: teacherOfferings.filter((o) => o.status === "ARCHIVED").length,
          studentCount,
          accountStatus: teacher.status,
        }
      }),
      totalReturned: teachers.length,
    }
  }

  // -------------------------------------------------------------------
  // Teachers — single profile
  // -------------------------------------------------------------------
  async getTeacherProfile(teacherId: string): Promise<AdminUsersTeacherProfile> {
    const teacher = await this.database.prisma.user.findFirst({
      where: { id: teacherId, roles: { some: { role: "TEACHER" } } },
      include: { teacherProfile: true },
    })

    if (!teacher) {
      throw new NotFoundException(`Teacher ${teacherId} not found.`)
    }

    const offerings = await this.database.prisma.courseOffering.findMany({
      where: { primaryTeacherId: teacherId },
      orderBy: { code: "asc" },
    })

    const offeringIds = offerings.map((o) => o.id)
    const [studentCountRows, sessionCountRows, summaries] =
      offeringIds.length > 0
        ? await Promise.all([
            this.database.prisma.enrollment.groupBy({
              by: ["courseOfferingId"],
              where: { courseOfferingId: { in: offeringIds }, status: "ACTIVE" },
              _count: { _all: true },
            }),
            this.database.prisma.attendanceSession.groupBy({
              by: ["courseOfferingId"],
              where: { courseOfferingId: { in: offeringIds }, status: "ENDED" },
              _count: { _all: true },
              _max: { startedAt: true },
            }),
            this.database.prisma.analyticsStudentCourseSummary.groupBy({
              by: ["courseOfferingId"],
              where: { courseOfferingId: { in: offeringIds } },
              _sum: { totalSessions: true, presentSessions: true },
            }),
          ])
        : [[], [], []]

    const studentByOffering = new Map(
      studentCountRows.map((r) => [r.courseOfferingId, r._count._all]),
    )
    const sessionByOffering = new Map(
      sessionCountRows.map((r) => [
        r.courseOfferingId,
        { count: r._count._all, lastAt: r._max.startedAt as Date | null },
      ]),
    )
    const summaryByOffering = new Map(
      summaries.map((s) => [
        s.courseOfferingId,
        {
          totalSessions: s._sum.totalSessions ?? 0,
          presentSessions: s._sum.presentSessions ?? 0,
        },
      ]),
    )

    let totalSessions = 0
    let totalPresent = 0
    for (const s of summaries) {
      totalSessions += s._sum.totalSessions ?? 0
      totalPresent += s._sum.presentSessions ?? 0
    }

    return {
      teacherId: teacher.id,
      displayName: teacher.displayName,
      email: teacher.email,
      employeeCode: teacher.teacherProfile?.employeeCode ?? null,
      department: teacher.teacherProfile?.department ?? null,
      designation: teacher.teacherProfile?.designation ?? null,
      accountStatus: teacher.status,
      createdAt: teacher.createdAt.toISOString(),
      courseCount: offerings.length,
      activeCourseCount: offerings.filter((o) => o.status === "ACTIVE").length,
      archivedCourseCount: offerings.filter((o) => o.status === "ARCHIVED").length,
      studentCount: [...studentByOffering.values()].reduce((a, b) => a + b, 0),
      averageAttendancePercent:
        totalSessions > 0 ? round1((totalPresent / totalSessions) * 100) : null,
      courses: offerings.map((offering) => {
        const summary = summaryByOffering.get(offering.id)
        const sessions = sessionByOffering.get(offering.id)
        return {
          courseOfferingId: offering.id,
          code: offering.code,
          displayTitle: offering.displayTitle,
          status: offering.status,
          isArchived: offering.status === "ARCHIVED",
          studentCount: studentByOffering.get(offering.id) ?? 0,
          sessionsConductedCount: sessions?.count ?? 0,
          averageAttendancePercent:
            summary && summary.totalSessions > 0
              ? round1((summary.presentSessions / summary.totalSessions) * 100)
              : null,
          lastSessionAt: sessions?.lastAt ? sessions.lastAt.toISOString() : null,
        }
      }),
    }
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function groupBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>()
  for (const item of items) {
    const key = keyOf(item)
    const bucket = out.get(key)
    if (bucket) {
      bucket.push(item)
    } else {
      out.set(key, [item])
    }
  }
  return out
}
