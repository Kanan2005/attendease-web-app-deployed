import { trustedDeviceInstallIdHeaderName } from "@attendease/auth"
import {
  type AppRole,
  type AuthDeviceRegistration,
  type DeviceBindingSummary,
  type DeviceRegistrationRequest,
  type DeviceRegistrationResponse,
  type DeviceSummary,
  type TrustedDeviceReason,
  deviceBindingSummarySchema,
  deviceRegistrationRequestSchema,
  deviceRegistrationResponseSchema,
  deviceSummarySchema,
} from "@attendease/contracts"
import { recordDeviceActionTrail, runInTransaction } from "@attendease/db"
import { ForbiddenException, Inject, Injectable } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext, DeviceTrustEvaluation } from "../auth/auth.types.js"
import type { TrustedDeviceRequestContext } from "./devices.types.js"

type DeviceRecord = {
  id: string
  installId: string
  platform: "ANDROID" | "IOS" | "WEB"
  deviceModel: string | null
  osVersion: string | null
  appVersion: string | null
  publicKey: string
  attestationStatus: "UNKNOWN" | "PASSED" | "FAILED" | "NOT_SUPPORTED"
  attestationProvider: string | null
  attestedAt: Date | null
  lastSeenAt: Date
}

type BindingRecord = {
  id: string
  userId: string
  deviceId: string
  bindingType: "STUDENT_ATTENDANCE" | "TEACHER_ACCESS" | "ADMIN_ACCESS"
  status: "PENDING" | "ACTIVE" | "REVOKED" | "BLOCKED"
  boundAt: Date
  activatedAt: Date | null
  revokedAt: Date | null
  revokeReason: string | null
}

@Injectable()
export class DeviceBindingPolicyService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async upsertRegisteredDevice(
    registration?: AuthDeviceRegistration,
  ): Promise<DeviceRecord | null> {
    if (!registration) {
      return null
    }

    const parsedRegistration = deviceRegistrationRequestSchema.parse(registration)
    const now = new Date()
    const optionalDeviceFields = {
      ...(parsedRegistration.appVersion !== undefined
        ? { appVersion: parsedRegistration.appVersion }
        : {}),
      ...(parsedRegistration.deviceModel !== undefined
        ? { deviceModel: parsedRegistration.deviceModel }
        : {}),
      ...(parsedRegistration.osVersion !== undefined
        ? { osVersion: parsedRegistration.osVersion }
        : {}),
      ...(parsedRegistration.attestationProvider !== undefined
        ? { attestationProvider: parsedRegistration.attestationProvider }
        : {}),
    }

    return this.database.prisma.device.upsert({
      where: {
        installId: parsedRegistration.installId,
      },
      update: {
        platform: parsedRegistration.platform,
        publicKey: parsedRegistration.publicKey,
        ...optionalDeviceFields,
        lastSeenAt: now,
      },
      create: {
        installId: parsedRegistration.installId,
        platform: parsedRegistration.platform,
        publicKey: parsedRegistration.publicKey,
        appVersion: parsedRegistration.appVersion ?? null,
        deviceModel: parsedRegistration.deviceModel ?? null,
        osVersion: parsedRegistration.osVersion ?? null,
        attestationProvider: parsedRegistration.attestationProvider ?? null,
        // Client-supplied attestation claims remain metadata until
        // server-side verification is implemented in the device phase.
        attestationStatus: "UNKNOWN",
        attestedAt: null,
        lastSeenAt: now,
      },
      select: {
        id: true,
        installId: true,
        platform: true,
        deviceModel: true,
        osVersion: true,
        appVersion: true,
        publicKey: true,
        attestationStatus: true,
        attestationProvider: true,
        attestedAt: true,
        lastSeenAt: true,
      },
    })
  }

  async evaluateLoginDeviceTrust(params: {
    userId: string
    activeRole: AppRole
    registration?: AuthDeviceRegistration
  }): Promise<DeviceTrustEvaluation> {
    const device = await this.upsertRegisteredDevice(params.registration)

    return this.resolveDeviceTrustForRole({
      userId: params.userId,
      activeRole: params.activeRole,
      deviceId: device?.id ?? null,
      attestationStatus: device?.attestationStatus ?? null,
      source: "AUTH",
    })
  }

  async getSessionDeviceTrust(params: {
    userId: string
    activeRole: AppRole
    deviceId: string | null
  }): Promise<DeviceTrustEvaluation> {
    return this.resolveDeviceTrustForRole({
      userId: params.userId,
      activeRole: params.activeRole,
      deviceId: params.deviceId,
      attestationStatus: null,
      source: "SESSION",
    })
  }

  async registerDeviceForSession(
    auth: AuthRequestContext,
    registration: DeviceRegistrationRequest,
  ): Promise<DeviceRegistrationResponse> {
    const device = await this.requireRegisteredDevice(registration)
    const deviceTrust = await this.resolveDeviceTrustForRole({
      userId: auth.userId,
      activeRole: auth.activeRole,
      deviceId: device.id,
      attestationStatus: device.attestationStatus,
      source: "REGISTER",
    })

    if (auth.activeRole !== "STUDENT" || deviceTrust.state === "TRUSTED") {
      await this.database.prisma.authSession.update({
        where: {
          id: auth.sessionId,
        },
        data: {
          deviceId: device.id,
          lastActivityAt: new Date(),
        },
      })
    }

    const binding = await this.resolveBindingSummary(auth.userId, device.id, deviceTrust)

    return deviceRegistrationResponseSchema.parse({
      device: this.toDeviceSummary(device),
      binding,
      deviceTrust,
    })
  }

  async getTrustedAttendanceContextForRequest(
    auth: AuthRequestContext,
    installId: string | null,
  ): Promise<TrustedDeviceRequestContext> {
    if (auth.activeRole !== "STUDENT") {
      throw new ForbiddenException("Trusted device checks apply only to student attendance flows.")
    }

    if (!installId) {
      await this.recordAttendanceBlockedEvent({
        auth,
        reason: "MISSING_DEVICE_CONTEXT",
        description: "Attendance access was blocked because the install header was missing.",
        metadata: {
          headerName: trustedDeviceInstallIdHeaderName,
        },
      })

      throw new ForbiddenException("Trusted device context is missing for this attendance request.")
    }

    const device = await this.database.prisma.device.findUnique({
      where: {
        installId,
      },
      select: {
        id: true,
        installId: true,
        platform: true,
        deviceModel: true,
        osVersion: true,
        appVersion: true,
        publicKey: true,
        attestationStatus: true,
        attestationProvider: true,
        attestedAt: true,
        lastSeenAt: true,
      },
    })

    if (!device) {
      await this.recordAttendanceBlockedEvent({
        auth,
        reason: "MISSING_DEVICE_CONTEXT",
        description: "Attendance access was blocked because the device was not registered.",
        metadata: {
          installId,
        },
      })

      throw new ForbiddenException("This device is not registered for attendance access.")
    }

    const deviceTrust = await this.resolveDeviceTrustForRole({
      userId: auth.userId,
      activeRole: auth.activeRole,
      deviceId: device.id,
      attestationStatus: device.attestationStatus,
      source: "ATTENDANCE",
    })

    if (deviceTrust.state !== "TRUSTED") {
      await this.recordAttendanceBlockedEvent({
        auth,
        deviceId: device.id,
        bindingId: deviceTrust.bindingId,
        reason: deviceTrust.reason ?? "MISSING_DEVICE_CONTEXT",
        description: "Attendance access was blocked because the device is not trusted.",
        metadata: {
          installId,
          deviceTrustState: deviceTrust.state,
          deviceTrustReason: deviceTrust.reason ?? null,
        },
      })

      throw new ForbiddenException("This device is not trusted for attendance access.")
    }

    if (!auth.deviceId || auth.deviceId !== device.id) {
      await this.recordAttendanceBlockedEvent({
        auth,
        deviceId: device.id,
        bindingId: deviceTrust.bindingId,
        reason: "MISSING_DEVICE_CONTEXT",
        description:
          "Attendance access was blocked because the presented device did not match the authenticated session.",
        metadata: {
          installId,
          sessionDeviceId: auth.deviceId,
          presentedDeviceId: device.id,
        },
      })

      throw new ForbiddenException(
        "The attendance request device does not match the authenticated session device.",
      )
    }

    const binding = await this.findBindingById(deviceTrust.bindingId)

    if (!binding || binding.status !== "ACTIVE") {
      await this.recordAttendanceBlockedEvent({
        auth,
        deviceId: device.id,
        bindingId: deviceTrust.bindingId,
        reason: "DEVICE_BINDING_REVOKED",
        description:
          "Attendance access was blocked because the active device binding was unavailable.",
      })

      throw new ForbiddenException("A trusted attendance binding was not found for this device.")
    }

    return {
      device: this.toDeviceSummary(device),
      binding: this.toBindingSummary(binding),
      deviceTrust,
    }
  }

  private async requireRegisteredDevice(registration: DeviceRegistrationRequest) {
    const device = await this.upsertRegisteredDevice(registration)

    if (!device) {
      throw new ForbiddenException("Device registration details are required.")
    }

    return device
  }

  private async resolveBindingSummary(
    userId: string,
    presentedDeviceId: string,
    deviceTrust: DeviceTrustEvaluation,
  ): Promise<DeviceBindingSummary | null> {
    if (deviceTrust.bindingId) {
      const binding = await this.findBindingById(deviceTrust.bindingId)

      if (binding) {
        return this.toBindingSummary(binding)
      }
    }

    const fallbackBinding = await this.database.prisma.userDeviceBinding.findFirst({
      where: {
        userId,
        deviceId: presentedDeviceId,
        bindingType: "STUDENT_ATTENDANCE",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        userId: true,
        deviceId: true,
        bindingType: true,
        status: true,
        boundAt: true,
        activatedAt: true,
        revokedAt: true,
        revokeReason: true,
      },
    })

    return fallbackBinding ? this.toBindingSummary(fallbackBinding) : null
  }

  private async findBindingById(bindingId: string | null): Promise<BindingRecord | null> {
    if (!bindingId) {
      return null
    }

    return this.database.prisma.userDeviceBinding.findUnique({
      where: {
        id: bindingId,
      },
      select: {
        id: true,
        userId: true,
        deviceId: true,
        bindingType: true,
        status: true,
        boundAt: true,
        activatedAt: true,
        revokedAt: true,
        revokeReason: true,
      },
    })
  }

  private buildDeviceTrustEvaluation(input: {
    state: "NOT_REQUIRED" | "TRUSTED" | "BLOCKED" | "MISSING_CONTEXT"
    lifecycleState:
      | "NOT_APPLICABLE"
      | "UNREGISTERED"
      | "TRUSTED"
      | "PENDING_REPLACEMENT"
      | "REPLACED"
      | "BLOCKED"
    reason?: TrustedDeviceReason
    deviceId: string | null
    bindingId: string | null
  }): DeviceTrustEvaluation {
    return {
      state: input.state,
      lifecycleState: input.lifecycleState,
      ...(input.reason ? { reason: input.reason } : {}),
      deviceId: input.deviceId,
      bindingId: input.bindingId,
    }
  }

  private async upsertPendingStudentBinding(
    userId: string,
    deviceId: string,
  ): Promise<BindingRecord> {
    const existingBinding = await this.database.prisma.userDeviceBinding.findFirst({
      where: {
        userId,
        deviceId,
        bindingType: "STUDENT_ATTENDANCE",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        userId: true,
        deviceId: true,
        bindingType: true,
        status: true,
        boundAt: true,
        activatedAt: true,
        revokedAt: true,
        revokeReason: true,
      },
    })

    if (existingBinding) {
      return this.database.prisma.userDeviceBinding.update({
        where: {
          id: existingBinding.id,
        },
        data: {
          status: "PENDING",
          activatedAt: null,
          revokedAt: null,
          revokedByUserId: null,
          revokeReason: null,
        },
        select: {
          id: true,
          userId: true,
          deviceId: true,
          bindingType: true,
          status: true,
          boundAt: true,
          activatedAt: true,
          revokedAt: true,
          revokeReason: true,
        },
      })
    }

    return this.database.prisma.userDeviceBinding.create({
      data: {
        userId,
        deviceId,
        bindingType: "STUDENT_ATTENDANCE",
        status: "PENDING",
      },
      select: {
        id: true,
        userId: true,
        deviceId: true,
        bindingType: true,
        status: true,
        boundAt: true,
        activatedAt: true,
        revokedAt: true,
        revokeReason: true,
      },
    })
  }

  private async resolveDeviceTrustForRole(params: {
    userId: string
    activeRole: AppRole
    deviceId: string | null
    attestationStatus: DeviceRecord["attestationStatus"] | null
    source: "AUTH" | "SESSION" | "REGISTER" | "ATTENDANCE"
  }): Promise<DeviceTrustEvaluation> {
    if (params.activeRole !== "STUDENT") {
      return this.buildDeviceTrustEvaluation({
        state: "NOT_REQUIRED",
        lifecycleState: "NOT_APPLICABLE",
        reason: "NOT_STUDENT_ROLE",
        deviceId: params.deviceId,
        bindingId: null,
      })
    }

    if (!params.deviceId) {
      return this.buildDeviceTrustEvaluation({
        state: "MISSING_CONTEXT",
        lifecycleState: "UNREGISTERED",
        reason: "MISSING_DEVICE_CONTEXT",
        deviceId: null,
        bindingId: null,
      })
    }

    if (params.attestationStatus === "FAILED") {
      await this.database.prisma.securityEvent.create({
        data: {
          userId: params.userId,
          deviceId: params.deviceId,
          eventType: "LOGIN_RISK_DETECTED",
          severity: "HIGH",
          description: "The device attestation check failed during device trust evaluation.",
          metadata: {
            source: params.source,
          },
        },
      })

      return this.buildDeviceTrustEvaluation({
        state: "BLOCKED",
        lifecycleState: "BLOCKED",
        reason: "DEVICE_ATTESTATION_FAILED",
        deviceId: params.deviceId,
        bindingId: null,
      })
    }

    const deviceId = params.deviceId

    const [bindingForDevice, pendingBindingForStudent, activeBindingForStudent, revokedBinding] =
      await Promise.all([
        this.database.prisma.userDeviceBinding.findFirst({
          where: {
            deviceId,
            bindingType: "STUDENT_ATTENDANCE",
            status: "ACTIVE",
          },
          orderBy: {
            activatedAt: "desc",
          },
          select: {
            id: true,
            userId: true,
            deviceId: true,
            bindingType: true,
            status: true,
            boundAt: true,
            activatedAt: true,
            revokedAt: true,
            revokeReason: true,
          },
        }),
        this.database.prisma.userDeviceBinding.findFirst({
          where: {
            userId: params.userId,
            deviceId,
            bindingType: "STUDENT_ATTENDANCE",
            status: "PENDING",
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            userId: true,
            deviceId: true,
            bindingType: true,
            status: true,
            boundAt: true,
            activatedAt: true,
            revokedAt: true,
            revokeReason: true,
          },
        }),
        this.database.prisma.userDeviceBinding.findFirst({
          where: {
            userId: params.userId,
            bindingType: "STUDENT_ATTENDANCE",
            status: "ACTIVE",
          },
          orderBy: {
            activatedAt: "desc",
          },
          select: {
            id: true,
            userId: true,
            deviceId: true,
            bindingType: true,
            status: true,
            boundAt: true,
            activatedAt: true,
            revokedAt: true,
            revokeReason: true,
          },
        }),
        this.database.prisma.userDeviceBinding.findFirst({
          where: {
            userId: params.userId,
            deviceId,
            bindingType: "STUDENT_ATTENDANCE",
            status: "REVOKED",
          },
          orderBy: {
            revokedAt: "desc",
          },
          select: {
            id: true,
            userId: true,
            deviceId: true,
            bindingType: true,
            status: true,
            boundAt: true,
            activatedAt: true,
            revokedAt: true,
            revokeReason: true,
          },
        }),
      ])

    const replacementBinding =
      activeBindingForStudent && activeBindingForStudent.deviceId !== deviceId
        ? activeBindingForStudent
        : null

    if (revokedBinding) {
      await this.recordSecurityEvent({
        userId: params.userId,
        deviceId,
        bindingId: revokedBinding.id,
        eventType: "REVOKED_DEVICE_USED",
        description: "A revoked student device binding was used during device trust evaluation.",
        metadata: {
          source: params.source,
        },
      })

      return this.buildDeviceTrustEvaluation({
        state: "BLOCKED",
        lifecycleState: replacementBinding ? "REPLACED" : "BLOCKED",
        reason: replacementBinding ? "DEVICE_REPLACED" : "DEVICE_BINDING_REVOKED",
        deviceId,
        bindingId: revokedBinding.id,
      })
    }

    if (bindingForDevice && bindingForDevice.userId !== params.userId) {
      await this.recordSecurityEvent({
        userId: params.userId,
        deviceId,
        bindingId: bindingForDevice.id,
        eventType: "MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT",
        description: "A second student attempted to use a device that is already bound.",
        metadata: {
          source: params.source,
          boundStudentUserId: bindingForDevice.userId,
        },
      })

      return this.buildDeviceTrustEvaluation({
        state: "BLOCKED",
        lifecycleState: "BLOCKED",
        reason: "DEVICE_ALREADY_BOUND_TO_ANOTHER_STUDENT",
        deviceId,
        bindingId: null,
      })
    }

    if (replacementBinding) {
      const pendingReplacement = await this.upsertPendingStudentBinding(params.userId, deviceId)

      await this.recordSecurityEvent({
        userId: params.userId,
        deviceId,
        bindingId: pendingReplacement.id,
        eventType: "SECOND_DEVICE_FOR_STUDENT_ATTEMPT",
        description: "A student attempted to activate attendance from a second device.",
        metadata: {
          source: params.source,
          activeDeviceId: replacementBinding.deviceId,
          activeBindingId: replacementBinding.id,
          pendingBindingId: pendingReplacement.id,
        },
      })

      return this.buildDeviceTrustEvaluation({
        state: "BLOCKED",
        lifecycleState: "PENDING_REPLACEMENT",
        reason: "DEVICE_REPLACEMENT_PENDING_APPROVAL",
        deviceId,
        bindingId: pendingReplacement.id,
      })
    }

    if (pendingBindingForStudent) {
      return this.buildDeviceTrustEvaluation({
        state: "BLOCKED",
        lifecycleState: "PENDING_REPLACEMENT",
        reason: "DEVICE_REPLACEMENT_PENDING_APPROVAL",
        deviceId,
        bindingId: pendingBindingForStudent.id,
      })
    }

    if (activeBindingForStudent && activeBindingForStudent.deviceId === deviceId) {
      return this.buildDeviceTrustEvaluation({
        state: "TRUSTED",
        lifecycleState: "TRUSTED",
        reason: "DEVICE_BOUND",
        deviceId,
        bindingId: activeBindingForStudent.id,
      })
    }

    const binding = await runInTransaction(this.database.prisma, async (transaction) => {
      const createdBinding = await transaction.userDeviceBinding.create({
        data: {
          userId: params.userId,
          deviceId,
          bindingType: "STUDENT_ATTENDANCE",
          status: "ACTIVE",
          activatedAt: new Date(),
        },
        select: {
          id: true,
        },
      })

      await recordDeviceActionTrail(transaction, {
        securityEvent: {
          userId: params.userId,
          deviceId,
          bindingId: createdBinding.id,
          eventType: "DEVICE_BOUND",
          severity: "LOW",
          description: "A student device was bound during device trust evaluation.",
          metadata: {
            source: params.source,
          },
        },
      })

      return createdBinding
    })

    return this.buildDeviceTrustEvaluation({
      state: "TRUSTED",
      lifecycleState: "TRUSTED",
      reason: "DEVICE_BOUND",
      deviceId,
      bindingId: binding.id,
    })
  }

  private async recordAttendanceBlockedEvent(input: {
    auth: AuthRequestContext
    deviceId?: string
    bindingId?: string | null
    reason: TrustedDeviceReason
    description: string
    metadata?: unknown
  }) {
    await this.database.prisma.securityEvent.create({
      data: {
        userId: input.auth.userId,
        deviceId: input.deviceId ?? input.auth.deviceId,
        ...(input.bindingId ? { bindingId: input.bindingId } : {}),
        eventType: "ATTENDANCE_BLOCKED_UNTRUSTED_DEVICE",
        severity: "HIGH",
        description: input.description,
        ...(input.metadata !== undefined
          ? {
              metadata: {
                ...(input.metadata as Record<string, unknown>),
                reason: input.reason,
                sessionId: input.auth.sessionId,
              },
            }
          : {
              metadata: {
                reason: input.reason,
                sessionId: input.auth.sessionId,
              },
            }),
      },
    })
  }

  private async recordSecurityEvent(input: {
    userId: string
    deviceId: string
    bindingId?: string
    eventType:
      | "MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT"
      | "SECOND_DEVICE_FOR_STUDENT_ATTEMPT"
      | "REVOKED_DEVICE_USED"
    description: string
    metadata?: unknown
  }) {
    await this.database.prisma.securityEvent.create({
      data: {
        userId: input.userId,
        deviceId: input.deviceId,
        ...(input.bindingId ? { bindingId: input.bindingId } : {}),
        eventType: input.eventType,
        severity: "HIGH",
        description: input.description,
        ...(input.metadata !== undefined ? { metadata: input.metadata as never } : {}),
      },
    })
  }

  private toDeviceSummary(device: DeviceRecord): DeviceSummary {
    return deviceSummarySchema.parse({
      id: device.id,
      installId: device.installId,
      platform: device.platform,
      deviceModel: device.deviceModel,
      osVersion: device.osVersion,
      appVersion: device.appVersion,
      publicKey: device.publicKey,
      attestationStatus: device.attestationStatus,
      attestationProvider: device.attestationProvider,
      attestedAt: device.attestedAt?.toISOString() ?? null,
      lastSeenAt: device.lastSeenAt.toISOString(),
    })
  }

  private toBindingSummary(binding: BindingRecord): DeviceBindingSummary {
    return deviceBindingSummarySchema.parse({
      id: binding.id,
      userId: binding.userId,
      deviceId: binding.deviceId,
      bindingType: binding.bindingType,
      status: binding.status,
      boundAt: binding.boundAt.toISOString(),
      activatedAt: binding.activatedAt?.toISOString() ?? null,
      revokedAt: binding.revokedAt?.toISOString() ?? null,
      revokeReason: binding.revokeReason,
    })
  }
}
