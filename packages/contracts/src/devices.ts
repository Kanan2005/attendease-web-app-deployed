import { z } from "zod"

import {
  courseOfferingStatusSchema,
  enrollmentStatusSchema,
  semesterStatusSchema,
} from "./academic"
import {
  attendanceDeviceLifecycleStateSchema,
  authDeviceRegistrationSchema,
  deviceAttestationStatusSchema,
  devicePlatformSchema,
  trustedDeviceContextSchema,
  userStatusSchema,
} from "./auth"

export const deviceBindingTypeValues = [
  "STUDENT_ATTENDANCE",
  "TEACHER_ACCESS",
  "ADMIN_ACCESS",
] as const
export const deviceBindingTypeSchema = z.enum(deviceBindingTypeValues)
export type DeviceBindingType = z.infer<typeof deviceBindingTypeSchema>

export const deviceBindingStatusValues = ["PENDING", "ACTIVE", "REVOKED", "BLOCKED"] as const
export const deviceBindingStatusSchema = z.enum(deviceBindingStatusValues)
export type DeviceBindingStatus = z.infer<typeof deviceBindingStatusSchema>

export const deviceRegistrationRequestSchema = authDeviceRegistrationSchema
export type DeviceRegistrationRequest = z.infer<typeof deviceRegistrationRequestSchema>

export const deviceSummarySchema = z.object({
  id: z.string().min(1),
  installId: z.string().min(8),
  platform: devicePlatformSchema,
  deviceModel: z.string().nullable(),
  osVersion: z.string().nullable(),
  appVersion: z.string().nullable(),
  publicKey: z.string().min(8),
  attestationStatus: deviceAttestationStatusSchema,
  attestationProvider: z.string().nullable(),
  attestedAt: z.string().datetime().nullable(),
  lastSeenAt: z.string().datetime(),
})
export type DeviceSummary = z.infer<typeof deviceSummarySchema>

export const deviceBindingSummarySchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  deviceId: z.string().min(1),
  bindingType: deviceBindingTypeSchema,
  status: deviceBindingStatusSchema,
  boundAt: z.string().datetime(),
  activatedAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
  revokeReason: z.string().nullable(),
})
export type DeviceBindingSummary = z.infer<typeof deviceBindingSummarySchema>

export const deviceRegistrationResponseSchema = z.object({
  device: deviceSummarySchema,
  binding: deviceBindingSummarySchema.nullable(),
  deviceTrust: trustedDeviceContextSchema,
})
export type DeviceRegistrationResponse = z.infer<typeof deviceRegistrationResponseSchema>

export const trustedDeviceAttendanceReadyResponseSchema = z.object({
  ready: z.literal(true),
  device: deviceSummarySchema,
  binding: deviceBindingSummarySchema,
  deviceTrust: trustedDeviceContextSchema,
})
export type TrustedDeviceAttendanceReadyResponse = z.infer<
  typeof trustedDeviceAttendanceReadyResponseSchema
>

export const securityEventTypeValues = [
  "DEVICE_BOUND",
  "DEVICE_REVOKED",
  "ATTENDANCE_BLOCKED_UNTRUSTED_DEVICE",
  "ATTENDANCE_LOCATION_VALIDATION_FAILED",
  "ATTENDANCE_BLUETOOTH_VALIDATION_FAILED",
  "MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT",
  "SECOND_DEVICE_FOR_STUDENT_ATTEMPT",
  "REVOKED_DEVICE_USED",
  "LOGIN_RISK_DETECTED",
] as const
export const securityEventTypeSchema = z.enum(securityEventTypeValues)
export type SecurityEventType = z.infer<typeof securityEventTypeSchema>

export const securityEventSeverityValues = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const
export const securityEventSeveritySchema = z.enum(securityEventSeverityValues)
export type SecurityEventSeverity = z.infer<typeof securityEventSeveritySchema>

export const adminActionTypeValues = [
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
] as const
export const adminActionTypeSchema = z.enum(adminActionTypeValues)
export type AdminActionType = z.infer<typeof adminActionTypeSchema>

export const deviceSupportStudentSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  rollNumber: z.string().nullable(),
  status: userStatusSchema,
  attendanceDisabled: z.boolean(),
})
export type DeviceSupportStudent = z.infer<typeof deviceSupportStudentSchema>

export const adminStudentIdentitySummarySchema = deviceSupportStudentSchema.extend({
  lastLoginAt: z.string().datetime().nullable(),
})
export type AdminStudentIdentitySummary = z.infer<typeof adminStudentIdentitySummarySchema>

export const adminStudentIdentityDetailSchema = adminStudentIdentitySummarySchema.extend({
  createdAt: z.string().datetime(),
  programName: z.string().nullable(),
  currentSemester: z.number().int().nullable(),
})
export type AdminStudentIdentityDetail = z.infer<typeof adminStudentIdentityDetailSchema>

export const adminDeviceBindingRecordSchema = z.object({
  binding: deviceBindingSummarySchema,
  device: deviceSummarySchema,
})
export type AdminDeviceBindingRecord = z.infer<typeof adminDeviceBindingRecordSchema>

export const securityEventSummarySchema = z.object({
  id: z.string().min(1),
  userId: z.string().nullable(),
  actorUserId: z.string().nullable(),
  deviceId: z.string().nullable(),
  bindingId: z.string().nullable(),
  eventType: securityEventTypeSchema,
  severity: securityEventSeveritySchema,
  description: z.string().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.string().datetime(),
})
export type SecurityEventSummary = z.infer<typeof securityEventSummarySchema>

export const adminActionLogSummarySchema = z.object({
  id: z.string().min(1),
  adminUserId: z.string().min(1),
  targetUserId: z.string().nullable(),
  targetDeviceId: z.string().nullable(),
  targetBindingId: z.string().nullable(),
  actionType: adminActionTypeSchema,
  metadata: z.unknown().nullable(),
  createdAt: z.string().datetime(),
})
export type AdminActionLogSummary = z.infer<typeof adminActionLogSummarySchema>

export const adminDeviceRecoveryRecommendedActionValues = [
  "NO_ACTION_REQUIRED",
  "APPROVE_PENDING_REPLACEMENT",
  "WAIT_FOR_REPLACEMENT_REGISTRATION",
  "REVIEW_BLOCKED_STATE",
] as const
export const adminDeviceRecoveryRecommendedActionSchema = z.enum(
  adminDeviceRecoveryRecommendedActionValues,
)
export type AdminDeviceRecoveryRecommendedAction = z.infer<
  typeof adminDeviceRecoveryRecommendedActionSchema
>

export const adminDeviceRecoveryActionsSchema = z.object({
  canDeregisterCurrentDevice: z.boolean(),
  canApproveReplacementDevice: z.boolean(),
  canRevokeActiveBinding: z.boolean(),
})
export type AdminDeviceRecoveryActions = z.infer<typeof adminDeviceRecoveryActionsSchema>

export const adminDeviceRecoverySummarySchema = z.object({
  activeBindingCount: z.number().int().nonnegative(),
  pendingBindingCount: z.number().int().nonnegative(),
  revokedBindingCount: z.number().int().nonnegative(),
  blockedBindingCount: z.number().int().nonnegative(),
  currentDeviceLabel: z.string().min(1).nullable(),
  pendingReplacementLabel: z.string().min(1).nullable(),
  latestRiskEvent: securityEventSummarySchema.nullable(),
  latestRecoveryAction: adminActionLogSummarySchema.nullable(),
  recommendedAction: adminDeviceRecoveryRecommendedActionSchema,
  recommendedActionLabel: z.string().min(1),
  recommendedActionMessage: z.string().min(1),
  strictPolicyNote: z.string().min(1),
  actions: adminDeviceRecoveryActionsSchema,
})
export type AdminDeviceRecoverySummary = z.infer<typeof adminDeviceRecoverySummarySchema>

export const adminDeviceSupportSummarySchema = z.object({
  student: deviceSupportStudentSchema,
  attendanceDeviceState: attendanceDeviceLifecycleStateSchema,
  activeBinding: adminDeviceBindingRecordSchema.nullable(),
  pendingBinding: adminDeviceBindingRecordSchema.nullable(),
  latestSecurityEvent: securityEventSummarySchema.nullable(),
  activeBindingCount: z.number().int().nonnegative(),
  revokedBindingCount: z.number().int().nonnegative(),
  recovery: adminDeviceRecoverySummarySchema,
})
export type AdminDeviceSupportSummary = z.infer<typeof adminDeviceSupportSummarySchema>

export const adminDeviceSupportDetailSchema = z.object({
  student: deviceSupportStudentSchema,
  attendanceDeviceState: attendanceDeviceLifecycleStateSchema,
  bindings: z.array(adminDeviceBindingRecordSchema),
  securityEvents: z.array(securityEventSummarySchema),
  adminActions: z.array(adminActionLogSummarySchema),
  recovery: adminDeviceRecoverySummarySchema,
})
export type AdminDeviceSupportDetail = z.infer<typeof adminDeviceSupportDetailSchema>

export const adminDeviceSupportSearchQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  status: deviceBindingStatusSchema.optional(),
  includeHistory: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().positive().max(100).default(20),
})
export type AdminDeviceSupportSearchQuery = z.infer<typeof adminDeviceSupportSearchQuerySchema>

export const adminStudentEnrollmentCountsSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  activeCount: z.number().int().nonnegative(),
  pendingCount: z.number().int().nonnegative(),
  blockedCount: z.number().int().nonnegative(),
  droppedCount: z.number().int().nonnegative(),
})
export type AdminStudentEnrollmentCounts = z.infer<typeof adminStudentEnrollmentCountsSchema>

export const adminStudentClassroomContextSchema = z.object({
  enrollmentId: z.string().min(1),
  classroomId: z.string().min(1),
  classroomTitle: z.string().min(1),
  courseCode: z.string().min(1),
  membershipStatus: enrollmentStatusSchema,
  classroomStatus: courseOfferingStatusSchema,
  semesterTitle: z.string().min(1),
  semesterStatus: semesterStatusSchema,
  joinedAt: z.string().datetime(),
  droppedAt: z.string().datetime().nullable(),
})
export type AdminStudentClassroomContext = z.infer<typeof adminStudentClassroomContextSchema>

export const adminStudentStatusActionsSchema = z.object({
  canReactivate: z.boolean(),
  canDeactivate: z.boolean(),
  canArchive: z.boolean(),
})
export type AdminStudentStatusActions = z.infer<typeof adminStudentStatusActionsSchema>

export const adminStudentManagementSummarySchema = z.object({
  student: adminStudentIdentitySummarySchema,
  attendanceDeviceState: attendanceDeviceLifecycleStateSchema,
  activeBinding: adminDeviceBindingRecordSchema.nullable(),
  pendingBinding: adminDeviceBindingRecordSchema.nullable(),
  latestSecurityEvent: securityEventSummarySchema.nullable(),
  latestAdminAction: adminActionLogSummarySchema.nullable(),
  enrollmentCounts: adminStudentEnrollmentCountsSchema,
  actions: adminStudentStatusActionsSchema,
})
export type AdminStudentManagementSummary = z.infer<typeof adminStudentManagementSummarySchema>

export const adminStudentManagementDetailSchema = z.object({
  student: adminStudentIdentityDetailSchema,
  attendanceDeviceState: attendanceDeviceLifecycleStateSchema,
  activeBinding: adminDeviceBindingRecordSchema.nullable(),
  pendingBinding: adminDeviceBindingRecordSchema.nullable(),
  enrollmentCounts: adminStudentEnrollmentCountsSchema,
  recentClassrooms: z.array(adminStudentClassroomContextSchema),
  securityEvents: z.array(securityEventSummarySchema),
  adminActions: z.array(adminActionLogSummarySchema),
  actions: adminStudentStatusActionsSchema,
})
export type AdminStudentManagementDetail = z.infer<typeof adminStudentManagementDetailSchema>

export const adminStudentManagementSearchQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  accountStatus: userStatusSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
})
export type AdminStudentManagementSearchQuery = z.infer<
  typeof adminStudentManagementSearchQuerySchema
>

export const studentSupportSearchQuerySchema = adminStudentManagementSearchQuerySchema
export type StudentSupportSearchQuery = z.infer<typeof studentSupportSearchQuerySchema>

export const adminUpdateStudentStatusRequestSchema = z.object({
  nextStatus: z.enum(["ACTIVE", "BLOCKED", "ARCHIVED"]),
  reason: z.string().trim().min(3).max(240),
})
export type AdminUpdateStudentStatusRequest = z.infer<typeof adminUpdateStudentStatusRequestSchema>

export const adminUpdateStudentStatusResponseSchema = z.object({
  student: adminStudentManagementDetailSchema,
  revokedSessionCount: z.number().int().nonnegative(),
})
export type AdminUpdateStudentStatusResponse = z.infer<
  typeof adminUpdateStudentStatusResponseSchema
>

export const adminRevokeDeviceBindingRequestSchema = z.object({
  reason: z.string().trim().min(3).max(240),
})
export type AdminRevokeDeviceBindingRequest = z.infer<typeof adminRevokeDeviceBindingRequestSchema>

export const revokeStudentDeviceRegistrationRequestSchema = adminRevokeDeviceBindingRequestSchema
export type RevokeStudentDeviceRegistrationRequest = z.infer<
  typeof revokeStudentDeviceRegistrationRequestSchema
>

export const adminDelinkStudentDevicesRequestSchema = z.object({
  reason: z.string().trim().min(3).max(240),
})
export type AdminDelinkStudentDevicesRequest = z.infer<
  typeof adminDelinkStudentDevicesRequestSchema
>

export const clearStudentDeviceRegistrationsRequestSchema = adminDelinkStudentDevicesRequestSchema
export type ClearStudentDeviceRegistrationsRequest = z.infer<
  typeof clearStudentDeviceRegistrationsRequestSchema
>

export const adminApproveReplacementDeviceRequestSchema = deviceRegistrationRequestSchema.extend({
  reason: z.string().trim().min(3).max(240),
})
export type AdminApproveReplacementDeviceRequest = z.infer<
  typeof adminApproveReplacementDeviceRequestSchema
>

export const approveReplacementStudentDeviceRequestSchema =
  adminApproveReplacementDeviceRequestSchema
export type ApproveReplacementStudentDeviceRequest = z.infer<
  typeof approveReplacementStudentDeviceRequestSchema
>

export const adminDeviceSupportSummariesResponseSchema = z.array(adminDeviceSupportSummarySchema)
export type AdminDeviceSupportSummariesResponse = z.infer<
  typeof adminDeviceSupportSummariesResponseSchema
>

export const adminStudentManagementSummariesResponseSchema = z.array(
  adminStudentManagementSummarySchema,
)
export type AdminStudentManagementSummariesResponse = z.infer<
  typeof adminStudentManagementSummariesResponseSchema
>

export const studentSupportCaseSummarySchema = adminStudentManagementSummarySchema
export type StudentSupportCaseSummary = z.infer<typeof studentSupportCaseSummarySchema>

export const studentSupportCasesResponseSchema = adminStudentManagementSummariesResponseSchema
export type StudentSupportCasesResponse = z.infer<typeof studentSupportCasesResponseSchema>

export const adminDelinkStudentDevicesResponseSchema = z.object({
  success: z.literal(true),
  revokedBindingCount: z.number().int().nonnegative(),
})
export type AdminDelinkStudentDevicesResponse = z.infer<
  typeof adminDelinkStudentDevicesResponseSchema
>

export const clearStudentDeviceRegistrationsResponseSchema = adminDelinkStudentDevicesResponseSchema
export type ClearStudentDeviceRegistrationsResponse = z.infer<
  typeof clearStudentDeviceRegistrationsResponseSchema
>

export const adminApproveReplacementDeviceResponseSchema = z.object({
  binding: adminDeviceBindingRecordSchema,
  revokedBindingCount: z.number().int().nonnegative(),
})
export type AdminApproveReplacementDeviceResponse = z.infer<
  typeof adminApproveReplacementDeviceResponseSchema
>

export const approveReplacementStudentDeviceResponseSchema =
  adminApproveReplacementDeviceResponseSchema
export type ApproveReplacementStudentDeviceResponse = z.infer<
  typeof approveReplacementStudentDeviceResponseSchema
>

export const studentSupportCaseDetailSchema = adminStudentManagementDetailSchema
export type StudentSupportCaseDetail = z.infer<typeof studentSupportCaseDetailSchema>
