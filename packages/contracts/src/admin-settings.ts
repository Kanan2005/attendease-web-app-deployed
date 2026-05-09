import { z } from "zod"

// ---------------------------------------------------------------------------
// Academic — informational read-only listings.
// ---------------------------------------------------------------------------

export const adminSettingsAcademicResponseSchema = z.object({
  branches: z.array(
    z.object({
      name: z.string(),
      studentCount: z.number().int().nonnegative(),
    }),
  ),
  departments: z.array(
    z.object({
      name: z.string(),
      teacherCount: z.number().int().nonnegative(),
    }),
  ),
  semesterStatusCounts: z.object({
    active: z.number().int().nonnegative(),
    closed: z.number().int().nonnegative(),
    archived: z.number().int().nonnegative(),
  }),
  classCount: z.number().int().nonnegative(),
  sectionCount: z.number().int().nonnegative(),
})
export type AdminSettingsAcademicResponse = z.infer<typeof adminSettingsAcademicResponseSchema>

// ---------------------------------------------------------------------------
// System — institution-wide defaults.
// ---------------------------------------------------------------------------

export const adminSettingsSystemSchema = z.object({
  gpsRadiusMeters: z.number().int().min(5).max(500),
  qrRotationWindowSeconds: z.number().int().min(2).max(60),
  bluetoothRotationWindowSeconds: z.number().int().min(2).max(60),
  defaultAttendanceMode: z.enum(["QR", "BLUETOOTH"]),
  lowAttendanceThresholdPercent: z.number().int().min(40).max(100),
})
export type AdminSettingsSystem = z.infer<typeof adminSettingsSystemSchema>

export const adminSettingsSystemResponseSchema = z.object({
  values: adminSettingsSystemSchema,
  updatedAt: z.string().datetime().nullable(),
  updatedBy: z
    .object({
      userId: z.string(),
      displayName: z.string(),
      email: z.string().email(),
    })
    .nullable(),
})
export type AdminSettingsSystemResponse = z.infer<typeof adminSettingsSystemResponseSchema>

export const adminSettingsSystemUpdateRequestSchema = adminSettingsSystemSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one setting to update.",
  })
export type AdminSettingsSystemUpdateRequest = z.infer<
  typeof adminSettingsSystemUpdateRequestSchema
>

// ---------------------------------------------------------------------------
// Admins — list, invite, revoke.
// ---------------------------------------------------------------------------

export const adminSettingsAdminUserSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  status: z.enum(["ACTIVE", "PENDING", "BLOCKED", "ARCHIVED", "SUSPENDED"]),
  isSelf: z.boolean(),
  hasOtherRoles: z.boolean(),
  lastLoginAt: z.string().datetime().nullable(),
  addedAt: z.string().datetime(),
})
export type AdminSettingsAdminUser = z.infer<typeof adminSettingsAdminUserSchema>

export const adminSettingsAdminListResponseSchema = z.object({
  admins: z.array(adminSettingsAdminUserSchema),
})
export type AdminSettingsAdminListResponse = z.infer<typeof adminSettingsAdminListResponseSchema>

export const adminSettingsAdminInviteRequestSchema = z.object({
  email: z.string().email(),
  displayName: z.string().trim().min(1).max(120),
})
export type AdminSettingsAdminInviteRequest = z.infer<typeof adminSettingsAdminInviteRequestSchema>

export const adminSettingsAdminInviteResponseSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  // Returned exactly once: the temporary password the inviter shares with
  // the invitee. The server stores only the hash. The invitee should change
  // it via Settings → Security after first login.
  temporaryPassword: z.string(),
  alreadyHadAccount: z.boolean(),
  alreadyAdmin: z.boolean(),
})
export type AdminSettingsAdminInviteResponse = z.infer<
  typeof adminSettingsAdminInviteResponseSchema
>

export const adminSettingsAdminRevokeRequestSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
})
export type AdminSettingsAdminRevokeRequest = z.infer<typeof adminSettingsAdminRevokeRequestSchema>

export const adminSettingsAdminRevokeResponseSchema = z.object({
  userId: z.string(),
  removedAdminRole: z.boolean(),
  remainingRoles: z.array(z.enum(["STUDENT", "TEACHER", "ADMIN"])),
})
export type AdminSettingsAdminRevokeResponse = z.infer<
  typeof adminSettingsAdminRevokeResponseSchema
>

// ---------------------------------------------------------------------------
// Security — change own password.
// ---------------------------------------------------------------------------

export const adminSettingsChangePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(8).max(200),
    newPassword: z.string().min(8).max(200),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "New password must differ from the current one.",
  })
export type AdminSettingsChangePasswordRequest = z.infer<
  typeof adminSettingsChangePasswordRequestSchema
>

export const adminSettingsChangePasswordResponseSchema = z.object({
  changedAt: z.string().datetime(),
})
export type AdminSettingsChangePasswordResponse = z.infer<
  typeof adminSettingsChangePasswordResponseSchema
>
