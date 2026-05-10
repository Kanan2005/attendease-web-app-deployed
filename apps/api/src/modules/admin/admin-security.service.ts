import type {
  AdminActionAuditEvent,
  AdminActionAuditQuery,
  AdminActionAuditResponse,
  AdminForceLogoutResponse,
  AdminSecurityAuditEvent,
  AdminSecurityAuditQuery,
  AdminSecurityAuditResponse,
  AdminUserSession,
  AdminUserSessionsQuery,
  AdminUserSessionsResponse,
} from "@attendease/contracts"
import { Inject, Injectable, NotFoundException } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"

@Injectable()
export class AdminSecurityService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}

  // -------------------------------------------------------------------------
  // Security events (system-generated)
  // -------------------------------------------------------------------------

  async listSecurityEvents(query: AdminSecurityAuditQuery): Promise<AdminSecurityAuditResponse> {
    const prisma = this.database.prisma
    const limit = query.limit

    const baseWhere: Record<string, unknown> = {}
    if (query.eventType) baseWhere.eventType = query.eventType
    if (query.severity) baseWhere.severity = query.severity
    if (query.userId) baseWhere.userId = query.userId
    if (query.fromDate || query.toDate) {
      const createdAt: Record<string, string> = {}
      if (query.fromDate) createdAt.gte = query.fromDate
      if (query.toDate) createdAt.lte = query.toDate
      baseWhere.createdAt = createdAt
    }

    const [rows, totalCount] = await Promise.all([
      prisma.securityEvent.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        include: {
          user: { select: { email: true, displayName: true } },
          actorUser: { select: { email: true, displayName: true } },
        },
      }),
      prisma.securityEvent.count({ where: baseWhere }),
    ])

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows

    const events: AdminSecurityAuditEvent[] = page.map((row) => ({
      id: row.id,
      eventType: row.eventType,
      severity: row.severity,
      description: row.description,
      userId: row.userId,
      userEmail: row.user?.email ?? null,
      userDisplayName: row.user?.displayName ?? null,
      actorUserId: row.actorUserId,
      actorEmail: row.actorUser?.email ?? null,
      actorDisplayName: row.actorUser?.displayName ?? null,
      deviceId: row.deviceId,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
    }))

    return {
      events,
      totalCount,
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    }
  }

  // -------------------------------------------------------------------------
  // Admin actions (admin-initiated)
  // -------------------------------------------------------------------------

  async listAdminActions(query: AdminActionAuditQuery): Promise<AdminActionAuditResponse> {
    const prisma = this.database.prisma
    const limit = query.limit

    const baseWhere: Record<string, unknown> = {}
    if (query.actionType) baseWhere.actionType = query.actionType
    if (query.adminUserId) baseWhere.adminUserId = query.adminUserId
    if (query.targetUserId) baseWhere.targetUserId = query.targetUserId
    if (query.fromDate || query.toDate) {
      const createdAt: Record<string, string> = {}
      if (query.fromDate) createdAt.gte = query.fromDate
      if (query.toDate) createdAt.lte = query.toDate
      baseWhere.createdAt = createdAt
    }

    const [rows, totalCount] = await Promise.all([
      prisma.adminActionLog.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        include: {
          adminUser: { select: { email: true, displayName: true } },
          targetUser: { select: { email: true, displayName: true } },
        },
      }),
      prisma.adminActionLog.count({ where: baseWhere }),
    ])

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows

    const actions: AdminActionAuditEvent[] = page.map((row) => ({
      id: row.id,
      actionType: row.actionType,
      adminUserId: row.adminUserId,
      adminEmail: row.adminUser.email,
      adminDisplayName: row.adminUser.displayName,
      targetUserId: row.targetUserId,
      targetEmail: row.targetUser?.email ?? null,
      targetDisplayName: row.targetUser?.displayName ?? null,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
    }))

    return {
      actions,
      totalCount,
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    }
  }

  // -------------------------------------------------------------------------
  // User sessions — GET /admin/users/:userId/sessions
  // -------------------------------------------------------------------------

  async listUserSessions(
    userId: string,
    query: AdminUserSessionsQuery,
  ): Promise<AdminUserSessionsResponse> {
    const prisma = this.database.prisma

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`)
    }

    const where: Record<string, unknown> = { userId }
    if (query.status) where.status = query.status

    const [rows, totalCount] = await Promise.all([
      prisma.authSession.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.authSession.count({ where }),
    ])

    const sessions: AdminUserSession[] = rows.map((row) => ({
      id: row.id,
      platform: row.platform,
      activeRole: row.activeRole,
      status: row.status,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      lastActivityAt: row.lastActivityAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      revokedAt: row.revokedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }))

    return { userId, sessions, totalCount }
  }

  // -------------------------------------------------------------------------
  // Force logout — POST /admin/users/:userId/force-logout
  // -------------------------------------------------------------------------

  async forceLogout(
    userId: string,
    adminUserId: string,
  ): Promise<AdminForceLogoutResponse> {
    const prisma = this.database.prisma

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`)
    }

    const now = new Date()

    const { count: revokedCount } = await prisma.authSession.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: now },
    })

    // Also revoke all active refresh tokens for the user
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    })

    // Log the admin action
    await prisma.adminActionLog.create({
      data: {
        adminUserId,
        targetUserId: userId,
        actionType: "USER_STATUS_CHANGE",
        metadata: {
          action: "FORCE_LOGOUT",
          revokedSessionCount: revokedCount,
        },
      },
    })

    return { userId, revokedCount }
  }
}
