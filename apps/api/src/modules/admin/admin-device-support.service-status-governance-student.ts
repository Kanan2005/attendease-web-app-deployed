import type { AdminUpdateStudentStatusRequest } from "@attendease/contracts"
import { recordAdministrativeActionTrail, runInTransaction } from "@attendease/db"
import type { AuthRequestContext } from "../auth/auth.types.js"

import { AdminDeviceSupportServiceShared } from "./admin-device-support.service.shared.js"

export class AdminDeviceSupportServiceStatusGovernanceStudent extends AdminDeviceSupportServiceShared {
  async updateStudentStatus(
    auth: AuthRequestContext,
    studentId: string,
    request: AdminUpdateStudentStatusRequest,
  ): Promise<{ revokedSessionCount: number }> {
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
      revokedSessionCount,
    }
  }
}
