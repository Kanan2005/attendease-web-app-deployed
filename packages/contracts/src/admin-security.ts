import { z } from "zod"

import {
  appRoleSchema,
  authSessionStatusSchema,
  sessionPlatformSchema,
} from "./auth"
import {
  adminActionTypeSchema,
  securityEventSeveritySchema,
  securityEventTypeSchema,
} from "./devices"

// ---------------------------------------------------------------------------
// Security Event Audit Log — GET /admin/security/events
// ---------------------------------------------------------------------------

export const adminSecurityAuditQuerySchema = z.object({
  eventType: securityEventTypeSchema.optional(),
  severity: securityEventSeveritySchema.optional(),
  userId: z.string().min(1).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})
export type AdminSecurityAuditQuery = z.infer<typeof adminSecurityAuditQuerySchema>

export const adminSecurityAuditEventSchema = z.object({
  id: z.string().min(1),
  eventType: z.string().min(1),
  severity: z.string().min(1),
  description: z.string().nullable(),
  userId: z.string().nullable(),
  userEmail: z.string().nullable(),
  userDisplayName: z.string().nullable(),
  actorUserId: z.string().nullable(),
  actorEmail: z.string().nullable(),
  actorDisplayName: z.string().nullable(),
  deviceId: z.string().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.string().min(1),
})
export type AdminSecurityAuditEvent = z.infer<typeof adminSecurityAuditEventSchema>

export const adminSecurityAuditResponseSchema = z.object({
  events: z.array(adminSecurityAuditEventSchema),
  totalCount: z.number().int().nonnegative(),
  nextCursor: z.string().nullable(),
})
export type AdminSecurityAuditResponse = z.infer<typeof adminSecurityAuditResponseSchema>

// ---------------------------------------------------------------------------
// Admin Action Audit Log — GET /admin/security/actions
// ---------------------------------------------------------------------------

export const adminActionAuditQuerySchema = z.object({
  actionType: adminActionTypeSchema.optional(),
  adminUserId: z.string().min(1).optional(),
  targetUserId: z.string().min(1).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})
export type AdminActionAuditQuery = z.infer<typeof adminActionAuditQuerySchema>

export const adminActionAuditEventSchema = z.object({
  id: z.string().min(1),
  actionType: z.string().min(1),
  adminUserId: z.string().min(1),
  adminEmail: z.string().min(1),
  adminDisplayName: z.string().min(1),
  targetUserId: z.string().nullable(),
  targetEmail: z.string().nullable(),
  targetDisplayName: z.string().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.string().min(1),
})
export type AdminActionAuditEvent = z.infer<typeof adminActionAuditEventSchema>

export const adminActionAuditResponseSchema = z.object({
  actions: z.array(adminActionAuditEventSchema),
  totalCount: z.number().int().nonnegative(),
  nextCursor: z.string().nullable(),
})
export type AdminActionAuditResponse = z.infer<typeof adminActionAuditResponseSchema>

// ---------------------------------------------------------------------------
// User Sessions — GET /admin/users/:userId/sessions
// ---------------------------------------------------------------------------

export const adminUserSessionsQuerySchema = z.object({
  status: authSessionStatusSchema.optional(),
})
export type AdminUserSessionsQuery = z.infer<typeof adminUserSessionsQuerySchema>

export const adminUserSessionSchema = z.object({
  id: z.string().min(1),
  platform: sessionPlatformSchema,
  activeRole: appRoleSchema,
  status: authSessionStatusSchema,
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  lastActivityAt: z.string().min(1),
  expiresAt: z.string().min(1),
  revokedAt: z.string().nullable(),
  createdAt: z.string().min(1),
})
export type AdminUserSession = z.infer<typeof adminUserSessionSchema>

export const adminUserSessionsResponseSchema = z.object({
  userId: z.string().min(1),
  sessions: z.array(adminUserSessionSchema),
  totalCount: z.number().int().nonnegative(),
})
export type AdminUserSessionsResponse = z.infer<typeof adminUserSessionsResponseSchema>

// ---------------------------------------------------------------------------
// Force Logout — POST /admin/users/:userId/force-logout
// ---------------------------------------------------------------------------

export const adminForceLogoutResponseSchema = z.object({
  userId: z.string().min(1),
  revokedCount: z.number().int().nonnegative(),
})
export type AdminForceLogoutResponse = z.infer<typeof adminForceLogoutResponseSchema>
