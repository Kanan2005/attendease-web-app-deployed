import { type ExecutionContext, ForbiddenException } from "@nestjs/common"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AuthRequestContext } from "./auth.types.js"
import { RolesGuard } from "./roles.guard.js"

describe("RolesGuard", () => {
  const reflector = {
    getAllAndOverride: vi.fn(),
  }

  let guard: RolesGuard

  beforeEach(() => {
    vi.clearAllMocks()
    guard = new RolesGuard(reflector as never)
  })

  it("allows requests when no roles are required", () => {
    reflector.getAllAndOverride.mockReturnValue([])

    const executionContext = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as unknown as ExecutionContext

    expect(guard.canActivate(executionContext)).toBe(true)
  })

  it("allows requests when the active role matches", () => {
    reflector.getAllAndOverride.mockReturnValue(["TEACHER"])

    const request = {
      auth: {
        activeRole: "TEACHER",
      } satisfies Pick<AuthRequestContext, "activeRole">,
    }
    const executionContext = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext

    expect(guard.canActivate(executionContext)).toBe(true)
  })

  it("blocks requests when the active role does not match", () => {
    reflector.getAllAndOverride.mockReturnValue(["ADMIN"])

    const executionContext = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({
          auth: {
            activeRole: "STUDENT",
          },
        }),
      }),
    } as unknown as ExecutionContext

    expect(() => guard.canActivate(executionContext)).toThrow(ForbiddenException)
  })
})
