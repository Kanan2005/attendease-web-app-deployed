import { recordDeviceActionTrail, runInTransaction } from "@attendease/db"

import type {
  AdminDelinkStudentDevicesRequest,
  AdminDelinkStudentDevicesResponse,
  AdminRevokeDeviceBindingRequest,
} from "@attendease/contracts"
import type { AuthRequestContext } from "../auth/auth.types.js"

import { AdminDeviceSupportServiceShared } from "./admin-device-support.service.shared.js"

export class AdminDeviceSupportServiceStatusGovernanceBinding extends AdminDeviceSupportServiceShared {
  async revokeBinding(
    auth: AuthRequestContext,
    bindingId: string,
    request: AdminRevokeDeviceBindingRequest,
  ): Promise<void> {
    const binding = await this.requireStudentBinding(bindingId)

    if (binding.status === "REVOKED") {
      return
    }

    const revokedAt = new Date()

    await runInTransaction(this.database.prisma, async (transaction) => {
      await transaction.userDeviceBinding.update({
        where: {
          id: binding.id,
        },
        data: {
          status: "REVOKED",
          revokedAt,
          revokedByUserId: auth.userId,
          revokeReason: request.reason,
        },
      })

      await recordDeviceActionTrail(transaction, {
        securityEvent: {
          userId: binding.userId,
          actorUserId: auth.userId,
          deviceId: binding.deviceId,
          bindingId: binding.id,
          eventType: "DEVICE_REVOKED",
          severity: "HIGH",
          description: "An admin revoked a student attendance device binding.",
          metadata: {
            reason: request.reason,
            operation: "REVOKE_BINDING",
          },
        },
        adminAction: {
          adminUserId: auth.userId,
          targetUserId: binding.userId,
          targetDeviceId: binding.deviceId,
          targetBindingId: binding.id,
          actionType: "DEVICE_REVOKE",
          metadata: {
            reason: request.reason,
            operation: "REVOKE_BINDING",
          },
        },
      })
    })
  }

  async delinkStudentDevices(
    auth: AuthRequestContext,
    studentId: string,
    request: AdminDelinkStudentDevicesRequest,
  ): Promise<AdminDelinkStudentDevicesResponse> {
    await this.requireStudent(studentId)

    const activeBindings = await this.database.prisma.userDeviceBinding.findMany({
      where: {
        userId: studentId,
        bindingType: "STUDENT_ATTENDANCE",
        status: "ACTIVE",
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
        device: {
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
        },
      },
    })

    const revokedAt = new Date()

    await runInTransaction(this.database.prisma, async (transaction) => {
      if (activeBindings.length > 0) {
        await transaction.userDeviceBinding.updateMany({
          where: {
            id: {
              in: activeBindings.map((binding) => binding.id),
            },
          },
          data: {
            status: "REVOKED",
            revokedAt,
            revokedByUserId: auth.userId,
            revokeReason: request.reason,
          },
        })

        for (const binding of activeBindings) {
          await transaction.securityEvent.create({
            data: {
              userId: binding.userId,
              actorUserId: auth.userId,
              deviceId: binding.deviceId,
              bindingId: binding.id,
              eventType: "DEVICE_REVOKED",
              severity: "HIGH",
              description: "An admin delinked a student's active attendance device binding.",
              metadata: {
                reason: request.reason,
                operation: "DELINK_ALL_ACTIVE_BINDINGS",
              },
            },
          })
        }
      }

      await transaction.adminActionLog.create({
        data: {
          adminUserId: auth.userId,
          targetUserId: studentId,
          actionType: "DEVICE_REVOKE",
          metadata: {
            reason: request.reason,
            operation: "DELINK_ALL_ACTIVE_BINDINGS",
            revokedBindingIds: activeBindings.map((binding) => binding.id),
          },
        },
      })
    })

    return {
      success: true,
      revokedBindingCount: activeBindings.length,
    }
  }
}
