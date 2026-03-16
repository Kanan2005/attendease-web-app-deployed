import type { createPrismaClient } from "@attendease/db"
import type { Prisma } from "@attendease/db"
import {
  type SessionAggregateInput,
  buildDailyAttendanceRows,
  buildModeUsageRows,
  buildStudentSummaryRows,
  buildSubjectAttendanceRows,
} from "./analytics-refresh.processor.builders.js"

type WorkerPrismaClient = ReturnType<typeof createPrismaClient>

const analyticsTopics = new Set([
  "analytics.attendance.refresh",
  "attendance.session.ended",
  "attendance.session.expired",
  "attendance.session.edited",
])

const finalizedSessionStatuses = ["ENDED", "EXPIRED"] as const
const summaryEnrollmentStatuses = ["ACTIVE", "PENDING", "BLOCKED"] as const

export class AnalyticsRefreshProcessor {
  constructor(
    private readonly prisma: WorkerPrismaClient,
    private readonly options: {
      stuckProcessingTimeoutMs?: number
    } = {},
  ) {}

  async processPendingEvents(limit = 20, now = new Date()): Promise<number> {
    const staleProcessingCutoff = new Date(
      now.getTime() - (this.options.stuckProcessingTimeoutMs ?? 15 * 60 * 1000),
    )
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        topic: {
          in: [...analyticsTopics],
        },
        OR: [
          {
            status: "PENDING",
          },
          {
            status: "PROCESSING",
            OR: [
              {
                lockedAt: null,
              },
              {
                lockedAt: {
                  lte: staleProcessingCutoff,
                },
              },
            ],
          },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
    })

    for (const event of events) {
      await this.processEvent(event.id)
    }

    return events.length
  }

  async processEvent(outboxEventId: string) {
    const event = await this.prisma.outboxEvent.findUnique({
      where: {
        id: outboxEventId,
      },
    })

    if (!event || !analyticsTopics.has(event.topic) || event.status === "PROCESSED") {
      return null
    }

    await this.prisma.outboxEvent.update({
      where: {
        id: event.id,
      },
      data: {
        status: "PROCESSING",
        lockedAt: new Date(),
        attemptCount: {
          increment: 1,
        },
        lastError: null,
      },
    })

    try {
      const courseOfferingId = await this.resolveCourseOfferingId(event)

      if (!courseOfferingId) {
        throw new Error("Analytics refresh event is missing course offering scope.")
      }

      await this.refreshCourseOfferingAnalytics(courseOfferingId)

      await this.prisma.outboxEvent.update({
        where: {
          id: event.id,
        },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
          lockedAt: null,
          lastError: null,
        },
      })

      return {
        courseOfferingId,
      }
    } catch (error) {
      await this.prisma.outboxEvent.update({
        where: {
          id: event.id,
        },
        data: {
          status: "FAILED",
          lockedAt: null,
          lastError: error instanceof Error ? error.message : "Analytics refresh failed.",
        },
      })

      throw error
    }
  }

  async refreshCourseOfferingAnalytics(courseOfferingId: string) {
    const courseOffering = await this.prisma.courseOffering.findUnique({
      where: {
        id: courseOfferingId,
      },
      select: {
        id: true,
        semesterId: true,
        classId: true,
        sectionId: true,
        subjectId: true,
      },
    })

    if (!courseOffering) {
      throw new Error("Course offering for analytics refresh could not be found.")
    }

    const [courseSessions, scopeSessions, attendanceRecords, enrollments] = await Promise.all([
      this.prisma.attendanceSession.findMany({
        where: {
          courseOfferingId,
          status: {
            in: [...finalizedSessionStatuses],
          },
        },
        select: {
          id: true,
          courseOfferingId: true,
          semesterId: true,
          classId: true,
          sectionId: true,
          subjectId: true,
          mode: true,
          rosterSnapshotCount: true,
          presentCount: true,
          absentCount: true,
          startedAt: true,
          endedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.attendanceSession.findMany({
        where: {
          semesterId: courseOffering.semesterId,
          classId: courseOffering.classId,
          sectionId: courseOffering.sectionId,
          subjectId: courseOffering.subjectId,
          status: {
            in: [...finalizedSessionStatuses],
          },
        },
        select: {
          id: true,
          courseOfferingId: true,
          semesterId: true,
          classId: true,
          sectionId: true,
          subjectId: true,
          mode: true,
          rosterSnapshotCount: true,
          presentCount: true,
          absentCount: true,
          startedAt: true,
          endedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.attendanceRecord.findMany({
        where: {
          enrollment: {
            courseOfferingId,
            status: {
              in: [...summaryEnrollmentStatuses],
            },
          },
          session: {
            courseOfferingId,
            status: {
              in: [...finalizedSessionStatuses],
            },
          },
        },
        select: {
          studentId: true,
          status: true,
          session: {
            select: {
              endedAt: true,
              startedAt: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.enrollment.findMany({
        where: {
          courseOfferingId,
          status: {
            in: [...summaryEnrollmentStatuses],
          },
        },
        select: {
          studentId: true,
        },
      }),
    ])

    const dailyRows = buildDailyAttendanceRows(courseSessions)
    const modeRows = buildModeUsageRows(courseSessions)
    const studentSummaries = buildStudentSummaryRows(
      courseOfferingId,
      enrollments,
      attendanceRecords,
    )
    const subjectRows = buildSubjectAttendanceRows(scopeSessions)

    await this.prisma.$transaction(async (transaction) => {
      await transaction.analyticsDailyAttendance.deleteMany({
        where: {
          courseOfferingId,
        },
      })
      await transaction.analyticsModeUsageDaily.deleteMany({
        where: {
          courseOfferingId,
        },
      })
      await transaction.analyticsStudentCourseSummary.deleteMany({
        where: {
          courseOfferingId,
        },
      })
      await transaction.analyticsSubjectAttendance.deleteMany({
        where: {
          semesterId: courseOffering.semesterId,
          classId: courseOffering.classId,
          sectionId: courseOffering.sectionId,
          subjectId: courseOffering.subjectId,
        },
      })

      if (dailyRows.length > 0) {
        await transaction.analyticsDailyAttendance.createMany({
          data: dailyRows,
        })
      }

      if (modeRows.length > 0) {
        await transaction.analyticsModeUsageDaily.createMany({
          data: modeRows,
        })
      }

      if (studentSummaries.length > 0) {
        await transaction.analyticsStudentCourseSummary.createMany({
          data: studentSummaries,
        })
      }

      if (subjectRows.length > 0) {
        await transaction.analyticsSubjectAttendance.createMany({
          data: subjectRows,
        })
      }
    })
  }

  private async resolveCourseOfferingId(event: {
    aggregateId: string
    payload: Prisma.JsonValue
    topic: string
  }): Promise<string | null> {
    const payload =
      typeof event.payload === "object" && event.payload !== null ? event.payload : null
    const payloadCourseOfferingId =
      payload && "courseOfferingId" in payload && typeof payload.courseOfferingId === "string"
        ? payload.courseOfferingId
        : null

    if (payloadCourseOfferingId) {
      return payloadCourseOfferingId
    }

    const payloadSessionId =
      payload && "sessionId" in payload && typeof payload.sessionId === "string"
        ? payload.sessionId
        : null
    const sessionId = payloadSessionId ?? event.aggregateId

    const session = await this.prisma.attendanceSession.findUnique({
      where: {
        id: sessionId,
      },
      select: {
        courseOfferingId: true,
      },
    })

    return session?.courseOfferingId ?? null
  }
}
