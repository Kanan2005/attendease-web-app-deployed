import type {
  AdminDeviceSupportDetail,
  AdminDeviceSupportSearchQuery,
  AdminDeviceSupportSummary,
} from "@attendease/contracts"
import { NotFoundException } from "@nestjs/common"

import { AdminDeviceSupportServiceShared } from "./admin-device-support.service.shared.js"

export class AdminDeviceSupportServiceSearchQueries extends AdminDeviceSupportServiceShared {
  async listStudentDeviceSupport(
    filters: AdminDeviceSupportSearchQuery,
  ): Promise<AdminDeviceSupportSummary[]> {
    const query = filters.query?.trim()
    const where = {
      roles: {
        some: {
          role: "STUDENT" as const,
        },
      },
      ...(filters.status
        ? {
            deviceBindings: {
              some: {
                bindingType: "STUDENT_ATTENDANCE" as const,
                status: filters.status,
              },
            },
          }
        : {}),
      ...(query
        ? {
            OR: [
              {
                email: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
              {
                displayName: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
              {
                studentProfile: {
                  is: {
                    rollNumber: {
                      contains: query,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
              {
                deviceBindings: {
                  some: {
                    bindingType: "STUDENT_ATTENDANCE" as const,
                    device: {
                      installId: {
                        contains: query,
                        mode: "insensitive" as const,
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    }

    const students = await this.database.prisma.user.findMany({
      where,
      take: filters.limit,
      orderBy: {
        displayName: "asc",
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        studentProfile: {
          select: {
            rollNumber: true,
            programName: true,
            currentSemester: true,
            attendanceDisabled: true,
          },
        },
        deviceBindings: {
          where: {
            bindingType: "STUDENT_ATTENDANCE",
          },
          orderBy: [{ activatedAt: "desc" }, { createdAt: "desc" }],
          take: filters.includeHistory ? 10 : 5,
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
        },
        securityEvents: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            userId: true,
            actorUserId: true,
            deviceId: true,
            bindingId: true,
            eventType: true,
            severity: true,
            description: true,
            metadata: true,
            createdAt: true,
          },
        },
        targetedActions: {
          where: {
            actionType: {
              in: ["DEVICE_REVOKE", "DEVICE_APPROVE_REPLACEMENT"],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            adminUserId: true,
            targetUserId: true,
            targetDeviceId: true,
            targetBindingId: true,
            actionType: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
    })

    return Promise.all(
      students.map(async (student) => {
        const [activeBindingCount, pendingBindingCount, revokedBindingCount, blockedBindingCount] =
          await Promise.all([
            this.database.prisma.userDeviceBinding.count({
              where: {
                userId: student.id,
                bindingType: "STUDENT_ATTENDANCE",
                status: "ACTIVE",
              },
            }),
            this.database.prisma.userDeviceBinding.count({
              where: {
                userId: student.id,
                bindingType: "STUDENT_ATTENDANCE",
                status: "PENDING",
              },
            }),
            this.database.prisma.userDeviceBinding.count({
              where: {
                userId: student.id,
                bindingType: "STUDENT_ATTENDANCE",
                status: "REVOKED",
              },
            }),
            this.database.prisma.userDeviceBinding.count({
              where: {
                userId: student.id,
                bindingType: "STUDENT_ATTENDANCE",
                status: "BLOCKED",
              },
            }),
          ])

        const activeBinding = student.deviceBindings.find((binding) => binding.status === "ACTIVE")
        const pendingBinding = student.deviceBindings.find(
          (binding) => binding.status === "PENDING",
        )
        const latestSecurityEvent = student.securityEvents[0] ?? null
        const latestRecoveryAction = student.targetedActions[0] ?? null

        return {
          student: this.toStudentSummary(student),
          attendanceDeviceState: this.resolveAttendanceDeviceState({
            bindings: student.deviceBindings,
            latestSecurityEvent,
            activeBindingCount,
            revokedBindingCount,
          }),
          activeBinding: activeBinding ? this.toBindingRecord(activeBinding) : null,
          pendingBinding: pendingBinding ? this.toBindingRecord(pendingBinding) : null,
          latestSecurityEvent: latestSecurityEvent
            ? this.toSecurityEventSummary(latestSecurityEvent)
            : null,
          activeBindingCount,
          revokedBindingCount,
          recovery: this.buildRecoverySummary({
            bindings: student.deviceBindings,
            securityEvents: latestSecurityEvent ? [latestSecurityEvent] : [],
            adminActions: latestRecoveryAction ? [latestRecoveryAction] : [],
            activeBindingCount,
            pendingBindingCount,
            revokedBindingCount,
            blockedBindingCount,
          }),
        }
      }),
    )
  }

  async getStudentDeviceSupport(studentId: string): Promise<AdminDeviceSupportDetail> {
    const student = await this.database.prisma.user.findFirst({
      where: {
        id: studentId,
        roles: {
          some: {
            role: "STUDENT",
          },
        },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        studentProfile: {
          select: {
            rollNumber: true,
            programName: true,
            currentSemester: true,
            attendanceDisabled: true,
          },
        },
        deviceBindings: {
          where: {
            bindingType: "STUDENT_ATTENDANCE",
          },
          orderBy: [{ activatedAt: "desc" }, { createdAt: "desc" }],
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
        },
        securityEvents: {
          orderBy: {
            createdAt: "desc",
          },
          take: 25,
          select: {
            id: true,
            userId: true,
            actorUserId: true,
            deviceId: true,
            bindingId: true,
            eventType: true,
            severity: true,
            description: true,
            metadata: true,
            createdAt: true,
          },
        },
        targetedActions: {
          where: {
            actionType: {
              in: ["DEVICE_REVOKE", "DEVICE_APPROVE_REPLACEMENT", "USER_STATUS_CHANGE"],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 25,
          select: {
            id: true,
            adminUserId: true,
            targetUserId: true,
            targetDeviceId: true,
            targetBindingId: true,
            actionType: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
    })

    if (!student) {
      throw new NotFoundException("Student device support record was not found.")
    }

    return {
      student: this.toStudentSummary(student),
      attendanceDeviceState: this.resolveAttendanceDeviceState({
        bindings: student.deviceBindings,
        latestSecurityEvent: student.securityEvents[0] ?? null,
      }),
      bindings: student.deviceBindings.map((binding) => this.toBindingRecord(binding)),
      securityEvents: student.securityEvents.map((event) => this.toSecurityEventSummary(event)),
      adminActions: student.targetedActions.map((action) => this.toAdminActionSummary(action)),
      recovery: this.buildRecoverySummary({
        bindings: student.deviceBindings,
        securityEvents: student.securityEvents,
        adminActions: student.targetedActions,
      }),
    }
  }
}
