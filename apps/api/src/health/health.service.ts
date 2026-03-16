import type { ApiEnv } from "@attendease/config"
import {
  type QueueHealthItem,
  type ReadinessDependency,
  healthCheckResponseSchema,
  queueHealthResponseSchema,
  readinessCheckResponseSchema,
} from "@attendease/contracts"
import { Prisma } from "@attendease/db"
import { Inject, Injectable } from "@nestjs/common"

import { DatabaseService } from "../database/database.service.js"
import { API_ENV } from "../infrastructure/api-env.js"

const announcementOutboxTopic = "classroom.announcement.posted"
const analyticsOutboxTopics = [
  "analytics.attendance.refresh",
  "attendance.session.ended",
  "attendance.session.expired",
  "attendance.session.edited",
] as const

function getQueueStatus(input: {
  queuedCount: number
  failedCount: number
  staleCount: number
  backlogThreshold: number
}): QueueHealthItem["status"] {
  if (input.staleCount > 0) {
    return "stalled"
  }

  if (input.failedCount > 0 || input.queuedCount > input.backlogThreshold) {
    return "backlogged"
  }

  return "healthy"
}

@Injectable()
export class HealthService {
  constructor(
    @Inject(API_ENV) private readonly env: ApiEnv,
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  getLiveness(now: Date = new Date()) {
    return healthCheckResponseSchema.parse({
      service: "api",
      status: "ok",
      version: this.env.APP_VERSION,
      timestamp: now.toISOString(),
    })
  }

  async getReadiness(now: Date = new Date()) {
    const checks = await Promise.all([
      this.checkDatabaseReadiness(),
      Promise.resolve(this.buildFeatureFlagReadiness()),
    ])

    const status = checks.every((check) => check.status === "up") ? "ready" : "degraded"

    return readinessCheckResponseSchema.parse({
      service: "api",
      status,
      version: this.env.APP_VERSION,
      timestamp: now.toISOString(),
      checks,
    })
  }

  async getQueueHealth(now: Date = new Date()) {
    const [exportQueue, rosterImportQueue, announcementQueue, analyticsQueue, emailDispatchQueue] =
      await Promise.all([
        this.buildExportQueueHealth(now),
        this.buildRosterImportQueueHealth(now),
        this.buildAnnouncementQueueHealth(now),
        this.buildAnalyticsQueueHealth(now),
        this.buildEmailDispatchQueueHealth(now),
      ])

    const queues = [
      exportQueue,
      rosterImportQueue,
      announcementQueue,
      analyticsQueue,
      emailDispatchQueue,
    ]
    const status = queues.some((queue) => queue.status !== "healthy") ? "degraded" : "healthy"

    return queueHealthResponseSchema.parse({
      service: "api",
      status,
      version: this.env.APP_VERSION,
      timestamp: now.toISOString(),
      queues,
    })
  }

  private getQueueStaleCutoff(now: Date): Date {
    return new Date(now.getTime() - this.env.QUEUE_HEALTH_STALE_AFTER_MS)
  }

  private async checkDatabaseReadiness(): Promise<ReadinessDependency> {
    const startedAt = Date.now()

    try {
      await this.database.prisma.$queryRaw(Prisma.sql`SELECT 1`)

      return {
        name: "database",
        status: "up",
        latencyMs: Date.now() - startedAt,
        details: null,
      }
    } catch (error) {
      return {
        name: "database",
        status: "down",
        latencyMs: Date.now() - startedAt,
        details: error instanceof Error ? error.message : "Database readiness check failed.",
      }
    }
  }

  private buildFeatureFlagReadiness(): ReadinessDependency {
    return {
      name: "feature-flags",
      status: "up",
      latencyMs: null,
      details: [
        `bluetooth=${this.env.FEATURE_BLUETOOTH_ATTENDANCE_ENABLED ? "on" : "off"}`,
        `automation=${this.env.FEATURE_EMAIL_AUTOMATION_ENABLED ? "on" : "off"}`,
        `strictDeviceBinding=${this.env.FEATURE_STRICT_DEVICE_BINDING_MODE.toLowerCase()}`,
      ].join(","),
    }
  }

  private async buildExportQueueHealth(now: Date): Promise<QueueHealthItem> {
    const staleCutoff = this.getQueueStaleCutoff(now)

    const [queuedCount, processingCount, failedCount, staleCount, oldestQueued] = await Promise.all(
      [
        this.database.prisma.exportJob.count({
          where: {
            status: "QUEUED",
          },
        }),
        this.database.prisma.exportJob.count({
          where: {
            status: "PROCESSING",
          },
        }),
        this.database.prisma.exportJob.count({
          where: {
            status: "FAILED",
          },
        }),
        this.database.prisma.exportJob.count({
          where: {
            status: "PROCESSING",
            OR: [
              {
                startedAt: null,
              },
              {
                startedAt: {
                  lte: staleCutoff,
                },
              },
            ],
          },
        }),
        this.database.prisma.exportJob.findFirst({
          where: {
            status: "QUEUED",
          },
          orderBy: {
            requestedAt: "asc",
          },
          select: {
            requestedAt: true,
          },
        }),
      ],
    )

    return {
      name: "exports",
      status: getQueueStatus({
        queuedCount,
        failedCount,
        staleCount,
        backlogThreshold: this.env.EXPORT_JOB_BATCH_SIZE * 3,
      }),
      queuedCount,
      processingCount,
      failedCount,
      staleCount,
      oldestQueuedAt: oldestQueued?.requestedAt.toISOString() ?? null,
    }
  }

  private async buildRosterImportQueueHealth(now: Date): Promise<QueueHealthItem> {
    const staleCutoff = this.getQueueStaleCutoff(now)

    const [queuedCount, processingCount, failedCount, staleCount, oldestQueued] = await Promise.all(
      [
        this.database.prisma.rosterImportJob.count({
          where: {
            status: "UPLOADED",
          },
        }),
        this.database.prisma.rosterImportJob.count({
          where: {
            status: "PROCESSING",
          },
        }),
        this.database.prisma.rosterImportJob.count({
          where: {
            status: "FAILED",
          },
        }),
        this.database.prisma.rosterImportJob.count({
          where: {
            status: "PROCESSING",
            OR: [
              {
                startedAt: null,
              },
              {
                startedAt: {
                  lte: staleCutoff,
                },
              },
            ],
          },
        }),
        this.database.prisma.rosterImportJob.findFirst({
          where: {
            status: "UPLOADED",
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            createdAt: true,
          },
        }),
      ],
    )

    return {
      name: "roster-imports",
      status: getQueueStatus({
        queuedCount,
        failedCount,
        staleCount,
        backlogThreshold: this.env.ROSTER_IMPORT_BATCH_SIZE * 3,
      }),
      queuedCount,
      processingCount,
      failedCount,
      staleCount,
      oldestQueuedAt: oldestQueued?.createdAt.toISOString() ?? null,
    }
  }

  private async buildAnnouncementQueueHealth(now: Date): Promise<QueueHealthItem> {
    const staleCutoff = this.getQueueStaleCutoff(now)

    const [queuedCount, processingCount, failedCount, staleCount, oldestQueued] = await Promise.all(
      [
        this.database.prisma.outboxEvent.count({
          where: {
            topic: announcementOutboxTopic,
            status: "PENDING",
          },
        }),
        this.database.prisma.outboxEvent.count({
          where: {
            topic: announcementOutboxTopic,
            status: "PROCESSING",
          },
        }),
        this.database.prisma.outboxEvent.count({
          where: {
            topic: announcementOutboxTopic,
            status: {
              in: ["FAILED", "DEAD_LETTER"],
            },
          },
        }),
        this.database.prisma.outboxEvent.count({
          where: {
            topic: announcementOutboxTopic,
            status: "PROCESSING",
            OR: [
              {
                lockedAt: null,
              },
              {
                lockedAt: {
                  lte: staleCutoff,
                },
              },
            ],
          },
        }),
        this.database.prisma.outboxEvent.findFirst({
          where: {
            topic: announcementOutboxTopic,
            status: "PENDING",
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            createdAt: true,
          },
        }),
      ],
    )

    return {
      name: "announcement-fanout",
      status: getQueueStatus({
        queuedCount,
        failedCount,
        staleCount,
        backlogThreshold: this.env.ANNOUNCEMENT_FANOUT_BATCH_SIZE * 3,
      }),
      queuedCount,
      processingCount,
      failedCount,
      staleCount,
      oldestQueuedAt: oldestQueued?.createdAt.toISOString() ?? null,
    }
  }

  private async buildAnalyticsQueueHealth(now: Date): Promise<QueueHealthItem> {
    const staleCutoff = this.getQueueStaleCutoff(now)

    const [queuedCount, processingCount, failedCount, staleCount, oldestQueued] = await Promise.all(
      [
        this.database.prisma.outboxEvent.count({
          where: {
            topic: {
              in: [...analyticsOutboxTopics],
            },
            status: "PENDING",
          },
        }),
        this.database.prisma.outboxEvent.count({
          where: {
            topic: {
              in: [...analyticsOutboxTopics],
            },
            status: "PROCESSING",
          },
        }),
        this.database.prisma.outboxEvent.count({
          where: {
            topic: {
              in: [...analyticsOutboxTopics],
            },
            status: {
              in: ["FAILED", "DEAD_LETTER"],
            },
          },
        }),
        this.database.prisma.outboxEvent.count({
          where: {
            topic: {
              in: [...analyticsOutboxTopics],
            },
            status: "PROCESSING",
            OR: [
              {
                lockedAt: null,
              },
              {
                lockedAt: {
                  lte: staleCutoff,
                },
              },
            ],
          },
        }),
        this.database.prisma.outboxEvent.findFirst({
          where: {
            topic: {
              in: [...analyticsOutboxTopics],
            },
            status: "PENDING",
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            createdAt: true,
          },
        }),
      ],
    )

    return {
      name: "analytics-refresh",
      status: getQueueStatus({
        queuedCount,
        failedCount,
        staleCount,
        backlogThreshold: this.env.ANALYTICS_REFRESH_BATCH_SIZE * 3,
      }),
      queuedCount,
      processingCount,
      failedCount,
      staleCount,
      oldestQueuedAt: oldestQueued?.createdAt.toISOString() ?? null,
    }
  }

  private async buildEmailDispatchQueueHealth(now: Date): Promise<QueueHealthItem> {
    const staleCutoff = this.getQueueStaleCutoff(now)

    const [queuedCount, processingCount, failedCount, staleCount, oldestQueued] = await Promise.all(
      [
        this.database.prisma.emailDispatchRun.count({
          where: {
            status: "QUEUED",
          },
        }),
        this.database.prisma.emailDispatchRun.count({
          where: {
            status: "PROCESSING",
          },
        }),
        this.database.prisma.emailDispatchRun.count({
          where: {
            status: "FAILED",
          },
        }),
        this.database.prisma.emailDispatchRun.count({
          where: {
            status: "PROCESSING",
            OR: [
              {
                startedAt: null,
              },
              {
                startedAt: {
                  lte: staleCutoff,
                },
              },
            ],
          },
        }),
        this.database.prisma.emailDispatchRun.findFirst({
          where: {
            status: "QUEUED",
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            createdAt: true,
          },
        }),
      ],
    )

    return {
      name: "email-dispatch",
      status: getQueueStatus({
        queuedCount,
        failedCount,
        staleCount,
        backlogThreshold: this.env.EMAIL_AUTOMATION_PROCESS_BATCH_SIZE * 3,
      }),
      queuedCount,
      processingCount,
      failedCount,
      staleCount,
      oldestQueuedAt: oldestQueued?.createdAt.toISOString() ?? null,
    }
  }
}
