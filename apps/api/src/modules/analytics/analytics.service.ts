import type {
  AnalyticsClassComparisonRow,
  AnalyticsComparisonsResponse,
  AnalyticsDistributionResponse,
  AnalyticsFilters,
  AnalyticsModeUsageResponse,
  AnalyticsSessionDrilldownResponse,
  AnalyticsStudentTimelineParams,
  AnalyticsStudentTimelineResponse,
  AnalyticsSubjectComparisonRow,
  AnalyticsTrendResponse,
  AttendanceSessionParams,
} from "@attendease/contracts"
import type { Prisma } from "@attendease/db"
import {
  buildAttendanceDistribution,
  calculatePresentAttendancePercentage,
} from "@attendease/domain"
import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import { AttendanceHistoryService } from "../attendance/attendance-history.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { ReportsService } from "../reports/reports.service.js"
import {
  buildAnalyticsModeUsageResponse,
  buildAnalyticsTrendResponse,
  sumSessionDateKey,
  toAnalyticsStudentTimelineItem,
} from "./analytics.models.js"

const finalizedSessionStatuses = ["ENDED", "EXPIRED"] as const

type ResolvedAnalyticsFilters = AnalyticsFilters & {
  resolvedClassId?: string | undefined
  resolvedSectionId?: string | undefined
  resolvedSubjectId?: string | undefined
}

function normalizeDateFilter(input: string | undefined): Date | null {
  return input ? new Date(input) : null
}

function isWithinRange(value: Date, from: Date | null, to: Date | null) {
  if (from && value < from) {
    return false
  }

  if (to && value > to) {
    return false
  }

  return true
}

function getSessionActivityAt(session: {
  endedAt: Date | null
  startedAt: Date | null
  createdAt: Date
}): Date {
  return session.endedAt ?? session.startedAt ?? session.createdAt
}

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ReportsService) private readonly reportsService: ReportsService,
    @Inject(AttendanceHistoryService)
    private readonly attendanceHistoryService: AttendanceHistoryService,
  ) {}

  async getTrendAnalytics(
    auth: AuthRequestContext,
    filters: AnalyticsFilters,
  ): Promise<AnalyticsTrendResponse> {
    const resolvedFilters = await this.resolveFilters(auth, filters)
    const [dailyRows, sessions] = await Promise.all([
      this.database.prisma.analyticsDailyAttendance.findMany({
        where: {
          attendanceDate: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
          },
          courseOffering: {
            ...this.buildCourseOfferingWhere(auth, resolvedFilters),
          },
        },
        orderBy: {
          attendanceDate: "asc",
        },
      }),
      this.database.prisma.attendanceSession.findMany({
        where: {
          ...this.buildAttendanceSessionWhere(auth, resolvedFilters),
          status: {
            in: [...finalizedSessionStatuses],
          },
        },
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          createdAt: true,
        },
      }),
    ])

    const fromDate = normalizeDateFilter(filters.from)
    const toDate = normalizeDateFilter(filters.to)
    const sessionCounts = new Map<string, number>()

    for (const session of sessions) {
      const activityAt = getSessionActivityAt(session)

      if (!isWithinRange(activityAt, fromDate, toDate)) {
        continue
      }

      const key = sumSessionDateKey(session.endedAt, activityAt)
      sessionCounts.set(key, (sessionCounts.get(key) ?? 0) + 1)
    }

    return buildAnalyticsTrendResponse(
      dailyRows.map((row) => {
        const dateKey = row.attendanceDate.toISOString().slice(0, 10)

        return {
          attendanceDate: row.attendanceDate,
          sessionCount: sessionCounts.get(dateKey) ?? 0,
          totalStudents: row.totalStudents,
          presentCount: row.presentCount,
          absentCount: row.absentCount,
        }
      }),
    )
  }

  async getDistributionAnalytics(
    auth: AuthRequestContext,
    filters: AnalyticsFilters,
  ): Promise<AnalyticsDistributionResponse> {
    await this.reportsService.assertTeacherReportAccess(auth, filters)
    const rows = await this.reportsService.listTeacherStudentPercentageReport(auth, filters)

    return {
      totalStudents: rows.length,
      buckets: buildAttendanceDistribution(rows.map((row) => row.attendancePercentage)),
    }
  }

  async getComparisonsAnalytics(
    auth: AuthRequestContext,
    filters: AnalyticsFilters,
  ): Promise<AnalyticsComparisonsResponse> {
    const resolvedFilters = await this.resolveFilters(auth, filters)
    const allowedTeacherSubjectScopes =
      auth.activeRole === "TEACHER"
        ? await this.database.prisma.teacherAssignment.findMany({
            where: {
              teacherId: auth.userId,
              status: "ACTIVE",
              ...(resolvedFilters.resolvedClassId
                ? { classId: resolvedFilters.resolvedClassId }
                : {}),
              ...(resolvedFilters.resolvedSectionId
                ? { sectionId: resolvedFilters.resolvedSectionId }
                : {}),
              ...(resolvedFilters.resolvedSubjectId
                ? { subjectId: resolvedFilters.resolvedSubjectId }
                : {}),
            },
            select: {
              semesterId: true,
              classId: true,
              sectionId: true,
              subjectId: true,
            },
          })
        : []
    const [classroomRows, subjectRows] = await Promise.all([
      this.database.prisma.analyticsDailyAttendance.findMany({
        where: {
          attendanceDate: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
          },
          courseOffering: {
            ...this.buildCourseOfferingWhere(auth, resolvedFilters),
          },
        },
        include: {
          courseOffering: {
            select: {
              id: true,
              code: true,
              displayTitle: true,
            },
          },
        },
      }),
      this.database.prisma.analyticsSubjectAttendance.findMany({
        where: {
          snapshotDate: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
          },
          ...(resolvedFilters.resolvedClassId ? { classId: resolvedFilters.resolvedClassId } : {}),
          ...(resolvedFilters.resolvedSectionId
            ? { sectionId: resolvedFilters.resolvedSectionId }
            : {}),
          ...(resolvedFilters.resolvedSubjectId
            ? { subjectId: resolvedFilters.resolvedSubjectId }
            : {}),
          ...(auth.activeRole === "TEACHER"
            ? {
                OR: allowedTeacherSubjectScopes.map((scope) => ({
                  semesterId: scope.semesterId,
                  classId: scope.classId,
                  sectionId: scope.sectionId,
                  subjectId: scope.subjectId,
                })),
              }
            : {}),
        },
        include: {
          subject: {
            select: {
              id: true,
              code: true,
              title: true,
            },
          },
        },
      }),
    ])

    const classroomsMap = new Map<string, AnalyticsClassComparisonRow>()

    for (const row of classroomRows) {
      const current = classroomsMap.get(row.courseOfferingId) ?? {
        classroomId: row.courseOffering.id,
        classroomCode: row.courseOffering.code,
        classroomDisplayTitle: row.courseOffering.displayTitle,
        totalSessions: 0,
        presentCount: 0,
        absentCount: 0,
        attendancePercentage: 0,
      }

      current.totalSessions += 1
      current.presentCount += row.presentCount
      current.absentCount += row.absentCount
      current.attendancePercentage = calculatePresentAttendancePercentage({
        presentCount: current.presentCount,
        absentCount: current.absentCount,
      })
      classroomsMap.set(row.courseOfferingId, current)
    }

    const subjectsMap = new Map<string, AnalyticsSubjectComparisonRow>()

    for (const row of subjectRows) {
      const current = subjectsMap.get(row.subjectId) ?? {
        subjectId: row.subject.id,
        subjectCode: row.subject.code,
        subjectTitle: row.subject.title,
        totalSessions: 0,
        presentCount: 0,
        absentCount: 0,
        attendancePercentage: 0,
      }

      current.totalSessions += row.totalSessions
      current.presentCount += row.presentCount
      current.absentCount += row.absentCount
      current.attendancePercentage = calculatePresentAttendancePercentage({
        presentCount: current.presentCount,
        absentCount: current.absentCount,
      })
      subjectsMap.set(row.subjectId, current)
    }

    return {
      classrooms: [...classroomsMap.values()].sort((left, right) =>
        left.classroomCode.localeCompare(right.classroomCode),
      ),
      subjects: [...subjectsMap.values()].sort((left, right) =>
        left.subjectCode.localeCompare(right.subjectCode),
      ),
    }
  }

  async getModeUsageAnalytics(
    auth: AuthRequestContext,
    filters: AnalyticsFilters,
  ): Promise<AnalyticsModeUsageResponse> {
    const resolvedFilters = await this.resolveFilters(auth, filters)
    const rows = await this.database.prisma.analyticsModeUsageDaily.findMany({
      where: {
        usageDate: {
          ...(filters.from ? { gte: new Date(filters.from) } : {}),
          ...(filters.to ? { lte: new Date(filters.to) } : {}),
        },
        courseOffering: {
          ...this.buildCourseOfferingWhere(auth, resolvedFilters),
        },
      },
      orderBy: [{ usageDate: "asc" }, { mode: "asc" }],
    })

    return buildAnalyticsModeUsageResponse(
      rows.map((row) => ({
        usageDate: row.usageDate,
        mode: row.mode,
        sessionCount: row.sessionCount,
        markedCount: row.markedCount,
      })),
    )
  }

  async getStudentTimeline(
    auth: AuthRequestContext,
    params: AnalyticsStudentTimelineParams,
    filters: AnalyticsFilters,
  ): Promise<AnalyticsStudentTimelineResponse> {
    const resolvedFilters = await this.resolveFilters(auth, filters)
    await this.ensureStudentTimelineAccess(auth, params.studentId, resolvedFilters)

    const fromDate = normalizeDateFilter(filters.from)
    const toDate = normalizeDateFilter(filters.to)
    const records = await this.database.prisma.attendanceRecord.findMany({
      where: {
        studentId: params.studentId,
        session: {
          ...this.buildAttendanceSessionWhere(auth, resolvedFilters),
          status: {
            in: [...finalizedSessionStatuses],
          },
        },
      },
      include: {
        session: {
          include: {
            courseOffering: {
              select: {
                id: true,
                code: true,
                displayTitle: true,
              },
            },
            subject: {
              select: {
                id: true,
                code: true,
                title: true,
              },
            },
            lecture: {
              select: {
                id: true,
                title: true,
                lectureDate: true,
              },
            },
          },
        },
      },
    })

    return records
      .filter((record) => isWithinRange(getSessionActivityAt(record.session), fromDate, toDate))
      .sort(
        (left, right) =>
          getSessionActivityAt(right.session).getTime() -
          getSessionActivityAt(left.session).getTime(),
      )
      .map((record) =>
        toAnalyticsStudentTimelineItem({
          sessionId: record.sessionId,
          classroomId: record.session.courseOffering.id,
          classroomCode: record.session.courseOffering.code,
          classroomDisplayTitle: record.session.courseOffering.displayTitle,
          subjectId: record.session.subject.id,
          subjectCode: record.session.subject.code,
          subjectTitle: record.session.subject.title,
          lectureId: record.session.lecture?.id ?? null,
          lectureTitle: record.session.lecture?.title ?? null,
          lectureDate: record.session.lecture?.lectureDate ?? null,
          mode: record.session.mode,
          sessionStatus: record.session.status,
          attendanceStatus: record.status,
          markedAt: record.markedAt,
          startedAt: record.session.startedAt,
          endedAt: record.session.endedAt,
        }),
      )
  }

  async getSessionDrilldown(
    auth: AuthRequestContext,
    params: AttendanceSessionParams,
  ): Promise<AnalyticsSessionDrilldownResponse> {
    const [session, students] = await Promise.all([
      this.attendanceHistoryService.getSessionDetail(auth, params),
      this.attendanceHistoryService.listSessionStudents(auth, params),
    ])

    return {
      session,
      students,
    }
  }

  private async resolveFilters(
    auth: AuthRequestContext,
    filters: AnalyticsFilters,
  ): Promise<ResolvedAnalyticsFilters> {
    await this.reportsService.assertTeacherReportAccess(auth, filters)

    if (!filters.classroomId) {
      return {
        ...filters,
        resolvedClassId: filters.classId,
        resolvedSectionId: filters.sectionId,
        resolvedSubjectId: filters.subjectId,
      }
    }

    const classroom = await this.database.prisma.courseOffering.findUnique({
      where: {
        id: filters.classroomId,
      },
      select: {
        classId: true,
        sectionId: true,
        subjectId: true,
      },
    })

    if (!classroom) {
      throw new NotFoundException("Course offering not found.")
    }

    return {
      ...filters,
      resolvedClassId: filters.classId ?? classroom.classId,
      resolvedSectionId: filters.sectionId ?? classroom.sectionId,
      resolvedSubjectId: filters.subjectId ?? classroom.subjectId,
    }
  }

  private buildCourseOfferingWhere(
    auth: AuthRequestContext,
    filters: ResolvedAnalyticsFilters,
  ): Prisma.CourseOfferingWhereInput {
    return {
      ...(auth.activeRole === "TEACHER" ? { primaryTeacherId: auth.userId } : {}),
      ...(filters.classroomId ? { id: filters.classroomId } : {}),
      ...(filters.resolvedClassId ? { classId: filters.resolvedClassId } : {}),
      ...(filters.resolvedSectionId ? { sectionId: filters.resolvedSectionId } : {}),
      ...(filters.resolvedSubjectId ? { subjectId: filters.resolvedSubjectId } : {}),
    }
  }

  private buildAttendanceSessionWhere(
    auth: AuthRequestContext,
    filters: ResolvedAnalyticsFilters,
  ): Prisma.AttendanceSessionWhereInput {
    return {
      ...(auth.activeRole === "TEACHER" ? { teacherId: auth.userId } : {}),
      ...(filters.classroomId ? { courseOfferingId: filters.classroomId } : {}),
      ...(filters.resolvedClassId ? { classId: filters.resolvedClassId } : {}),
      ...(filters.resolvedSectionId ? { sectionId: filters.resolvedSectionId } : {}),
      ...(filters.resolvedSubjectId ? { subjectId: filters.resolvedSubjectId } : {}),
    }
  }

  private async ensureStudentTimelineAccess(
    auth: AuthRequestContext,
    studentId: string,
    filters: ResolvedAnalyticsFilters,
  ) {
    const accessibleEnrollment = await this.database.prisma.enrollment.findFirst({
      where: {
        studentId,
        ...(filters.classroomId ? { courseOfferingId: filters.classroomId } : {}),
        ...(filters.resolvedClassId ? { classId: filters.resolvedClassId } : {}),
        ...(filters.resolvedSectionId ? { sectionId: filters.resolvedSectionId } : {}),
        ...(filters.resolvedSubjectId ? { subjectId: filters.resolvedSubjectId } : {}),
        ...(auth.activeRole === "TEACHER"
          ? {
              courseOffering: {
                primaryTeacherId: auth.userId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    })

    if (accessibleEnrollment) {
      return
    }

    if (auth.activeRole === "TEACHER") {
      throw new ForbiddenException("The teacher cannot access analytics for the requested student.")
    }

    throw new NotFoundException("Student analytics were not found.")
  }
}
