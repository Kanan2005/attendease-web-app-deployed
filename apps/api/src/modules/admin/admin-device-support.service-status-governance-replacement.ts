import type {
  AdminApproveReplacementDeviceRequest,
  AdminApproveReplacementDeviceResponse,
} from "@attendease/contracts"
import { recordDeviceActionTrail, runInTransaction } from "@attendease/db"
import { ForbiddenException } from "@nestjs/common"
import type { AuthRequestContext } from "../auth/auth.types.js"

import { AdminDeviceSupportServiceShared } from "./admin-device-support.service.shared.js"

export class AdminDeviceSupportServiceStatusGovernanceReplacement extends AdminDeviceSupportServiceShared {
  async approveReplacementDevice(
    auth: AuthRequestContext,
    studentId: string,
    request: AdminApproveReplacementDeviceRequest,
  ): Promise<AdminApproveReplacementDeviceResponse> {
    await this.requireStudent(studentId)

    const device = await this.deviceBindingPolicyService.upsertRegisteredDevice(request)

    if (!device) {
      throw new ForbiddenException("Replacement device details are required.")
    }

    const conflictingBinding = await this.database.prisma.userDeviceBinding.findFirst({
      where: {
        deviceId: device.id,
        bindingType: "STUDENT_ATTENDANCE",
        status: "ACTIVE",
      },
      select: {
        id: true,
        userId: true,
        deviceId: true,
      },
    })

    if (conflictingBinding && conflictingBinding.userId !== studentId) {
      await runInTransaction(this.database.prisma, async (transaction) => {
        await recordDeviceActionTrail(transaction, {
          securityEvent: {
            userId: studentId,
            actorUserId: auth.userId,
            deviceId: device.id,
            bindingId: conflictingBinding.id,
            eventType: "MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT",
            severity: "HIGH",
            description:
              "Admin replacement approval was attempted for a device already bound to another student.",
            metadata: {
              reason: request.reason,
              operation: "APPROVE_REPLACEMENT_DEVICE",
              conflictingStudentUserId: conflictingBinding.userId,
            },
          },
          adminAction: {
            adminUserId: auth.userId,
            targetUserId: studentId,
            targetDeviceId: device.id,
            targetBindingId: conflictingBinding.id,
            actionType: "DEVICE_APPROVE_REPLACEMENT",
            metadata: {
              reason: request.reason,
              operation: "APPROVE_REPLACEMENT_DEVICE",
              success: false,
              failure: "DEVICE_ALREADY_BOUND_TO_ANOTHER_STUDENT",
            },
          },
        })
      })

      throw new ForbiddenException(
        "The replacement device is already bound to another student's attendance profile.",
      )
    }

    const result = await runInTransaction(this.database.prisma, async (transaction) => {
      const existingBinding = await transaction.userDeviceBinding.findFirst({
        where: {
          userId: studentId,
          deviceId: device.id,
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

      const replacedBindings = await transaction.userDeviceBinding.findMany({
        where: {
          userId: studentId,
          bindingType: "STUDENT_ATTENDANCE",
          status: "ACTIVE",
          deviceId: {
            not: device.id,
          },
        },
        select: {
          id: true,
          userId: true,
          deviceId: true,
        },
      })

      if (replacedBindings.length > 0) {
        await transaction.userDeviceBinding.updateMany({
          where: {
            id: {
              in: replacedBindings.map((binding) => binding.id),
            },
          },
          data: {
            status: "REVOKED",
            revokedAt: new Date(),
            revokedByUserId: auth.userId,
            revokeReason: request.reason,
          },
        })

        for (const binding of replacedBindings) {
          await transaction.securityEvent.create({
            data: {
              userId: studentId,
              actorUserId: auth.userId,
              deviceId: binding.deviceId,
              bindingId: binding.id,
              eventType: "DEVICE_REVOKED",
              severity: "HIGH",
              description:
                "An admin approved a replacement device and revoked the previous active binding.",
              metadata: {
                reason: request.reason,
                operation: "APPROVE_REPLACEMENT_DEVICE",
              },
            },
          })
        }
      }

      const approvedBinding = existingBinding
        ? await transaction.userDeviceBinding.update({
            where: {
              id: existingBinding.id,
            },
            data: {
              status: "ACTIVE",
              activatedAt: new Date(),
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
        : await transaction.userDeviceBinding.create({
            data: {
              userId: studentId,
              deviceId: device.id,
              bindingType: "STUDENT_ATTENDANCE",
              status: "ACTIVE",
              activatedAt: new Date(),
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

      await recordDeviceActionTrail(transaction, {
        securityEvent: {
          userId: studentId,
          actorUserId: auth.userId,
          deviceId: approvedBinding.deviceId,
          bindingId: approvedBinding.id,
          eventType: "DEVICE_BOUND",
          severity: "MEDIUM",
          description: "An admin approved a replacement attendance device binding.",
          metadata: {
            reason: request.reason,
            operation: "APPROVE_REPLACEMENT_DEVICE",
            installId: device.installId,
          },
        },
        adminAction: {
          adminUserId: auth.userId,
          targetUserId: studentId,
          targetDeviceId: approvedBinding.deviceId,
          targetBindingId: approvedBinding.id,
          actionType: "DEVICE_APPROVE_REPLACEMENT",
          metadata: {
            reason: request.reason,
            operation: "APPROVE_REPLACEMENT_DEVICE",
            revokedBindingIds: replacedBindings.map((binding) => binding.id),
          },
        },
      })

      return {
        binding: approvedBinding,
        revokedBindingCount: replacedBindings.length,
      }
    })

    return {
      binding: this.toBindingRecord(result.binding),
      revokedBindingCount: result.revokedBindingCount,
    }
  }
}
