import { randomBytes } from "node:crypto"
import { hashPassword, verifyPassword } from "@attendease/auth/password"
import type {
  AdminSettingsAcademicResponse,
  AdminSettingsAdminInviteRequest,
  AdminSettingsAdminInviteResponse,
  AdminSettingsAdminListResponse,
  AdminSettingsAdminRevokeRequest,
  AdminSettingsAdminRevokeResponse,
  AdminSettingsChangePasswordRequest,
  AdminSettingsChangePasswordResponse,
  AdminSettingsSystem,
  AdminSettingsSystemResponse,
  AdminSettingsSystemUpdateRequest,
} from "@attendease/contracts"
import type { Prisma } from "@attendease/db"
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"

const SYSTEM_DEFAULTS: AdminSettingsSystem = {
  gpsRadiusMeters: 50,
  qrRotationWindowSeconds: 5,
  bluetoothRotationWindowSeconds: 8,
  defaultAttendanceMode: "QR",
  lowAttendanceThresholdPercent: 75,
}

const SYSTEM_KEYS = Object.keys(SYSTEM_DEFAULTS) as (keyof AdminSettingsSystem)[]
const SYSTEM_KEY_PREFIX = "system."

@Injectable()
export class AdminSettingsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  // -------------------------------------------------------------------
  // Academic — informational read-only.
  // -------------------------------------------------------------------
  async getAcademic(): Promise<AdminSettingsAcademicResponse> {
    const [branchGroups, departmentGroups, semesterGroups, classCount, sectionCount] =
      await Promise.all([
        this.database.prisma.studentProfile.groupBy({
          by: ["branch"],
          where: { branch: { not: null } },
          _count: { branch: true },
          orderBy: { branch: "asc" },
        }),
        this.database.prisma.teacherProfile.groupBy({
          by: ["department"],
          where: { department: { not: null } },
          _count: { department: true },
          orderBy: { department: "asc" },
        }),
        this.database.prisma.semester.groupBy({
          by: ["status"],
          _count: { status: true },
        }),
        this.database.prisma.academicClass.count(),
        this.database.prisma.section.count(),
      ])

    const semesterStatusCounts = { active: 0, closed: 0, archived: 0 }
    for (const group of semesterGroups) {
      if (group.status === "ACTIVE") semesterStatusCounts.active = group._count.status
      else if (group.status === "CLOSED") semesterStatusCounts.closed = group._count.status
      else if (group.status === "ARCHIVED") semesterStatusCounts.archived = group._count.status
    }

    return {
      branches: branchGroups
        .filter((row): row is typeof row & { branch: string } => row.branch !== null)
        .map((row) => ({ name: row.branch, studentCount: row._count.branch })),
      departments: departmentGroups
        .filter((row): row is typeof row & { department: string } => row.department !== null)
        .map((row) => ({ name: row.department, teacherCount: row._count.department })),
      semesterStatusCounts,
      classCount,
      sectionCount,
    }
  }

  // -------------------------------------------------------------------
  // System — institution-wide defaults.
  // -------------------------------------------------------------------
  async getSystem(): Promise<AdminSettingsSystemResponse> {
    const rows = await this.database.prisma.systemSetting.findMany({
      where: { key: { startsWith: SYSTEM_KEY_PREFIX } },
      include: {
        updatedBy: {
          select: { id: true, displayName: true, email: true },
        },
      },
    })

    const values = { ...SYSTEM_DEFAULTS }
    let latestUpdatedAt: Date | null = null
    let latestUpdatedBy: { userId: string; displayName: string; email: string } | null = null

    for (const row of rows) {
      const shortKey = row.key.slice(SYSTEM_KEY_PREFIX.length) as keyof AdminSettingsSystem
      if (!SYSTEM_KEYS.includes(shortKey)) continue
      const parsed = coerceSystemValue(shortKey, row.value)
      if (parsed !== undefined) {
        Object.assign(values, { [shortKey]: parsed })
      }
      if (!latestUpdatedAt || row.updatedAt > latestUpdatedAt) {
        latestUpdatedAt = row.updatedAt
        latestUpdatedBy = row.updatedBy
          ? {
              userId: row.updatedBy.id,
              displayName: row.updatedBy.displayName,
              email: row.updatedBy.email,
            }
          : null
      }
    }

    return {
      values,
      updatedAt: latestUpdatedAt?.toISOString() ?? null,
      updatedBy: latestUpdatedBy,
    }
  }

  async updateSystem(
    auth: AuthRequestContext,
    request: AdminSettingsSystemUpdateRequest,
  ): Promise<AdminSettingsSystemResponse> {
    const updates = Object.entries(request) as Array<
      [keyof AdminSettingsSystem, AdminSettingsSystem[keyof AdminSettingsSystem]]
    >

    await this.database.prisma.$transaction(
      updates.map(([key, value]) =>
        this.database.prisma.systemSetting.upsert({
          where: { key: `${SYSTEM_KEY_PREFIX}${key}` },
          create: {
            key: `${SYSTEM_KEY_PREFIX}${key}`,
            value: value as Prisma.InputJsonValue,
            updatedByUserId: auth.userId,
          },
          update: {
            value: value as Prisma.InputJsonValue,
            updatedByUserId: auth.userId,
          },
        }),
      ),
    )

    await this.database.prisma.adminActionLog.create({
      data: {
        adminUserId: auth.userId,
        actionType: "SYSTEM_SETTING_UPDATE",
        metadata: {
          updatedKeys: updates.map(([key]) => key),
          values: request as Prisma.InputJsonValue,
        },
      },
    })

    return this.getSystem()
  }

  // -------------------------------------------------------------------
  // Admins — list, invite, revoke.
  // -------------------------------------------------------------------
  async listAdmins(auth: AuthRequestContext): Promise<AdminSettingsAdminListResponse> {
    const adminRoles = await this.database.prisma.userRole.findMany({
      where: { role: "ADMIN" },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            status: true,
            lastLoginAt: true,
            roles: { select: { role: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return {
      admins: adminRoles.map((assignment) => ({
        userId: assignment.user.id,
        displayName: assignment.user.displayName,
        email: assignment.user.email,
        status: assignment.user.status,
        isSelf: assignment.user.id === auth.userId,
        hasOtherRoles: assignment.user.roles.some((r) => r.role !== "ADMIN"),
        lastLoginAt: assignment.user.lastLoginAt?.toISOString() ?? null,
        addedAt: assignment.createdAt.toISOString(),
      })),
    }
  }

  async inviteAdmin(
    auth: AuthRequestContext,
    request: AdminSettingsAdminInviteRequest,
  ): Promise<AdminSettingsAdminInviteResponse> {
    const normalizedEmail = request.email.trim().toLowerCase()

    const existing = await this.database.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { roles: { select: { role: true } } },
    })

    const temporaryPassword = generateTemporaryPassword()
    const passwordHash = await hashPassword(temporaryPassword)

    let userId: string
    let alreadyHadAccount = false
    let alreadyAdmin = false

    if (existing) {
      alreadyHadAccount = true
      alreadyAdmin = existing.roles.some((r) => r.role === "ADMIN")
      userId = existing.id

      // Always (re)set the password so the inviter has something concrete
      // to share. Existing sessions are not invalidated here — that would
      // require a session-revocation flow we can add in a future phase.
      await this.database.prisma.userCredential.upsert({
        where: { userId },
        create: { userId, passwordHash, passwordChangedAt: new Date() },
        update: { passwordHash, passwordChangedAt: new Date() },
      })

      if (!alreadyAdmin) {
        await this.database.prisma.userRole.create({
          data: { userId, role: "ADMIN" },
        })
      }
    } else {
      const created = await this.database.prisma.user.create({
        data: {
          email: normalizedEmail,
          displayName: request.displayName.trim(),
          status: "ACTIVE",
          credentials: {
            create: { passwordHash, passwordChangedAt: new Date() },
          },
          roles: { create: { role: "ADMIN" } },
        },
        select: { id: true },
      })
      userId = created.id
    }

    await this.database.prisma.adminActionLog.create({
      data: {
        adminUserId: auth.userId,
        actionType: "ADMIN_INVITE",
        targetUserId: userId,
        metadata: {
          email: normalizedEmail,
          alreadyHadAccount,
          alreadyAdmin,
        },
      },
    })

    return {
      userId,
      email: normalizedEmail,
      displayName: request.displayName.trim(),
      temporaryPassword,
      alreadyHadAccount,
      alreadyAdmin,
    }
  }

  async revokeAdmin(
    auth: AuthRequestContext,
    targetUserId: string,
    request: AdminSettingsAdminRevokeRequest,
  ): Promise<AdminSettingsAdminRevokeResponse> {
    if (targetUserId === auth.userId) {
      throw new ForbiddenException(
        "You cannot revoke your own admin role. Ask another admin to do this for you.",
      )
    }

    const targetUser = await this.database.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { roles: { select: { role: true } } },
    })
    if (!targetUser) {
      throw new NotFoundException(`User ${targetUserId} not found.`)
    }

    // Refuse to leave the institution with zero admins.
    const adminCount = await this.database.prisma.userRole.count({
      where: { role: "ADMIN" },
    })
    if (adminCount <= 1) {
      throw new BadRequestException(
        "Cannot revoke the only remaining admin. Invite another admin first.",
      )
    }

    const removed = await this.database.prisma.userRole.deleteMany({
      where: { userId: targetUserId, role: "ADMIN" },
    })

    if (removed.count > 0) {
      await this.database.prisma.adminActionLog.create({
        data: {
          adminUserId: auth.userId,
          actionType: "ADMIN_ROLE_REVOKE",
          targetUserId,
          metadata: {
            ...(request.reason ? { reason: request.reason } : {}),
            previousRoles: targetUser.roles.map((r) => r.role),
          },
        },
      })
    }

    const remainingRoles = targetUser.roles.filter((r) => r.role !== "ADMIN").map((r) => r.role)

    return {
      userId: targetUserId,
      removedAdminRole: removed.count > 0,
      remainingRoles,
    }
  }

  // -------------------------------------------------------------------
  // Security — change own password.
  // -------------------------------------------------------------------
  async changeOwnPassword(
    auth: AuthRequestContext,
    request: AdminSettingsChangePasswordRequest,
  ): Promise<AdminSettingsChangePasswordResponse> {
    const credentials = await this.database.prisma.userCredential.findUnique({
      where: { userId: auth.userId },
    })
    if (!credentials) {
      throw new UnauthorizedException("This account does not have password credentials.")
    }

    const valid = await verifyPassword(request.currentPassword, credentials.passwordHash)
    if (!valid) {
      throw new UnauthorizedException("Current password is incorrect.")
    }

    const newHash = await hashPassword(request.newPassword)
    const now = new Date()
    await this.database.prisma.userCredential.update({
      where: { userId: auth.userId },
      data: { passwordHash: newHash, passwordChangedAt: now },
    })

    return { changedAt: now.toISOString() }
  }
}

// ----------------------------- helpers -----------------------------

function coerceSystemValue(
  key: keyof AdminSettingsSystem,
  raw: unknown,
): AdminSettingsSystem[keyof AdminSettingsSystem] | undefined {
  if (raw === null || raw === undefined) return undefined
  if (key === "defaultAttendanceMode") {
    return typeof raw === "string" && (raw === "QR" || raw === "BLUETOOTH") ? raw : undefined
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.round(raw)
  }
  if (typeof raw === "string") {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) return Math.round(parsed)
  }
  return undefined
}

function generateTemporaryPassword(): string {
  // 12 random base32-ish characters, easy to read aloud and copy. The pool
  // omits visually similar chars (0/O, 1/I/l).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = randomBytes(12)
  let out = ""
  for (let i = 0; i < 12; i += 1) {
    const b = bytes[i] ?? 0
    out += alphabet[b % alphabet.length]
  }
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`
}
