import type { ApiEnv } from "@attendease/config"
import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common"
import Redis from "ioredis"

import type { AuthRequestContext } from "../modules/auth/auth.types.js"
import { API_ENV } from "./api-env.js"
import type { RateLimitPolicyName } from "./rate-limit.decorator.js"

type RateLimitRequest = {
  ip?: string
  headers?: Record<string, string | string[] | undefined>
  auth?: Pick<AuthRequestContext, "userId">
  trustedDevice?: {
    device: {
      id: string
    }
  }
}

type MemoryCounter = {
  count: number
  resetAt: number
}

export type RateLimitDecision = {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
}

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly memoryCounters = new Map<string, MemoryCounter>()
  private readonly redis: Redis | null

  constructor(@Inject(API_ENV) private readonly env: ApiEnv) {
    this.redis =
      this.env.RATE_LIMIT_STORE_MODE === "redis" && this.env.NODE_ENV !== "test"
        ? new Redis(this.env.REDIS_URL, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
          })
        : null
  }

  async enforce(
    policy: RateLimitPolicyName,
    request: RateLimitRequest,
  ): Promise<RateLimitDecision> {
    if (!this.env.RATE_LIMIT_ENABLED) {
      const limit = this.getLimit(policy)

      return {
        allowed: true,
        limit,
        remaining: limit,
        retryAfterSeconds: 0,
      }
    }

    const windowMs = this.getWindowMs(policy)
    const limit = this.getLimit(policy)
    const subject = this.buildSubject(policy, request)
    const bucket = `${policy}:${subject}`

    return this.redis
      ? this.incrementRedis(bucket, windowMs, limit)
      : this.incrementMemory(bucket, windowMs, limit)
  }

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => undefined)
  }

  private async incrementRedis(
    key: string,
    windowMs: number,
    limit: number,
  ): Promise<RateLimitDecision> {
    const client = this.redis

    if (!client) {
      return this.incrementMemory(key, windowMs, limit)
    }

    if (client.status === "wait") {
      await client.connect()
    }

    const count = await client.incr(key)

    if (count === 1) {
      await client.pexpire(key, windowMs)
    }

    const ttlMs = await client.pttl(key)
    return this.toDecision(count, limit, ttlMs > 0 ? ttlMs : windowMs)
  }

  private incrementMemory(key: string, windowMs: number, limit: number): RateLimitDecision {
    const now = Date.now()
    const existing = this.memoryCounters.get(key)

    if (!existing || existing.resetAt <= now) {
      const resetAt = now + windowMs
      this.memoryCounters.set(key, {
        count: 1,
        resetAt,
      })

      return this.toDecision(1, limit, windowMs)
    }

    existing.count += 1

    return this.toDecision(existing.count, limit, existing.resetAt - now)
  }

  private toDecision(count: number, limit: number, ttlMs: number): RateLimitDecision {
    const allowed = count <= limit

    return {
      allowed,
      limit,
      remaining: Math.max(limit - count, 0),
      retryAfterSeconds: Math.max(Math.ceil(ttlMs / 1_000), 1),
    }
  }

  private buildSubject(policy: RateLimitPolicyName, request: RateLimitRequest): string {
    if (policy === "attendance_mark") {
      return [
        request.auth?.userId ?? "anonymous",
        request.trustedDevice?.device.id ?? this.resolveIp(request),
      ].join(":")
    }

    return this.resolveIp(request)
  }

  private resolveIp(request: RateLimitRequest): string {
    const forwardedForHeader = request.headers?.["x-forwarded-for"]
    const normalizedHeader = Array.isArray(forwardedForHeader)
      ? forwardedForHeader[0]
      : forwardedForHeader
    const forwardedIp = normalizedHeader?.split(",")[0]?.trim()

    return forwardedIp || request.ip || "unknown"
  }

  private getWindowMs(policy: RateLimitPolicyName): number {
    return (
      (policy === "auth"
        ? this.env.AUTH_RATE_LIMIT_WINDOW_SECONDS
        : this.env.ATTENDANCE_MARK_RATE_LIMIT_WINDOW_SECONDS) * 1_000
    )
  }

  private getLimit(policy: RateLimitPolicyName): number {
    return policy === "auth"
      ? this.env.AUTH_RATE_LIMIT_MAX
      : this.env.ATTENDANCE_MARK_RATE_LIMIT_MAX
  }
}
