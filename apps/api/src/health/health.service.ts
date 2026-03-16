import type { ApiEnv } from "@attendease/config"
import {
  type ReadinessDependency,
  healthCheckResponseSchema,
  queueHealthResponseSchema,
  readinessCheckResponseSchema,
} from "@attendease/contracts"
import { Prisma } from "@attendease/db"
import { Inject, Injectable } from "@nestjs/common"

import { DatabaseService } from "../database/database.service.js"
import { API_ENV } from "../infrastructure/api-env.js"
import { buildQueueHealthItems } from "./health.service.queue.js"

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
    const queues = await buildQueueHealthItems({
      prisma: this.database.prisma,
      now,
      env: this.env,
    })

    const status = queues.some((queue) => queue.status !== "healthy") ? "degraded" : "healthy"

    return queueHealthResponseSchema.parse({
      service: "api",
      status,
      version: this.env.APP_VERSION,
      timestamp: now.toISOString(),
      queues,
    })
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
}
