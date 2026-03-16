import type { PrismaTransactionClient } from "@attendease/db"
import { NotFoundException } from "@nestjs/common"

import type {
  AdminDeviceSupportDependencies,
  BindingRecord,
  StudentRecord,
} from "./admin-device-support.service.types.js"

export class AdminDeviceSupportServiceSharedCore {
  protected readonly database: AdminDeviceSupportDependencies["database"]
  protected readonly deviceBindingPolicyService: AdminDeviceSupportDependencies["deviceBindingPolicyService"]

  constructor(protected readonly deps: AdminDeviceSupportDependencies) {
    this.database = deps.database
    this.deviceBindingPolicyService = deps.deviceBindingPolicyService
  }

  protected async requireStudent(studentId: string): Promise<StudentRecord> {
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

  protected async requireStudentBinding(bindingId: string): Promise<BindingRecord> {
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

  protected async revokeStudentSessions(
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
}
