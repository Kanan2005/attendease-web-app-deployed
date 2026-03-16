import type {
  AdminActionLogSummary,
  AdminActionType,
  AdminApproveReplacementDeviceRequest,
  AdminApproveReplacementDeviceResponse,
  AdminDelinkStudentDevicesRequest,
  AdminDelinkStudentDevicesResponse,
  AdminDeviceBindingRecord,
  AdminDeviceRecoverySummary,
  AdminDeviceSupportDetail,
  AdminDeviceSupportSearchQuery,
  AdminDeviceSupportSummary,
  AdminRevokeDeviceBindingRequest,
  AdminStudentClassroomContext,
  AdminStudentEnrollmentCounts,
  AdminStudentIdentityDetail,
  AdminStudentIdentitySummary,
  AdminStudentManagementDetail,
  AdminStudentManagementSearchQuery,
  AdminStudentManagementSummary,
  AdminStudentStatusActions,
  AdminUpdateStudentStatusRequest,
  AdminUpdateStudentStatusResponse,
  AttendanceDeviceLifecycleState,
  DeviceSummary,
  DeviceSupportStudent,
  SecurityEventSummary,
} from "@attendease/contracts"
import {
  type PrismaTransactionClient,
  recordAdministrativeActionTrail,
  recordDeviceActionTrail,
  runInTransaction,
} from "@attendease/db"
import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { DeviceBindingPolicyService } from "../devices/device-binding-policy.service.js"

type StudentRecord = {
  id: string
  email: string
  displayName: string
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "BLOCKED" | "ARCHIVED"
  createdAt: Date
  lastLoginAt: Date | null
  studentProfile: {
    rollNumber: string | null
    programName: string | null
    currentSemester: number | null
    attendanceDisabled: boolean
  } | null
}

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
  device: DeviceRecord
}

type SecurityEventRecord = {
  id: string
  userId: string | null
  actorUserId: string | null
  deviceId: string | null
  bindingId: string | null
  eventType:
    | "DEVICE_BOUND"
    | "DEVICE_REVOKED"
    | "ATTENDANCE_BLOCKED_UNTRUSTED_DEVICE"
    | "ATTENDANCE_LOCATION_VALIDATION_FAILED"
    | "ATTENDANCE_BLUETOOTH_VALIDATION_FAILED"
    | "MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT"
    | "SECOND_DEVICE_FOR_STUDENT_ATTEMPT"
    | "REVOKED_DEVICE_USED"
    | "LOGIN_RISK_DETECTED"
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  description: string | null
  metadata: unknown
  createdAt: Date
}

type AdminActionRecord = {
  id: string
  adminUserId: string
  targetUserId: string | null
  targetDeviceId: string | null
  targetBindingId: string | null
  actionType: string
  metadata: unknown
  createdAt: Date
}

type EnrollmentRecord = {
  id: string
  status: "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED"
  joinedAt: Date
  droppedAt: Date | null
  courseOffering: {
    id: string
    code: string
    displayTitle: string
    status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
    semester: {
      title: string
      status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED"
    }
  }
}

@Injectable()
export class AdminDeviceSupportService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(DeviceBindingPolicyService)
    private readonly deviceBindingPolicyService: DeviceBindingPolicyService,
  ) {}

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

  async listStudentManagement(
    filters: AdminStudentManagementSearchQuery,
  ): Promise<AdminStudentManagementSummary[]> {
    const query = filters.query?.trim()

    const students = await this.database.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: "STUDENT",
          },
        },
        ...(filters.accountStatus ? { status: filters.accountStatus } : {}),
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
                  studentProfile: {
                    is: {
                      programName: {
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
                {
                  enrollments: {
                    some: {
                      courseOffering: {
                        code: {
                          contains: query,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  },
                },
                {
                  enrollments: {
                    some: {
                      courseOffering: {
                        displayTitle: {
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
      },
      take: filters.limit,
      orderBy: [{ status: "asc" }, { displayName: "asc" }],
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
          take: 5,
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
              in: ["DEVICE_REVOKE", "DEVICE_APPROVE_REPLACEMENT", "USER_STATUS_CHANGE"],
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
        enrollments: {
          select: {
            status: true,
          },
        },
      },
    })

    return students.map((student) => {
      const activeBinding = student.deviceBindings.find((binding) => binding.status === "ACTIVE")
      const pendingBinding = student.deviceBindings.find((binding) => binding.status === "PENDING")

      return {
        student: this.toStudentIdentitySummary(student),
        attendanceDeviceState: this.resolveAttendanceDeviceState({
          bindings: student.deviceBindings,
          latestSecurityEvent: student.securityEvents[0] ?? null,
        }),
        activeBinding: activeBinding ? this.toBindingRecord(activeBinding) : null,
        pendingBinding: pendingBinding ? this.toBindingRecord(pendingBinding) : null,
        latestSecurityEvent: student.securityEvents[0]
          ? this.toSecurityEventSummary(student.securityEvents[0])
          : null,
        latestAdminAction: student.targetedActions[0]
          ? this.toAdminActionSummary(student.targetedActions[0])
          : null,
        enrollmentCounts: this.toEnrollmentCounts(student.enrollments),
        actions: this.buildStudentStatusActions(student.status),
      }
    })
  }

  async getStudentManagementDetail(studentId: string): Promise<AdminStudentManagementDetail> {
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
        enrollments: {
          orderBy: [{ updatedAt: "desc" }, { joinedAt: "desc" }],
          take: 12,
          select: {
            id: true,
            status: true,
            joinedAt: true,
            droppedAt: true,
            courseOffering: {
              select: {
                id: true,
                code: true,
                displayTitle: true,
                status: true,
                semester: {
                  select: {
                    title: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!student) {
      throw new NotFoundException("Student support record was not found.")
    }

    const activeBinding = student.deviceBindings.find((binding) => binding.status === "ACTIVE")
    const pendingBinding = student.deviceBindings.find((binding) => binding.status === "PENDING")

    return {
      student: this.toStudentIdentityDetail(student),
      attendanceDeviceState: this.resolveAttendanceDeviceState({
        bindings: student.deviceBindings,
        latestSecurityEvent: student.securityEvents[0] ?? null,
      }),
      activeBinding: activeBinding ? this.toBindingRecord(activeBinding) : null,
      pendingBinding: pendingBinding ? this.toBindingRecord(pendingBinding) : null,
      enrollmentCounts: this.toEnrollmentCounts(student.enrollments),
      recentClassrooms: student.enrollments.map((enrollment) =>
        this.toStudentClassroomContext(enrollment),
      ),
      securityEvents: student.securityEvents.map((event) => this.toSecurityEventSummary(event)),
      adminActions: student.targetedActions.map((action) => this.toAdminActionSummary(action)),
      actions: this.buildStudentStatusActions(student.status),
    }
  }

  async updateStudentStatus(
    auth: AuthRequestContext,
    studentId: string,
    request: AdminUpdateStudentStatusRequest,
  ): Promise<AdminUpdateStudentStatusResponse> {
    const student = await this.requireStudent(studentId)
    this.assertStudentStatusTransition(student.status, request.nextStatus)

    const revokedSessionCount = await runInTransaction(
      this.database.prisma,
      async (transaction) => {
        const now = new Date()
        const revokedSessions =
          request.nextStatus === "ACTIVE"
            ? 0
            : await this.revokeStudentSessions(transaction, studentId, now)

        await transaction.user.update({
          where: {
            id: studentId,
          },
          data: {
            status: request.nextStatus,
          },
        })

        await recordAdministrativeActionTrail(transaction, {
          adminAction: {
            adminUserId: auth.userId,
            targetUserId: studentId,
            actionType: "USER_STATUS_CHANGE",
            metadata: {
              reason: request.reason,
              previousStatus: student.status,
              nextStatus: request.nextStatus,
              revokedSessionCount: revokedSessions,
            },
            createdAt: now,
          },
        })

        return revokedSessions
      },
    )

    return {
      student: await this.getStudentManagementDetail(studentId),
      revokedSessionCount,
    }
  }

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

  private async requireStudent(studentId: string): Promise<StudentRecord> {
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
      },
    })

    if (!student) {
      throw new NotFoundException("Student device support record was not found.")
    }

    return student
  }

  private async requireStudentBinding(bindingId: string): Promise<BindingRecord> {
    const binding = await this.database.prisma.userDeviceBinding.findFirst({
      where: {
        id: bindingId,
        bindingType: "STUDENT_ATTENDANCE",
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

    if (!binding) {
      throw new NotFoundException("Student device binding was not found.")
    }

    return binding
  }

  private toStudentSummary(student: StudentRecord): DeviceSupportStudent {
    return {
      id: student.id,
      email: student.email,
      displayName: student.displayName,
      rollNumber: student.studentProfile?.rollNumber ?? null,
      status: student.status,
      attendanceDisabled: student.studentProfile?.attendanceDisabled ?? false,
    }
  }

  private toStudentIdentitySummary(student: StudentRecord): AdminStudentIdentitySummary {
    return {
      ...this.toStudentSummary(student),
      lastLoginAt: student.lastLoginAt?.toISOString() ?? null,
    }
  }

  private toStudentIdentityDetail(student: StudentRecord): AdminStudentIdentityDetail {
    return {
      ...this.toStudentIdentitySummary(student),
      createdAt: student.createdAt.toISOString(),
      programName: student.studentProfile?.programName ?? null,
      currentSemester: student.studentProfile?.currentSemester ?? null,
    }
  }

  private buildRecoverySummary(input: {
    bindings: BindingRecord[]
    securityEvents: SecurityEventRecord[]
    adminActions: AdminActionRecord[]
    activeBindingCount?: number
    pendingBindingCount?: number
    revokedBindingCount?: number
    blockedBindingCount?: number
  }): AdminDeviceRecoverySummary {
    const activeBinding = input.bindings.find((binding) => binding.status === "ACTIVE") ?? null
    const pendingBinding = input.bindings.find((binding) => binding.status === "PENDING") ?? null
    const activeBindingCount =
      input.activeBindingCount ??
      input.bindings.filter((binding) => binding.status === "ACTIVE").length
    const pendingBindingCount =
      input.pendingBindingCount ??
      input.bindings.filter((binding) => binding.status === "PENDING").length
    const revokedBindingCount =
      input.revokedBindingCount ??
      input.bindings.filter((binding) => binding.status === "REVOKED").length
    const blockedBindingCount =
      input.blockedBindingCount ??
      input.bindings.filter((binding) => binding.status === "BLOCKED").length
    const latestRiskEvent =
      input.securityEvents.find((event) => this.isRecoveryRiskEvent(event.eventType)) ?? null
    const latestRecoveryAction =
      input.adminActions.find((action) => this.isRecoveryAction(action.actionType)) ?? null

    let recommendedAction:
      | "NO_ACTION_REQUIRED"
      | "APPROVE_PENDING_REPLACEMENT"
      | "WAIT_FOR_REPLACEMENT_REGISTRATION"
      | "REVIEW_BLOCKED_STATE"
    let recommendedActionLabel: string
    let recommendedActionMessage: string
    let strictPolicyNote: string

    if (pendingBindingCount > 0) {
      recommendedAction = "APPROVE_PENDING_REPLACEMENT"
      recommendedActionLabel = "Approve the pending replacement"
      recommendedActionMessage =
        activeBindingCount > 0
          ? "The student already checked in on another phone, but that phone stays blocked until support approves it."
          : "The current phone is already cleared, but the pending replacement still cannot mark attendance until support approves it."
      strictPolicyNote =
        "A pending replacement never becomes trusted automatically. Clearing the current phone does not auto-trust the pending phone."
    } else if (activeBindingCount > 0) {
      recommendedAction = "NO_ACTION_REQUIRED"
      recommendedActionLabel = "Current phone remains trusted"
      recommendedActionMessage =
        "Only the active attendance phone can mark attendance right now. Deregister it only after the student request is verified."
      strictPolicyNote =
        "One-device enforcement stays strict: any second phone stays blocked until support approves a replacement or the current phone is deregistered."
    } else if (latestRiskEvent || blockedBindingCount > 0) {
      recommendedAction = "REVIEW_BLOCKED_STATE"
      recommendedActionLabel = "Review blocked device activity"
      recommendedActionMessage =
        "Recent risk events exist, but no phone is currently trusted. Review the case before you allow a replacement path."
      strictPolicyNote =
        "No phone can mark attendance until a new device becomes trusted under the one-device policy."
    } else {
      recommendedAction = "WAIT_FOR_REPLACEMENT_REGISTRATION"
      recommendedActionLabel = "Wait for a replacement phone"
      recommendedActionMessage =
        "No phone is trusted right now. Ask the student to sign in on the replacement phone or provide verified device details before approval."
      strictPolicyNote =
        "A new phone can only become trusted when no other active phone exists, or when support explicitly approves a verified replacement."
    }

    return {
      activeBindingCount,
      pendingBindingCount,
      revokedBindingCount,
      blockedBindingCount,
      currentDeviceLabel: activeBinding?.device.installId ?? null,
      pendingReplacementLabel: pendingBinding?.device.installId ?? null,
      latestRiskEvent: latestRiskEvent ? this.toSecurityEventSummary(latestRiskEvent) : null,
      latestRecoveryAction: latestRecoveryAction
        ? this.toAdminActionSummary(latestRecoveryAction)
        : null,
      recommendedAction,
      recommendedActionLabel,
      recommendedActionMessage,
      strictPolicyNote,
      actions: {
        canDeregisterCurrentDevice: activeBindingCount > 0,
        canApproveReplacementDevice: true,
        canRevokeActiveBinding: activeBindingCount > 0,
      },
    }
  }

  private toBindingRecord(binding: BindingRecord): AdminDeviceBindingRecord {
    return {
      binding: {
        id: binding.id,
        userId: binding.userId,
        deviceId: binding.deviceId,
        bindingType: binding.bindingType,
        status: binding.status,
        boundAt: binding.boundAt.toISOString(),
        activatedAt: binding.activatedAt?.toISOString() ?? null,
        revokedAt: binding.revokedAt?.toISOString() ?? null,
        revokeReason: binding.revokeReason,
      },
      device: this.toDeviceSummary(binding.device),
    }
  }

  private toDeviceSummary(device: DeviceRecord): DeviceSummary {
    return {
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
    }
  }

  private resolveAttendanceDeviceState(input: {
    bindings: BindingRecord[]
    latestSecurityEvent: SecurityEventRecord | null
    activeBindingCount?: number
    revokedBindingCount?: number
  }): AttendanceDeviceLifecycleState {
    const pendingBinding = input.bindings.find((binding) => binding.status === "PENDING")
    if (pendingBinding) {
      return "PENDING_REPLACEMENT"
    }

    const activeBinding = input.bindings.find((binding) => binding.status === "ACTIVE")
    if (activeBinding) {
      return "TRUSTED"
    }

    const revokedCount =
      input.revokedBindingCount ??
      input.bindings.filter((binding) => binding.status === "REVOKED").length
    if (revokedCount > 0) {
      return "REPLACED"
    }

    if (
      input.latestSecurityEvent &&
      [
        "ATTENDANCE_BLOCKED_UNTRUSTED_DEVICE",
        "MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT",
        "SECOND_DEVICE_FOR_STUDENT_ATTEMPT",
        "REVOKED_DEVICE_USED",
        "LOGIN_RISK_DETECTED",
      ].includes(input.latestSecurityEvent.eventType)
    ) {
      return "BLOCKED"
    }

    return "UNREGISTERED"
  }

  private toSecurityEventSummary(event: SecurityEventRecord): SecurityEventSummary {
    return {
      id: event.id,
      userId: event.userId,
      actorUserId: event.actorUserId,
      deviceId: event.deviceId,
      bindingId: event.bindingId,
      eventType: event.eventType,
      severity: event.severity,
      description: event.description,
      metadata: event.metadata ?? null,
      createdAt: event.createdAt.toISOString(),
    }
  }

  private toEnrollmentCounts(
    enrollments: Array<Pick<EnrollmentRecord, "status">>,
  ): AdminStudentEnrollmentCounts {
    return enrollments.reduce<AdminStudentEnrollmentCounts>(
      (counts, enrollment) => {
        counts.totalCount += 1

        switch (enrollment.status) {
          case "ACTIVE":
            counts.activeCount += 1
            break
          case "PENDING":
            counts.pendingCount += 1
            break
          case "BLOCKED":
            counts.blockedCount += 1
            break
          case "DROPPED":
            counts.droppedCount += 1
            break
        }

        return counts
      },
      {
        totalCount: 0,
        activeCount: 0,
        pendingCount: 0,
        blockedCount: 0,
        droppedCount: 0,
      },
    )
  }

  private toStudentClassroomContext(enrollment: EnrollmentRecord): AdminStudentClassroomContext {
    return {
      enrollmentId: enrollment.id,
      classroomId: enrollment.courseOffering.id,
      classroomTitle: enrollment.courseOffering.displayTitle,
      courseCode: enrollment.courseOffering.code,
      membershipStatus: enrollment.status,
      classroomStatus: enrollment.courseOffering.status,
      semesterTitle: enrollment.courseOffering.semester.title,
      semesterStatus: enrollment.courseOffering.semester.status,
      joinedAt: enrollment.joinedAt.toISOString(),
      droppedAt: enrollment.droppedAt?.toISOString() ?? null,
    }
  }

  private buildStudentStatusActions(status: StudentRecord["status"]): AdminStudentStatusActions {
    return {
      canReactivate: status === "BLOCKED" || status === "PENDING" || status === "SUSPENDED",
      canDeactivate: status === "ACTIVE",
      canArchive: status !== "ARCHIVED",
    }
  }

  private assertStudentStatusTransition(
    currentStatus: StudentRecord["status"],
    nextStatus: AdminUpdateStudentStatusRequest["nextStatus"],
  ) {
    if (currentStatus === nextStatus) {
      throw new ForbiddenException("The student account is already in that state.")
    }

    if (currentStatus === "ARCHIVED") {
      throw new ForbiddenException(
        "Archived student accounts stay read-only. Open a new support path instead of restoring this record.",
      )
    }

    if (currentStatus === "ACTIVE" && nextStatus !== "BLOCKED" && nextStatus !== "ARCHIVED") {
      throw new ForbiddenException("Active student accounts can only be deactivated or archived.")
    }

    if (
      ["BLOCKED", "PENDING", "SUSPENDED"].includes(currentStatus) &&
      nextStatus !== "ACTIVE" &&
      nextStatus !== "ARCHIVED"
    ) {
      throw new ForbiddenException(
        "Blocked or pending student accounts can only be reactivated or archived.",
      )
    }
  }

  private async revokeStudentSessions(
    transaction: PrismaTransactionClient,
    studentId: string,
    revokedAt: Date,
  ): Promise<number> {
    const activeSessions = await transaction.authSession.findMany({
      where: {
        userId: studentId,
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    })

    if (activeSessions.length === 0) {
      return 0
    }

    await transaction.authSession.updateMany({
      where: {
        id: {
          in: activeSessions.map((session) => session.id),
        },
      },
      data: {
        status: "REVOKED",
        revokedAt,
      },
    })

    await transaction.refreshToken.updateMany({
      where: {
        userId: studentId,
        revokedAt: null,
      },
      data: {
        revokedAt,
      },
    })

    return activeSessions.length
  }

  private toAdminActionSummary(action: AdminActionRecord): AdminActionLogSummary {
    const actionType = this.normalizeAdminActionType(action.actionType)

    return {
      id: action.id,
      adminUserId: action.adminUserId,
      targetUserId: action.targetUserId,
      targetDeviceId: action.targetDeviceId,
      targetBindingId: action.targetBindingId,
      actionType,
      metadata: action.metadata ?? null,
      createdAt: action.createdAt.toISOString(),
    }
  }

  private normalizeAdminActionType(actionType: string): AdminActionType {
    const knownActionTypes = new Set<AdminActionType>([
      "DEVICE_REVOKE",
      "DEVICE_APPROVE_REPLACEMENT",
      "USER_STATUS_CHANGE",
      "ENROLLMENT_OVERRIDE",
      "JOIN_CODE_RESET",
      "ROSTER_IMPORT_APPLY",
      "SESSION_OVERRIDE",
      "SEMESTER_ARCHIVE",
      "CLASSROOM_ARCHIVE",
      "CLASSROOM_STUDENT_REMOVE",
    ])

    return knownActionTypes.has(actionType as AdminActionType)
      ? (actionType as AdminActionType)
      : "DEVICE_REVOKE"
  }

  private isRecoveryAction(actionType: string): boolean {
    const normalizedAction = this.normalizeAdminActionType(actionType)

    return normalizedAction === "DEVICE_REVOKE" || normalizedAction === "DEVICE_APPROVE_REPLACEMENT"
  }

  private isRecoveryRiskEvent(eventType: SecurityEventRecord["eventType"]): boolean {
    return [
      "DEVICE_REVOKED",
      "ATTENDANCE_BLOCKED_UNTRUSTED_DEVICE",
      "MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT",
      "SECOND_DEVICE_FOR_STUDENT_ATTEMPT",
      "REVOKED_DEVICE_USED",
      "LOGIN_RISK_DETECTED",
    ].includes(eventType)
  }
}
