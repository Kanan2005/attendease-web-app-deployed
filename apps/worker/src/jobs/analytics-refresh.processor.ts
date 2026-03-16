import type { createPrismaClient } from "@attendease/db"
import { Prisma } from "@attendease/db"
import { calculateAttendancePercentage } from "@attendease/domain"

type WorkerPrismaClient = ReturnType<typeof createPrismaClient>

const analyticsTopics = new Set([
  "analytics.attendance.refresh",
  "attendance.session.ended",
  "attendance.session.expired",
  "attendance.session.edited",
])

const finalizedSessionStatuses = ["ENDED", "EXPIRED"] as const
const summaryEnrollmentStatuses = ["ACTIVE", "PENDING", "BLOCKED"] as const

type SessionAggregateInput = {
  id: string
  courseOfferingId: string
  semesterId: string
  classId: string
  sectionId: string
  subjectId: string
  mode: "QR_GPS" | "BLUETOOTH" | "MANUAL"
  rosterSnapshotCount: number
  presentCount: number
  absentCount: number
  startedAt: Date | null
  endedAt: Date | null
  createdAt: Date
}

function getSessionActivityAt(session: {
  endedAt: Date | null
  startedAt: Date | null
  createdAt: Date
}): Date {
  return session.endedAt ?? session.startedAt ?? session.createdAt
}

function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function toDateKey(date: Date): string {
  return toDateOnly(date).toISOString().slice(0, 10)
}

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

    const dailyRows = this.buildDailyAttendanceRows(courseSessions)
    const modeRows = this.buildModeUsageRows(courseSessions)
    const studentSummaries = this.buildStudentSummaryRows(
      courseOfferingId,
      enrollments,
      attendanceRecords,
    )
    const subjectRows = this.buildSubjectAttendanceRows(scopeSessions)

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

  private buildDailyAttendanceRows(sessions: readonly SessionAggregateInput[]) {
    const buckets = new Map<
      string,
      {
        attendanceDate: Date
        totalStudents: number
        presentCount: number
        absentCount: number
      }
    >()

    for (const session of sessions) {
      const attendanceDate = toDateOnly(getSessionActivityAt(session))
      const key = toDateKey(attendanceDate)
      const current = buckets.get(key) ?? {
        attendanceDate,
        totalStudents: 0,
        presentCount: 0,
        absentCount: 0,
      }

      current.totalStudents += session.rosterSnapshotCount
      current.presentCount += session.presentCount
      current.absentCount += session.absentCount
      buckets.set(key, current)
    }

    return [...buckets.values()].map((row) => ({
      courseOfferingId: sessions[0]?.courseOfferingId ?? "",
      attendanceDate: row.attendanceDate,
      totalStudents: row.totalStudents,
      presentCount: row.presentCount,
      absentCount: row.absentCount,
      attendanceRate: new Prisma.Decimal(
        calculateAttendancePercentage({
          presentCount: row.presentCount,
          totalCount: row.presentCount + row.absentCount,
        }),
      ),
    }))
  }

  private buildModeUsageRows(sessions: readonly SessionAggregateInput[]) {
    const buckets = new Map<
      string,
      {
        usageDate: Date
        mode: SessionAggregateInput["mode"]
        sessionCount: number
        markedCount: number
      }
    >()

    for (const session of sessions) {
      const usageDate = toDateOnly(getSessionActivityAt(session))
      const key = `${toDateKey(usageDate)}:${session.mode}`
      const current = buckets.get(key) ?? {
        usageDate,
        mode: session.mode,
        sessionCount: 0,
        markedCount: 0,
      }

      current.sessionCount += 1
      current.markedCount += session.presentCount
      buckets.set(key, current)
    }

    return [...buckets.values()].map((row) => ({
      courseOfferingId: sessions[0]?.courseOfferingId ?? "",
      usageDate: row.usageDate,
      mode: row.mode,
      sessionCount: row.sessionCount,
      markedCount: row.markedCount,
    }))
  }

  private buildStudentSummaryRows(
    courseOfferingId: string,
    enrollments: readonly { studentId: string }[],
    records: readonly {
      studentId: string
      status: "PRESENT" | "ABSENT"
      session: {
        endedAt: Date | null
        startedAt: Date | null
        createdAt: Date
      }
    }[],
  ) {
    const summaries = new Map<
      string,
      {
        totalSessions: number
        presentSessions: number
        absentSessions: number
        lastSessionAt: Date | null
      }
    >()

    for (const enrollment of enrollments) {
      summaries.set(enrollment.studentId, {
        totalSessions: 0,
        presentSessions: 0,
        absentSessions: 0,
        lastSessionAt: null,
      })
    }

    for (const record of records) {
      const current = summaries.get(record.studentId) ?? {
        totalSessions: 0,
        presentSessions: 0,
        absentSessions: 0,
        lastSessionAt: null,
      }
      const activityAt = getSessionActivityAt(record.session)

      current.totalSessions += 1
      if (record.status === "PRESENT") {
        current.presentSessions += 1
      } else {
        current.absentSessions += 1
      }
      if (!current.lastSessionAt || activityAt > current.lastSessionAt) {
        current.lastSessionAt = activityAt
      }
      summaries.set(record.studentId, current)
    }

    return [...summaries.entries()].map(([studentId, summary]) => ({
      courseOfferingId,
      studentId,
      totalSessions: summary.totalSessions,
      presentSessions: summary.presentSessions,
      absentSessions: summary.absentSessions,
      attendancePercentage: new Prisma.Decimal(
        calculateAttendancePercentage({
          presentCount: summary.presentSessions,
          totalCount: summary.totalSessions,
        }),
      ),
      lastSessionAt: summary.lastSessionAt,
    }))
  }

  private buildSubjectAttendanceRows(sessions: readonly SessionAggregateInput[]) {
    const buckets = new Map<
      string,
      {
        semesterId: string
        classId: string
        sectionId: string
        subjectId: string
        snapshotDate: Date
        totalStudents: number
        totalSessions: number
        presentCount: number
        absentCount: number
      }
    >()

    for (const session of sessions) {
      const snapshotDate = toDateOnly(getSessionActivityAt(session))
      const key = `${session.semesterId}:${session.classId}:${session.sectionId}:${session.subjectId}:${toDateKey(
        snapshotDate,
      )}`
      const current = buckets.get(key) ?? {
        semesterId: session.semesterId,
        classId: session.classId,
        sectionId: session.sectionId,
        subjectId: session.subjectId,
        snapshotDate,
        totalStudents: 0,
        totalSessions: 0,
        presentCount: 0,
        absentCount: 0,
      }

      current.totalStudents += session.rosterSnapshotCount
      current.totalSessions += 1
      current.presentCount += session.presentCount
      current.absentCount += session.absentCount
      buckets.set(key, current)
    }

    return [...buckets.values()].map((row) => ({
      semesterId: row.semesterId,
      classId: row.classId,
      sectionId: row.sectionId,
      subjectId: row.subjectId,
      snapshotDate: row.snapshotDate,
      totalStudents: row.totalStudents,
      totalSessions: row.totalSessions,
      presentCount: row.presentCount,
      absentCount: row.absentCount,
      averageAttendanceRate: new Prisma.Decimal(
        calculateAttendancePercentage({
          presentCount: row.presentCount,
          totalCount: row.presentCount + row.absentCount,
        }),
      ),
    }))
  }
}
