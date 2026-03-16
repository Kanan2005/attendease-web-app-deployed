import type { AdminActionType } from "@attendease/contracts"
import type { PrismaTransactionClient } from "@attendease/db"

import type { DatabaseService } from "../../database/database.service.js"
import type { DeviceBindingPolicyService } from "../devices/device-binding-policy.service.js"

export type StudentRecord = {
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
  device: DeviceRecord
}

export type SecurityEventRecord = {
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

export type AdminActionRecord = {
  id: string
  adminUserId: string
  targetUserId: string | null
  targetDeviceId: string | null
  targetBindingId: string | null
  actionType: string
  metadata: unknown
  createdAt: Date
}

export type EnrollmentRecord = {
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

export type AdminDeviceSupportDependencies = {
  database: DatabaseService
  deviceBindingPolicyService: DeviceBindingPolicyService
}

export type RevokeStudentSessions = (
  transaction: PrismaTransactionClient,
  studentId: string,
  revokedAt: Date,
) => Promise<number>

export const DEFAULT_ADMIN_ACTION_TYPES = new Set<AdminActionType>([
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
