import type { ApiEnv } from "@attendease/config"
import type { QueueHealthItem } from "@attendease/contracts"

import type { DatabaseService } from "../database/database.service.js"

import { analyticsOutboxTopics, announcementOutboxTopic } from "./health.service.queue.consts.js"

type HealthPrismaClient = DatabaseService["prisma"]

type QueueHealthInput = {
  prisma: HealthPrismaClient
  now: Date
  env: ApiEnv
}

function getQueueStatus(input: {
  queuedCount: number
  failedCount: number
  staleCount: number
  backlogThreshold: number
}) {
  if (input.staleCount > 0) {
    return "stalled"
  }

  if (input.failedCount > 0 || input.queuedCount > input.backlogThreshold) {
    return "backlogged"
  }

  return "healthy"
}

function getQueueStaleCutoff(now: Date, env: ApiEnv): Date {
  return new Date(now.getTime() - env.QUEUE_HEALTH_STALE_AFTER_MS)
}

export async function buildQueueHealthItems(input: QueueHealthInput): Promise<QueueHealthItem[]> {
  return Promise.all([
    buildExportQueueHealth(input),
    buildRosterImportQueueHealth(input),
    buildAnnouncementQueueHealth(input),
    buildAnalyticsQueueHealth(input),
    buildEmailDispatchQueueHealth(input),
  ])
}

async function buildExportQueueHealth(input: QueueHealthInput): Promise<QueueHealthItem> {
  const staleCutoff = getQueueStaleCutoff(input.now, input.env)
  const [queuedCount, processingCount, failedCount, staleCount, oldestQueued] = await Promise.all([
    input.prisma.exportJob.count({
      where: {
        status: "QUEUED",
      },
    }),
    input.prisma.exportJob.count({
      where: {
        status: "PROCESSING",
      },
    }),
    input.prisma.exportJob.count({
      where: {
        status: "FAILED",
      },
    }),
    input.prisma.exportJob.count({
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
    input.prisma.exportJob.findFirst({
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
  ])

  return {
    name: "exports",
    status: getQueueStatus({
      queuedCount,
      failedCount,
      staleCount,
      backlogThreshold: input.env.EXPORT_JOB_BATCH_SIZE * 3,
    }),
    queuedCount,
    processingCount,
    failedCount,
    staleCount,
    oldestQueuedAt: oldestQueued?.requestedAt.toISOString() ?? null,
  }
}

async function buildRosterImportQueueHealth(input: QueueHealthInput): Promise<QueueHealthItem> {
  const staleCutoff = getQueueStaleCutoff(input.now, input.env)
  const [queuedCount, processingCount, failedCount, staleCount, oldestQueued] = await Promise.all([
    input.prisma.rosterImportJob.count({
      where: {
        status: "UPLOADED",
      },
    }),
    input.prisma.rosterImportJob.count({
      where: {
        status: "PROCESSING",
      },
    }),
    input.prisma.rosterImportJob.count({
      where: {
        status: "FAILED",
      },
    }),
    input.prisma.rosterImportJob.count({
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
    input.prisma.rosterImportJob.findFirst({
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
  ])

  return {
    name: "roster-imports",
    status: getQueueStatus({
      queuedCount,
      failedCount,
      staleCount,
      backlogThreshold: input.env.ROSTER_IMPORT_BATCH_SIZE * 3,
    }),
    queuedCount,
    processingCount,
    failedCount,
    staleCount,
    oldestQueuedAt: oldestQueued?.createdAt.toISOString() ?? null,
  }
}

async function buildAnnouncementQueueHealth(input: QueueHealthInput): Promise<QueueHealthItem> {
  const staleCutoff = getQueueStaleCutoff(input.now, input.env)

  const [queuedCount, processingCount, failedCount, staleCount, oldestQueued] = await Promise.all([
    input.prisma.outboxEvent.count({
      where: {
        topic: announcementOutboxTopic,
        status: "PENDING",
      },
    }),
    input.prisma.outboxEvent.count({
      where: {
        topic: announcementOutboxTopic,
        status: "PROCESSING",
      },
    }),
    input.prisma.outboxEvent.count({
      where: {
        topic: announcementOutboxTopic,
        status: {
          in: ["FAILED", "DEAD_LETTER"],
        },
      },
    }),
    input.prisma.outboxEvent.count({
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
    input.prisma.outboxEvent.findFirst({
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
  ])

  return {
    name: "announcement-fanout",
    status: getQueueStatus({
      queuedCount,
      failedCount,
      staleCount,
      backlogThreshold: input.env.ANNOUNCEMENT_FANOUT_BATCH_SIZE * 3,
    }),
    queuedCount,
    processingCount,
    failedCount,
    staleCount,
    oldestQueuedAt: oldestQueued?.createdAt.toISOString() ?? null,
  }
}

async function buildAnalyticsQueueHealth(input: QueueHealthInput): Promise<QueueHealthItem> {
  const staleCutoff = getQueueStaleCutoff(input.now, input.env)

  const [queuedCount, processingCount, failedCount, staleCount, oldestQueued] = await Promise.all([
    input.prisma.outboxEvent.count({
      where: {
        topic: {
          in: [...analyticsOutboxTopics],
        },
        status: "PENDING",
      },
    }),
    input.prisma.outboxEvent.count({
      where: {
        topic: {
          in: [...analyticsOutboxTopics],
        },
        status: "PROCESSING",
      },
    }),
    input.prisma.outboxEvent.count({
      where: {
        topic: {
          in: [...analyticsOutboxTopics],
        },
        status: {
          in: ["FAILED", "DEAD_LETTER"],
        },
      },
    }),
    input.prisma.outboxEvent.count({
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
    input.prisma.outboxEvent.findFirst({
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
  ])

  return {
    name: "analytics-refresh",
    status: getQueueStatus({
      queuedCount,
      failedCount,
      staleCount,
      backlogThreshold: input.env.ANALYTICS_REFRESH_BATCH_SIZE * 3,
    }),
    queuedCount,
    processingCount,
    failedCount,
    staleCount,
    oldestQueuedAt: oldestQueued?.createdAt.toISOString() ?? null,
  }
}

async function buildEmailDispatchQueueHealth(input: QueueHealthInput): Promise<QueueHealthItem> {
  const staleCutoff = getQueueStaleCutoff(input.now, input.env)
  const [queuedCount, processingCount, failedCount, staleCount, oldestQueued] = await Promise.all([
    input.prisma.emailDispatchRun.count({
      where: {
        status: "QUEUED",
      },
    }),
    input.prisma.emailDispatchRun.count({
      where: {
        status: "PROCESSING",
      },
    }),
    input.prisma.emailDispatchRun.count({
      where: {
        status: "FAILED",
      },
    }),
    input.prisma.emailDispatchRun.count({
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
    input.prisma.emailDispatchRun.findFirst({
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
  ])

  return {
    name: "email-dispatch",
    status: getQueueStatus({
      queuedCount,
      failedCount,
      staleCount,
      backlogThreshold: input.env.EMAIL_AUTOMATION_PROCESS_BATCH_SIZE * 3,
    }),
    queuedCount,
    processingCount,
    failedCount,
    staleCount,
    oldestQueuedAt: oldestQueued?.createdAt.toISOString() ?? null,
  }
}
