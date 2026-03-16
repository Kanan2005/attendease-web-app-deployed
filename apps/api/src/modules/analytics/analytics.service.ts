import type {
  AnalyticsComparisonsResponse,
  AnalyticsDistributionResponse,
  AnalyticsFilters,
  AnalyticsModeUsageResponse,
  AnalyticsSessionDrilldownResponse,
  AnalyticsStudentTimelineParams,
  AnalyticsStudentTimelineResponse,
  AnalyticsTrendResponse,
  AttendanceSessionParams,
} from "@attendease/contracts"
import { buildAttendanceDistribution } from "@attendease/domain"
import { Inject, Injectable } from "@nestjs/common"

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
import {
  buildAttendanceSessionWhere,
  buildComparisonsFromRows,
  buildCourseOfferingWhere,
  ensureStudentTimelineAccess,
  getSessionActivityAt,
  isWithinRange,
  normalizeDateFilter,
  resolveFilters,
} from "./analytics.service.helpers.js"

const finalizedSessionStatuses = ["ENDED", "EXPIRED"] as const

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
    const resolvedFilters = await resolveFilters({
      auth,
      filters,
      database: this.database,
      reportsService: this.reportsService,
    })
    const [dailyRows, sessions] = await Promise.all([
      this.database.prisma.analyticsDailyAttendance.findMany({
        where: {
          attendanceDate: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
          },
          courseOffering: {
            ...buildCourseOfferingWhere(auth, resolvedFilters),
          },
        },
        orderBy: {
          attendanceDate: "asc",
        },
      }),
      this.database.prisma.attendanceSession.findMany({
        where: {
          ...buildAttendanceSessionWhere(auth, resolvedFilters),
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
    const resolvedFilters = await resolveFilters({
      auth,
      filters,
      database: this.database,
      reportsService: this.reportsService,
    })
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
            ...buildCourseOfferingWhere(auth, resolvedFilters),
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

    return buildComparisonsFromRows({
      classroomRows,
      subjectRows,
    })
  }

  async getModeUsageAnalytics(
    auth: AuthRequestContext,
    filters: AnalyticsFilters,
  ): Promise<AnalyticsModeUsageResponse> {
    const resolvedFilters = await resolveFilters({
      auth,
      filters,
      database: this.database,
      reportsService: this.reportsService,
    })
    const rows = await this.database.prisma.analyticsModeUsageDaily.findMany({
      where: {
        usageDate: {
          ...(filters.from ? { gte: new Date(filters.from) } : {}),
          ...(filters.to ? { lte: new Date(filters.to) } : {}),
        },
        courseOffering: {
          ...buildCourseOfferingWhere(auth, resolvedFilters),
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
    const resolvedFilters = await resolveFilters({
      auth,
      filters,
      database: this.database,
      reportsService: this.reportsService,
    })
    await ensureStudentTimelineAccess({
      auth,
      studentId: params.studentId,
      filters: resolvedFilters,
      database: this.database,
    })

    const fromDate = normalizeDateFilter(filters.from)
    const toDate = normalizeDateFilter(filters.to)
    const records = await this.database.prisma.attendanceRecord.findMany({
      where: {
        studentId: params.studentId,
        session: {
          ...buildAttendanceSessionWhere(auth, resolvedFilters),
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
}
