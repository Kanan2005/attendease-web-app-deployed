import { type ExecutionContext, UnauthorizedException } from "@nestjs/common"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiRequestContextService } from "../../infrastructure/request-context.service.js"
import { AuthGuard } from "./auth.guard.js"
import type { AuthRequestContext } from "./auth.types.js"

describe("AuthGuard", () => {
  const authContext: AuthRequestContext = {
    userId: "user_1",
    sessionId: "session_1",
    activeRole: "TEACHER",
    availableRoles: ["TEACHER"],
    platform: "WEB",
    deviceId: null,
  }

  const authService = {
    validateAccessToken: vi.fn<() => Promise<AuthRequestContext>>(),
  }

  let guard: AuthGuard
  let requestContext: ApiRequestContextService

  beforeEach(() => {
    vi.clearAllMocks()
    requestContext = new ApiRequestContextService()
    guard = new AuthGuard(authService as never, requestContext)
  })

  it("attaches request auth for a valid bearer token", async () => {
    const request: {
      headers: Record<string, string>
      auth?: AuthRequestContext
    } = {
      headers: {
        authorization: "Bearer access-token",
      },
    }

    authService.validateAccessToken.mockResolvedValue(authContext)

    const executionContext = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext

    await expect(guard.canActivate(executionContext)).resolves.toBe(true)
    expect(authService.validateAccessToken).toHaveBeenCalledWith("access-token")
    expect(request.auth).toEqual(authContext)
    expect(requestContext.get()).toBeUndefined()
  })

  it("rejects requests without a bearer token", async () => {
    const executionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    } as ExecutionContext

    await expect(guard.canActivate(executionContext)).rejects.toBeInstanceOf(UnauthorizedException)
    expect(authService.validateAccessToken).not.toHaveBeenCalled()
  })
})
