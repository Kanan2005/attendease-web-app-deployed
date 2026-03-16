import { trustedDeviceInstallIdHeaderName } from "@attendease/auth"
import {
  type AppRole,
  type AuthDeviceRegistration,
  type DeviceRegistrationRequest,
  type DeviceRegistrationResponse,
  type TrustedDeviceReason,
  deviceRegistrationRequestSchema,
  deviceRegistrationResponseSchema,
} from "@attendease/contracts"
import { ForbiddenException, Inject, Injectable } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext, DeviceTrustEvaluation } from "../auth/auth.types.js"
import {
  type DeviceRecord,
  findBindingById,
  resolveBindingSummary,
  toBindingSummary,
  toDeviceSummary,
} from "./device-binding-policy.service.helpers.js"
import { resolveDeviceTrustForRole } from "./device-binding-policy.service.trust.js"
import type { TrustedDeviceRequestContext } from "./devices.types.js"

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

    return this.resolveDeviceTrust({
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
    return this.resolveDeviceTrust({
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
    const deviceTrust = await this.resolveDeviceTrust({
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

    const binding = await resolveBindingSummary({
      database: this.database.prisma,
      userId: auth.userId,
      presentedDeviceId: device.id,
      deviceTrust,
    })

    return deviceRegistrationResponseSchema.parse({
      device: toDeviceSummary(device),
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

    const deviceTrust = await this.resolveDeviceTrust({
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

    const binding = await findBindingById(this.database.prisma, deviceTrust.bindingId)

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
      device: toDeviceSummary(device),
      binding: toBindingSummary(binding),
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

  private async resolveDeviceTrust(params: {
    userId: string
    activeRole: AppRole
    deviceId: string | null
    attestationStatus: DeviceRecord["attestationStatus"] | null
    source: "AUTH" | "SESSION" | "REGISTER" | "ATTENDANCE"
  }) {
    return resolveDeviceTrustForRole({
      database: this.database.prisma,
      ...params,
      recordSecurityEvent: (input) => this.recordSecurityEvent(input),
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
}
