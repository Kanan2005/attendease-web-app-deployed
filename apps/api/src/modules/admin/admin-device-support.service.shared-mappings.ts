import type {
  AdminActionLogSummary,
  AdminActionType,
  AdminDeviceBindingRecord,
  AdminDeviceRecoverySummary,
  AdminStudentClassroomContext,
  AdminStudentEnrollmentCounts,
  AdminStudentIdentityDetail,
  AdminStudentIdentitySummary,
  AdminStudentStatusActions,
  AttendanceDeviceLifecycleState,
  DeviceSummary,
  DeviceSupportStudent,
  SecurityEventSummary,
} from "@attendease/contracts"
import { ForbiddenException } from "@nestjs/common"

import { AdminDeviceSupportServiceSharedCore } from "./admin-device-support.service.shared-core.js"
import { DEFAULT_ADMIN_ACTION_TYPES } from "./admin-device-support.service.types.js"
import type {
  AdminActionRecord,
  BindingRecord,
  DeviceRecord,
  EnrollmentRecord,
  SecurityEventRecord,
  StudentRecord,
} from "./admin-device-support.service.types.js"

export class AdminDeviceSupportServiceSharedMappings extends AdminDeviceSupportServiceSharedCore {
  protected toStudentSummary(student: StudentRecord): DeviceSupportStudent {
    return {
      id: student.id,
      email: student.email,
      displayName: student.displayName,
      rollNumber: student.studentProfile?.rollNumber ?? null,
      status: student.status,
      attendanceDisabled: student.studentProfile?.attendanceDisabled ?? false,
    }
  }

  protected toStudentIdentitySummary(student: StudentRecord): AdminStudentIdentitySummary {
    return {
      ...this.toStudentSummary(student),
      lastLoginAt: student.lastLoginAt?.toISOString() ?? null,
    }
  }

  protected toStudentIdentityDetail(student: StudentRecord): AdminStudentIdentityDetail {
    return {
      ...this.toStudentIdentitySummary(student),
      createdAt: student.createdAt.toISOString(),
      programName: student.studentProfile?.programName ?? null,
      currentSemester: student.studentProfile?.currentSemester ?? null,
    }
  }

  protected buildRecoverySummary(input: {
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

  protected toBindingRecord(binding: BindingRecord): AdminDeviceBindingRecord {
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

  protected toDeviceSummary(device: DeviceRecord): DeviceSummary {
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

  protected resolveAttendanceDeviceState(input: {
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

  protected toSecurityEventSummary(event: SecurityEventRecord): SecurityEventSummary {
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

  protected toEnrollmentCounts(
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

  protected toStudentClassroomContext(enrollment: EnrollmentRecord): AdminStudentClassroomContext {
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

  protected buildStudentStatusActions(status: StudentRecord["status"]): AdminStudentStatusActions {
    return {
      canReactivate: status === "BLOCKED" || status === "PENDING" || status === "SUSPENDED",
      canDeactivate: status === "ACTIVE",
      canArchive: status !== "ARCHIVED",
    }
  }

  protected assertStudentStatusTransition(
    currentStatus: StudentRecord["status"],
    nextStatus: "PENDING" | "ACTIVE" | "SUSPENDED" | "BLOCKED" | "ARCHIVED",
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

  protected toAdminActionSummary(action: AdminActionRecord): AdminActionLogSummary {
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

  protected normalizeAdminActionType(actionType: string): AdminActionType {
    return DEFAULT_ADMIN_ACTION_TYPES.has(actionType as AdminActionType)
      ? (actionType as AdminActionType)
      : "DEVICE_REVOKE"
  }

  protected isRecoveryAction(actionType: string): boolean {
    const normalizedAction = this.normalizeAdminActionType(actionType)

    return normalizedAction === "DEVICE_REVOKE" || normalizedAction === "DEVICE_APPROVE_REPLACEMENT"
  }

  protected isRecoveryRiskEvent(eventType: SecurityEventRecord["eventType"]): boolean {
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
