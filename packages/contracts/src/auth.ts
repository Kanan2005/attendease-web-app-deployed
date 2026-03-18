import { z } from "zod"

export const appRoleValues = ["ADMIN", "TEACHER", "STUDENT"] as const
export const appRoleSchema = z.enum(appRoleValues)
export type AppRole = z.infer<typeof appRoleSchema>

export const sessionPlatformValues = ["WEB", "MOBILE"] as const
export const sessionPlatformSchema = z.enum(sessionPlatformValues)
export type SessionPlatform = z.infer<typeof sessionPlatformSchema>

export const devicePlatformValues = ["ANDROID", "IOS", "WEB"] as const
export const devicePlatformSchema = z.enum(devicePlatformValues)
export type DevicePlatform = z.infer<typeof devicePlatformSchema>

export const deviceAttestationStatusValues = [
  "UNKNOWN",
  "PASSED",
  "FAILED",
  "NOT_SUPPORTED",
] as const
export const deviceAttestationStatusSchema = z.enum(deviceAttestationStatusValues)
export type DeviceAttestationStatus = z.infer<typeof deviceAttestationStatusSchema>

export const userStatusValues = ["PENDING", "ACTIVE", "SUSPENDED", "BLOCKED", "ARCHIVED"] as const
export const userStatusSchema = z.enum(userStatusValues)
export type UserStatus = z.infer<typeof userStatusSchema>

export const trustedDeviceStateValues = [
  "NOT_REQUIRED",
  "TRUSTED",
  "BLOCKED",
  "MISSING_CONTEXT",
] as const
export const trustedDeviceStateSchema = z.enum(trustedDeviceStateValues)
export type TrustedDeviceState = z.infer<typeof trustedDeviceStateSchema>

export const attendanceDeviceLifecycleStateValues = [
  "NOT_APPLICABLE",
  "UNREGISTERED",
  "TRUSTED",
  "PENDING_REPLACEMENT",
  "REPLACED",
  "BLOCKED",
] as const
export const attendanceDeviceLifecycleStateSchema = z.enum(attendanceDeviceLifecycleStateValues)
export type AttendanceDeviceLifecycleState = z.infer<typeof attendanceDeviceLifecycleStateSchema>

export const trustedDeviceReasonValues = [
  "NOT_STUDENT_ROLE",
  "DEVICE_BOUND",
  "MISSING_DEVICE_CONTEXT",
  "DEVICE_ALREADY_BOUND_TO_ANOTHER_STUDENT",
  "STUDENT_ALREADY_HAS_ANOTHER_DEVICE",
  "DEVICE_REPLACEMENT_PENDING_APPROVAL",
  "DEVICE_REPLACED",
  "DEVICE_BINDING_REVOKED",
  "DEVICE_ATTESTATION_FAILED",
] as const
export const trustedDeviceReasonSchema = z.enum(trustedDeviceReasonValues)
export type TrustedDeviceReason = z.infer<typeof trustedDeviceReasonSchema>

export const authDeviceRegistrationSchema = z.object({
  installId: z.string().min(8),
  platform: devicePlatformSchema,
  publicKey: z.string().min(8),
  appVersion: z.string().min(1).optional(),
  deviceModel: z.string().min(1).optional(),
  osVersion: z.string().min(1).optional(),
  attestationProvider: z.string().min(1).optional(),
  attestationToken: z.string().min(1).optional(),
})
export type AuthDeviceRegistration = z.infer<typeof authDeviceRegistrationSchema>

export const trustedDeviceContextSchema = z.object({
  state: trustedDeviceStateSchema,
  lifecycleState: attendanceDeviceLifecycleStateSchema.default("NOT_APPLICABLE"),
  reason: trustedDeviceReasonSchema.optional(),
  deviceId: z.string().nullable().default(null),
  bindingId: z.string().nullable().default(null),
})
export type TrustedDeviceContext = z.infer<typeof trustedDeviceContextSchema>

export const authenticatedUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  rollNumber: z.string().nullable().optional(),
  degree: z.string().nullable().optional(),
  branch: z.string().nullable().optional(),
  status: userStatusSchema,
  availableRoles: z.array(appRoleSchema).min(1),
  activeRole: appRoleSchema,
  sessionId: z.string().min(1),
  platform: sessionPlatformSchema,
  deviceTrust: trustedDeviceContextSchema,
})
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>

export const authTokenBundleSchema = z.object({
  accessToken: z.string().min(16),
  accessTokenExpiresAt: z.string().datetime(),
  refreshToken: z.string().min(16),
  refreshTokenExpiresAt: z.string().datetime(),
})
export type AuthTokenBundle = z.infer<typeof authTokenBundleSchema>

export const authSessionResponseSchema = z.object({
  user: authenticatedUserSchema,
  tokens: authTokenBundleSchema,
})
export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>

export const authOperationSuccessSchema = z.object({
  success: z.literal(true),
})
export type AuthOperationSuccess = z.infer<typeof authOperationSuccessSchema>

export const authLoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  platform: sessionPlatformSchema,
  requestedRole: appRoleSchema.optional(),
  device: authDeviceRegistrationSchema.optional(),
})
export type AuthLoginRequest = z.infer<typeof authLoginRequestSchema>

const authRegistrationBaseSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().trim().min(2).max(120),
})

export const studentDegreeValues = ["B.Tech", "M.Tech"] as const
export const studentDegreeSchema = z.enum(studentDegreeValues)
export type StudentDegree = z.infer<typeof studentDegreeSchema>

export const studentBranchValues = ["CSE", "ECE", "EE", "ME", "CHE", "Civil", "Meta"] as const
export const studentBranchSchema = z.enum(studentBranchValues)
export type StudentBranch = z.infer<typeof studentBranchSchema>

export const studentRegistrationRequestSchema = authRegistrationBaseSchema.extend({
  platform: z.literal("MOBILE"),
  device: authDeviceRegistrationSchema,
  degree: studentDegreeSchema.optional(),
  branch: studentBranchSchema.optional(),
})
export type StudentRegistrationRequest = z.infer<typeof studentRegistrationRequestSchema>

export const studentRegistrationNextStepValues = ["JOIN_CLASSROOM", "OPEN_HOME"] as const
export const studentRegistrationNextStepSchema = z.enum(studentRegistrationNextStepValues)
export type StudentRegistrationNextStep = z.infer<typeof studentRegistrationNextStepSchema>

export const studentRegistrationOnboardingSchema = z.object({
  recommendedNextStep: studentRegistrationNextStepSchema,
})
export type StudentRegistrationOnboarding = z.infer<typeof studentRegistrationOnboardingSchema>

export const teacherRegistrationRequestSchema = authRegistrationBaseSchema.extend({
  platform: sessionPlatformSchema,
  device: authDeviceRegistrationSchema.optional(),
})
export type TeacherRegistrationRequest = z.infer<typeof teacherRegistrationRequestSchema>

export const teacherRegistrationNextStepValues = ["OPEN_HOME"] as const
export const teacherRegistrationNextStepSchema = z.enum(teacherRegistrationNextStepValues)
export type TeacherRegistrationNextStep = z.infer<typeof teacherRegistrationNextStepSchema>

export const teacherRegistrationOnboardingSchema = z.object({
  recommendedNextStep: teacherRegistrationNextStepSchema,
})
export type TeacherRegistrationOnboarding = z.infer<typeof teacherRegistrationOnboardingSchema>

export const studentRegistrationResponseSchema = authSessionResponseSchema.extend({
  onboarding: studentRegistrationOnboardingSchema,
})
export type StudentRegistrationResponse = z.infer<typeof studentRegistrationResponseSchema>

export const teacherRegistrationResponseSchema = authSessionResponseSchema.extend({
  onboarding: teacherRegistrationOnboardingSchema,
})
export type TeacherRegistrationResponse = z.infer<typeof teacherRegistrationResponseSchema>

export const studentPasswordLoginRequestSchema = authLoginRequestSchema.extend({
  platform: z.literal("MOBILE"),
  requestedRole: z.literal("STUDENT"),
  device: authDeviceRegistrationSchema,
})
export type StudentPasswordLoginRequest = z.infer<typeof studentPasswordLoginRequestSchema>

export const teacherPasswordLoginRequestSchema = authLoginRequestSchema.extend({
  requestedRole: z.literal("TEACHER"),
})
export type TeacherPasswordLoginRequest = z.infer<typeof teacherPasswordLoginRequestSchema>

export const adminPasswordLoginRequestSchema = authLoginRequestSchema.extend({
  platform: z.literal("WEB"),
  requestedRole: z.literal("ADMIN"),
})
export type AdminPasswordLoginRequest = z.infer<typeof adminPasswordLoginRequestSchema>

export const authRefreshRequestSchema = z.object({
  refreshToken: z.string().min(16),
  requestedRole: appRoleSchema.optional(),
})
export type AuthRefreshRequest = z.infer<typeof authRefreshRequestSchema>

export const authLogoutRequestSchema = z.object({
  refreshToken: z.string().min(16).optional(),
})
export type AuthLogoutRequest = z.infer<typeof authLogoutRequestSchema>

const authGoogleExchangeRequestBaseSchema = z.object({
  platform: sessionPlatformSchema,
  requestedRole: appRoleSchema.optional(),
  device: authDeviceRegistrationSchema.optional(),
  idToken: z.string().min(16).optional(),
  authorizationCode: z.string().min(8).optional(),
  codeVerifier: z.string().min(8).optional(),
  redirectUri: z.string().url().optional(),
})

export const authGoogleExchangeRequestSchema = authGoogleExchangeRequestBaseSchema.refine(
  (value) => Boolean(value.idToken || value.authorizationCode),
  {
    message: "Either idToken or authorizationCode must be provided.",
    path: ["idToken"],
  },
)
export type AuthGoogleExchangeRequest = z.infer<typeof authGoogleExchangeRequestSchema>

export const studentGoogleExchangeRequestSchema = authGoogleExchangeRequestBaseSchema
  .extend({
    platform: z.literal("MOBILE"),
    requestedRole: z.literal("STUDENT"),
    device: authDeviceRegistrationSchema,
  })
  .refine((value) => Boolean(value.idToken || value.authorizationCode), {
    message: "Either idToken or authorizationCode must be provided.",
    path: ["idToken"],
  })
export type StudentGoogleExchangeRequest = z.infer<typeof studentGoogleExchangeRequestSchema>

export const teacherGoogleExchangeRequestSchema = authGoogleExchangeRequestBaseSchema
  .extend({
    requestedRole: z.literal("TEACHER"),
  })
  .refine((value) => Boolean(value.idToken || value.authorizationCode), {
    message: "Either idToken or authorizationCode must be provided.",
    path: ["idToken"],
  })
export type TeacherGoogleExchangeRequest = z.infer<typeof teacherGoogleExchangeRequestSchema>
