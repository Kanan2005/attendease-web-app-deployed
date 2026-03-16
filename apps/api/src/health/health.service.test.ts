import { describe, expect, it, vi } from "vitest"

import { HealthService } from "./health.service.js"

function createDatabaseMock() {
  return {
    prisma: {
      $queryRaw: vi.fn(),
      exportJob: {
        count: vi.fn().mockResolvedValue(0),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      rosterImportJob: {
        count: vi.fn().mockResolvedValue(0),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      outboxEvent: {
        count: vi.fn().mockResolvedValue(0),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      emailDispatchRun: {
        count: vi.fn().mockResolvedValue(0),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
  }
}

describe("HealthService", () => {
  it("reports degraded readiness when the database probe fails", async () => {
    const database = createDatabaseMock()
    database.prisma.$queryRaw.mockRejectedValue(new Error("database offline"))
    const service = new HealthService(
      {
        APP_VERSION: "0.1.0",
        FEATURE_BLUETOOTH_ATTENDANCE_ENABLED: false,
        FEATURE_EMAIL_AUTOMATION_ENABLED: true,
        FEATURE_STRICT_DEVICE_BINDING_MODE: "AUDIT",
      } as never,
      database as never,
    )

    const readiness = await service.getReadiness(new Date("2026-03-15T12:00:00.000Z"))

    expect(readiness.status).toBe("degraded")
    expect(readiness.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "database",
          status: "down",
          details: "database offline",
        }),
        expect.objectContaining({
          name: "feature-flags",
          status: "up",
          details: "bluetooth=off,automation=on,strictDeviceBinding=audit",
        }),
      ]),
    )
  })

  it("uses the shared queue-health stale threshold and reports backlog correctly", async () => {
    const database = createDatabaseMock()
    const service = new HealthService(
      {
        APP_VERSION: "0.1.0",
        FEATURE_BLUETOOTH_ATTENDANCE_ENABLED: true,
        FEATURE_EMAIL_AUTOMATION_ENABLED: true,
        FEATURE_STRICT_DEVICE_BINDING_MODE: "ENFORCE",
        QUEUE_HEALTH_STALE_AFTER_MS: 60_000,
        EXPORT_JOB_BATCH_SIZE: 2,
        ROSTER_IMPORT_BATCH_SIZE: 10,
        ANNOUNCEMENT_FANOUT_BATCH_SIZE: 10,
        ANALYTICS_REFRESH_BATCH_SIZE: 10,
        EMAIL_AUTOMATION_PROCESS_BATCH_SIZE: 10,
      } as never,
      database as never,
    )
    database.prisma.exportJob.count
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)

    const now = new Date("2026-03-15T12:00:00.000Z")
    const queueHealth = await service.getQueueHealth(now)

    expect(queueHealth.status).toBe("degraded")
    expect(queueHealth.queues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "exports",
          status: "backlogged",
          queuedCount: 7,
          processingCount: 1,
          failedCount: 0,
          staleCount: 0,
        }),
      ]),
    )
    expect(database.prisma.exportJob.count).toHaveBeenNthCalledWith(4, {
      where: {
        status: "PROCESSING",
        OR: [
          {
            startedAt: null,
          },
          {
            startedAt: {
              lte: new Date("2026-03-15T11:59:00.000Z"),
            },
          },
        ],
      },
    })
  })
})
