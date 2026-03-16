import type { DeviceBindingSummary, DeviceSummary } from "@attendease/contracts"
import { deviceBindingSummarySchema, deviceSummarySchema } from "@attendease/contracts"

import type { DatabaseService } from "../../database/database.service.js"
import type { DeviceTrustEvaluation } from "../auth/auth.types.js"

export type DeviceRecord = {
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

export type BindingRecord = {
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

const bindingSelect = {
  id: true,
  userId: true,
  deviceId: true,
  bindingType: true,
  status: true,
  boundAt: true,
  activatedAt: true,
  revokedAt: true,
  revokeReason: true,
} as const

export function toDeviceSummary(device: DeviceRecord): DeviceSummary {
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

export function toBindingSummary(binding: BindingRecord): DeviceBindingSummary {
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

export async function findBindingById(
  database: DatabaseService["prisma"],
  bindingId: string | null,
): Promise<BindingRecord | null> {
  if (!bindingId) {
    return null
  }

  return database.userDeviceBinding.findUnique({
    where: {
      id: bindingId,
    },
    select: bindingSelect,
  })
}

export async function resolveBindingSummary(input: {
  database: DatabaseService["prisma"]
  userId: string
  presentedDeviceId: string
  deviceTrust: DeviceTrustEvaluation
}): Promise<DeviceBindingSummary | null> {
  if (input.deviceTrust.bindingId) {
    const binding = await findBindingById(input.database, input.deviceTrust.bindingId)

    if (binding) {
      return toBindingSummary(binding)
    }
  }

  const fallbackBinding = await input.database.userDeviceBinding.findFirst({
    where: {
      userId: input.userId,
      deviceId: input.presentedDeviceId,
      bindingType: "STUDENT_ATTENDANCE",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: bindingSelect,
  })

  return fallbackBinding ? toBindingSummary(fallbackBinding) : null
}

export async function upsertPendingStudentBinding(
  database: DatabaseService["prisma"],
  userId: string,
  deviceId: string,
): Promise<BindingRecord> {
  const existingBinding = await database.userDeviceBinding.findFirst({
    where: {
      userId,
      deviceId,
      bindingType: "STUDENT_ATTENDANCE",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: bindingSelect,
  })

  if (existingBinding) {
    return database.userDeviceBinding.update({
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
      select: bindingSelect,
    })
  }

  return database.userDeviceBinding.create({
    data: {
      userId,
      deviceId,
      bindingType: "STUDENT_ATTENDANCE",
      status: "PENDING",
    },
    select: bindingSelect,
  })
}
