import { ForbiddenException } from "@nestjs/common"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AuthRequestContext } from "../auth/auth.types.js"
import { TrustedDeviceGuard } from "./trusted-device.guard.js"

describe("TrustedDeviceGuard", () => {
  const authContext: AuthRequestContext = {
    userId: "student_1",
    sessionId: "session_1",
    activeRole: "STUDENT",
    availableRoles: ["STUDENT"],
    platform: "MOBILE",
    deviceId: "device_1",
  }

  const devicesService = {
    getAttendanceReadyState: vi.fn(),
  }

  let guard: TrustedDeviceGuard

  beforeEach(() => {
    vi.clearAllMocks()
    guard = new TrustedDeviceGuard(devicesService as never)
  })

  it("attaches trusted-device context after successful policy evaluation", async () => {
    devicesService.getAttendanceReadyState.mockResolvedValue({
      ready: true,
      device: {
        id: "device_1",
        installId: "install-student-one",
        platform: "ANDROID",
        deviceModel: "Pixel 8",
        osVersion: "Android 15",
        appVersion: "0.1.0",
        publicKey: "public-key-student-one",
        attestationStatus: "UNKNOWN",
        attestationProvider: null,
        attestedAt: null,
        lastSeenAt: "2026-03-14T10:00:00.000Z",
      },
      binding: {
        id: "binding_1",
        userId: "student_1",
        deviceId: "device_1",
        bindingType: "STUDENT_ATTENDANCE",
        status: "ACTIVE",
        boundAt: "2026-03-14T09:00:00.000Z",
        activatedAt: "2026-03-14T09:00:00.000Z",
        revokedAt: null,
        revokeReason: null,
      },
      deviceTrust: {
        state: "TRUSTED",
        lifecycleState: "TRUSTED",
        reason: "DEVICE_BOUND",
        deviceId: "device_1",
        bindingId: "binding_1",
      },
    })

    const request: {
      headers: Record<string, string>
      auth?: AuthRequestContext
      trustedDevice?: unknown
    } = {
      headers: {
        "x-attendease-install-id": "install-student-one",
      },
      auth: authContext,
    }

    await expect(
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as never),
    ).resolves.toBe(true)

    expect(devicesService.getAttendanceReadyState).toHaveBeenCalledWith(
      authContext,
      "install-student-one",
    )
    expect(request.trustedDevice).toEqual({
      device: expect.objectContaining({
        id: "device_1",
      }),
      binding: expect.objectContaining({
        id: "binding_1",
      }),
      deviceTrust: expect.objectContaining({
        state: "TRUSTED",
      }),
    })
  })

  it("rejects requests when authentication context is missing", async () => {
    await expect(
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {},
          }),
        }),
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it("propagates trusted-device policy failures", async () => {
    devicesService.getAttendanceReadyState.mockRejectedValue(
      new ForbiddenException("This device is not trusted for attendance access."),
    )

    await expect(
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              "x-attendease-install-id": "install-student-one",
            },
            auth: authContext,
          }),
        }),
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })
})
