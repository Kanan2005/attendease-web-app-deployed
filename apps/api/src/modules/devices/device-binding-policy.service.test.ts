import { ForbiddenException } from "@nestjs/common"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@attendease/db", () => ({
  runInTransaction: vi.fn(async (client: unknown, callback: (transaction: unknown) => unknown) =>
    callback(client),
  ),
  recordDeviceActionTrail: vi.fn(
    async (
      transaction: { securityEvent: { create: (args: unknown) => unknown } },
      params: { securityEvent: unknown },
    ) => {
      await transaction.securityEvent.create({
        data: params.securityEvent,
      })

      return {
        securityEvent: null,
        adminAction: null,
        outboxEvent: null,
      }
    },
  ),
}))

import { DeviceBindingPolicyService } from "./device-binding-policy.service.js"

describe("DeviceBindingPolicyService", () => {
  const database = {
    prisma: {
      device: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
      },
      userDeviceBinding: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      securityEvent: {
        create: vi.fn(),
      },
      authSession: {
        update: vi.fn(),
      },
    },
  }

  let service: DeviceBindingPolicyService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new DeviceBindingPolicyService(database as never)
  })

  it("binds the first student device and returns a trusted state", async () => {
    database.prisma.device.upsert.mockResolvedValue({
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
      lastSeenAt: new Date("2026-03-14T10:00:00.000Z"),
    })
    database.prisma.userDeviceBinding.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    database.prisma.userDeviceBinding.create.mockResolvedValue({
      id: "binding_1",
    })

    await expect(
      service.evaluateLoginDeviceTrust({
        userId: "student_1",
        activeRole: "STUDENT",
        registration: {
          installId: "install-student-one",
          platform: "ANDROID",
          publicKey: "public-key-student-one",
        },
      }),
    ).resolves.toEqual({
      state: "TRUSTED",
      lifecycleState: "TRUSTED",
      reason: "DEVICE_BOUND",
      deviceId: "device_1",
      bindingId: "binding_1",
    })

    expect(database.prisma.securityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "DEVICE_BOUND",
          bindingId: "binding_1",
        }),
      }),
    )
  })

  it("blocks a second student from registering an already bound device", async () => {
    database.prisma.device.upsert.mockResolvedValue({
      id: "device_1",
      installId: "install-shared-phone",
      platform: "ANDROID",
      deviceModel: null,
      osVersion: null,
      appVersion: null,
      publicKey: "public-key-shared",
      attestationStatus: "UNKNOWN",
      attestationProvider: null,
      attestedAt: null,
      lastSeenAt: new Date("2026-03-14T10:00:00.000Z"),
    })
    database.prisma.userDeviceBinding.findFirst
      .mockResolvedValueOnce({
        id: "binding_existing",
        userId: "student_2",
        deviceId: "device_1",
        bindingType: "STUDENT_ATTENDANCE",
        status: "ACTIVE",
        boundAt: new Date("2026-03-14T09:00:00.000Z"),
        activatedAt: new Date("2026-03-14T09:00:00.000Z"),
        revokedAt: null,
        revokeReason: null,
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)

    await expect(
      service.evaluateLoginDeviceTrust({
        userId: "student_1",
        activeRole: "STUDENT",
        registration: {
          installId: "install-shared-phone",
          platform: "ANDROID",
          publicKey: "public-key-shared",
        },
      }),
    ).resolves.toEqual({
      state: "BLOCKED",
      lifecycleState: "BLOCKED",
      reason: "DEVICE_ALREADY_BOUND_TO_ANOTHER_STUDENT",
      deviceId: "device_1",
      bindingId: null,
    })

    expect(database.prisma.securityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT",
          bindingId: "binding_existing",
        }),
      }),
    )
  })

  it("blocks a second device for the same student and logs the attempt", async () => {
    database.prisma.device.upsert.mockResolvedValue({
      id: "device_2",
      installId: "install-student-second-device",
      platform: "IOS",
      deviceModel: null,
      osVersion: null,
      appVersion: null,
      publicKey: "public-key-second-device",
      attestationStatus: "UNKNOWN",
      attestationProvider: null,
      attestedAt: null,
      lastSeenAt: new Date("2026-03-14T10:00:00.000Z"),
    })
    database.prisma.userDeviceBinding.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "binding_primary",
        userId: "student_1",
        deviceId: "device_1",
        bindingType: "STUDENT_ATTENDANCE",
        status: "ACTIVE",
        boundAt: new Date("2026-03-14T09:00:00.000Z"),
        activatedAt: new Date("2026-03-14T09:00:00.000Z"),
        revokedAt: null,
        revokeReason: null,
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    database.prisma.userDeviceBinding.create.mockResolvedValue({
      id: "binding_pending",
      userId: "student_1",
      deviceId: "device_2",
      bindingType: "STUDENT_ATTENDANCE",
      status: "PENDING",
      boundAt: new Date("2026-03-14T10:00:00.000Z"),
      activatedAt: null,
      revokedAt: null,
      revokeReason: null,
    })

    await expect(
      service.evaluateLoginDeviceTrust({
        userId: "student_1",
        activeRole: "STUDENT",
        registration: {
          installId: "install-student-second-device",
          platform: "IOS",
          publicKey: "public-key-second-device",
        },
      }),
    ).resolves.toEqual({
      state: "BLOCKED",
      lifecycleState: "PENDING_REPLACEMENT",
      reason: "DEVICE_REPLACEMENT_PENDING_APPROVAL",
      deviceId: "device_2",
      bindingId: "binding_pending",
    })

    expect(database.prisma.securityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "SECOND_DEVICE_FOR_STUDENT_ATTEMPT",
          bindingId: "binding_pending",
        }),
      }),
    )
  })

  it("keeps a pending replacement blocked even when no active device remains", async () => {
    database.prisma.device.upsert.mockResolvedValue({
      id: "device_2",
      installId: "install-student-pending-device",
      platform: "ANDROID",
      deviceModel: null,
      osVersion: null,
      appVersion: null,
      publicKey: "public-key-pending-device",
      attestationStatus: "UNKNOWN",
      attestationProvider: null,
      attestedAt: null,
      lastSeenAt: new Date("2026-03-14T10:00:00.000Z"),
    })
    database.prisma.userDeviceBinding.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "binding_pending",
        userId: "student_1",
        deviceId: "device_2",
        bindingType: "STUDENT_ATTENDANCE",
        status: "PENDING",
        boundAt: new Date("2026-03-14T10:00:00.000Z"),
        activatedAt: null,
        revokedAt: null,
        revokeReason: null,
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)

    await expect(
      service.evaluateLoginDeviceTrust({
        userId: "student_1",
        activeRole: "STUDENT",
        registration: {
          installId: "install-student-pending-device",
          platform: "ANDROID",
          publicKey: "public-key-pending-device",
        },
      }),
    ).resolves.toEqual({
      state: "BLOCKED",
      lifecycleState: "PENDING_REPLACEMENT",
      reason: "DEVICE_REPLACEMENT_PENDING_APPROVAL",
      deviceId: "device_2",
      bindingId: "binding_pending",
    })
  })

  it("blocks revoked-device attendance access and logs both risk and attendance-block events", async () => {
    database.prisma.device.findUnique.mockResolvedValue({
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
      lastSeenAt: new Date("2026-03-14T10:00:00.000Z"),
    })
    database.prisma.userDeviceBinding.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "binding_revoked",
        userId: "student_1",
        deviceId: "device_1",
        bindingType: "STUDENT_ATTENDANCE",
        status: "REVOKED",
        boundAt: new Date("2026-03-14T08:00:00.000Z"),
        activatedAt: new Date("2026-03-14T08:00:00.000Z"),
        revokedAt: new Date("2026-03-14T09:00:00.000Z"),
        revokeReason: "Replacement approved",
      })

    await expect(
      service.getTrustedAttendanceContextForRequest(
        {
          userId: "student_1",
          sessionId: "session_1",
          activeRole: "STUDENT",
          availableRoles: ["STUDENT"],
          platform: "MOBILE",
          deviceId: "device_1",
        },
        "install-student-one",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException)

    expect(database.prisma.securityEvent.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "REVOKED_DEVICE_USED",
          bindingId: "binding_revoked",
        }),
      }),
    )
    expect(database.prisma.securityEvent.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "ATTENDANCE_BLOCKED_UNTRUSTED_DEVICE",
          bindingId: "binding_revoked",
          metadata: expect.objectContaining({
            reason: "DEVICE_BINDING_REVOKED",
          }),
        }),
      }),
    )
  })
})
