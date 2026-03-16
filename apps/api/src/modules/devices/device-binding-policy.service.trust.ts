import type { AppRole, TrustedDeviceReason } from "@attendease/contracts"
import { recordDeviceActionTrail, runInTransaction } from "@attendease/db"

import type { DatabaseService } from "../../database/database.service.js"
import type { DeviceTrustEvaluation } from "../auth/auth.types.js"
import type { BindingRecord, DeviceRecord } from "./device-binding-policy.service.helpers.js"
import { upsertPendingStudentBinding } from "./device-binding-policy.service.helpers.js"

type SecurityEventInput = {
  userId: string
  deviceId: string
  bindingId?: string
  eventType:
    | "MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT"
    | "SECOND_DEVICE_FOR_STUDENT_ATTEMPT"
    | "REVOKED_DEVICE_USED"
  description: string
  metadata?: unknown
}

type DeviceTrustResolutionInput = {
  database: DatabaseService["prisma"]
  userId: string
  activeRole: AppRole
  deviceId: string | null
  attestationStatus: DeviceRecord["attestationStatus"] | null
  source: "AUTH" | "SESSION" | "REGISTER" | "ATTENDANCE"
  recordSecurityEvent(input: SecurityEventInput): Promise<void>
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

function buildDeviceTrustEvaluation(input: {
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

export async function resolveDeviceTrustForRole(
  params: DeviceTrustResolutionInput,
): Promise<DeviceTrustEvaluation> {
  if (params.activeRole !== "STUDENT") {
    return buildDeviceTrustEvaluation({
      state: "NOT_REQUIRED",
      lifecycleState: "NOT_APPLICABLE",
      reason: "NOT_STUDENT_ROLE",
      deviceId: params.deviceId,
      bindingId: null,
    })
  }

  if (!params.deviceId) {
    return buildDeviceTrustEvaluation({
      state: "MISSING_CONTEXT",
      lifecycleState: "UNREGISTERED",
      reason: "MISSING_DEVICE_CONTEXT",
      deviceId: null,
      bindingId: null,
    })
  }

  if (params.attestationStatus === "FAILED") {
    await params.database.securityEvent.create({
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

    return buildDeviceTrustEvaluation({
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
      params.database.userDeviceBinding.findFirst({
        where: {
          deviceId,
          bindingType: "STUDENT_ATTENDANCE",
          status: "ACTIVE",
        },
        orderBy: {
          activatedAt: "desc",
        },
        select: bindingSelect,
      }),
      params.database.userDeviceBinding.findFirst({
        where: {
          userId: params.userId,
          deviceId,
          bindingType: "STUDENT_ATTENDANCE",
          status: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: bindingSelect,
      }),
      params.database.userDeviceBinding.findFirst({
        where: {
          userId: params.userId,
          bindingType: "STUDENT_ATTENDANCE",
          status: "ACTIVE",
        },
        orderBy: {
          activatedAt: "desc",
        },
        select: bindingSelect,
      }),
      params.database.userDeviceBinding.findFirst({
        where: {
          userId: params.userId,
          deviceId,
          bindingType: "STUDENT_ATTENDANCE",
          status: "REVOKED",
        },
        orderBy: {
          revokedAt: "desc",
        },
        select: bindingSelect,
      }),
    ])

  const replacementBinding =
    activeBindingForStudent && activeBindingForStudent.deviceId !== deviceId
      ? activeBindingForStudent
      : null

  if (revokedBinding) {
    await params.recordSecurityEvent({
      userId: params.userId,
      deviceId,
      bindingId: revokedBinding.id,
      eventType: "REVOKED_DEVICE_USED",
      description: "A revoked student device binding was used during device trust evaluation.",
      metadata: {
        source: params.source,
      },
    })

    return buildDeviceTrustEvaluation({
      state: "BLOCKED",
      lifecycleState: replacementBinding ? "REPLACED" : "BLOCKED",
      reason: replacementBinding ? "DEVICE_REPLACED" : "DEVICE_BINDING_REVOKED",
      deviceId,
      bindingId: revokedBinding.id,
    })
  }

  if (bindingForDevice && bindingForDevice.userId !== params.userId) {
    await params.recordSecurityEvent({
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

    return buildDeviceTrustEvaluation({
      state: "BLOCKED",
      lifecycleState: "BLOCKED",
      reason: "DEVICE_ALREADY_BOUND_TO_ANOTHER_STUDENT",
      deviceId,
      bindingId: null,
    })
  }

  if (replacementBinding) {
    const pendingReplacement = await upsertPendingStudentBinding(
      params.database,
      params.userId,
      deviceId,
    )

    await params.recordSecurityEvent({
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

    return buildDeviceTrustEvaluation({
      state: "BLOCKED",
      lifecycleState: "PENDING_REPLACEMENT",
      reason: "DEVICE_REPLACEMENT_PENDING_APPROVAL",
      deviceId,
      bindingId: pendingReplacement.id,
    })
  }

  if (pendingBindingForStudent) {
    return buildDeviceTrustEvaluation({
      state: "BLOCKED",
      lifecycleState: "PENDING_REPLACEMENT",
      reason: "DEVICE_REPLACEMENT_PENDING_APPROVAL",
      deviceId,
      bindingId: pendingBindingForStudent.id,
    })
  }

  if (activeBindingForStudent && activeBindingForStudent.deviceId === deviceId) {
    return buildDeviceTrustEvaluation({
      state: "TRUSTED",
      lifecycleState: "TRUSTED",
      reason: "DEVICE_BOUND",
      deviceId,
      bindingId: activeBindingForStudent.id,
    })
  }

  const binding = await runInTransaction(params.database, async (transaction) => {
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

  return buildDeviceTrustEvaluation({
    state: "TRUSTED",
    lifecycleState: "TRUSTED",
    reason: "DEVICE_BOUND",
    deviceId,
    bindingId: binding.id,
  })
}
