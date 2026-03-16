import { describe, expect, it, vi } from "vitest"

import { RateLimitGuard } from "./rate-limit.guard.js"
import type { RateLimitService } from "./rate-limit.service.js"

describe("RateLimitGuard", () => {
  it("allows requests that stay inside the configured budget", async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue("auth"),
    }
    const rateLimitService = {
      enforce: vi.fn().mockResolvedValue({
        allowed: true,
        limit: 10,
        remaining: 9,
        retryAfterSeconds: 60,
      }),
    } as unknown as RateLimitService
    const guard = new RateLimitGuard(reflector as never, rateLimitService)

    await expect(
      guard.canActivate({
        getClass: () => null,
        getHandler: () => null,
        switchToHttp: () => ({
          getRequest: () => ({
            ip: "127.0.0.1",
            headers: {},
          }),
          getResponse: () => ({
            header: vi.fn(),
          }),
        }),
      } as never),
    ).resolves.toBe(true)
  })

  it("rejects requests that exceed the configured budget", async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue("attendance_mark"),
    }
    const rateLimitService = {
      enforce: vi.fn().mockResolvedValue({
        allowed: false,
        limit: 2,
        remaining: 0,
        retryAfterSeconds: 30,
      }),
    } as unknown as RateLimitService
    const guard = new RateLimitGuard(reflector as never, rateLimitService)

    await expect(
      guard.canActivate({
        getClass: () => null,
        getHandler: () => null,
        switchToHttp: () => ({
          getRequest: () => ({
            ip: "127.0.0.1",
            headers: {},
            auth: {
              userId: "student_1",
            },
          }),
          getResponse: () => ({
            header: vi.fn(),
          }),
        }),
      } as never),
    ).rejects.toThrowError("Too many requests. Please try again shortly.")
  })
})
