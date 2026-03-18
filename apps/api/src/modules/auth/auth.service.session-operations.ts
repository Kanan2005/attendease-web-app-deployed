import { verifyAccessToken } from "@attendease/auth/tokens"
import {
  type AuthLogoutRequest,
  type AuthRefreshRequest,
  authMeResponseSchema,
  authOperationSuccessSchema,
} from "@attendease/contracts"
import { runInTransaction } from "@attendease/db"
import { NotFoundException, UnauthorizedException } from "@nestjs/common"

import {
  ensureDeviceTrustAllowsAuthentication,
  ensureUserIsActive,
  resolveRoleSelection,
  toRoles,
} from "./auth.service.policies.js"
import {
  buildAuthenticatedUser,
  createRawRefreshToken,
  createRefreshTokenExpiry,
  hashRefreshToken,
  issueTokenBundle,
} from "./auth.service.session.js"
import type { AuthServiceContext } from "./auth.service.types.js"
import type { AuthRequestContext } from "./auth.types.js"

export async function refreshSession(context: AuthServiceContext, request: AuthRefreshRequest) {
  const rawRefreshToken = request.refreshToken
  const refreshTokenHash = hashRefreshToken(rawRefreshToken)
  const refreshToken = await context.database.prisma.refreshToken.findUnique({
    where: {
      tokenHash: refreshTokenHash,
    },
    include: {
      session: true,
      user: {
        include: {
          roles: true,
        },
      },
    },
  })

  if (!refreshToken || refreshToken.revokedAt || refreshToken.expiresAt <= new Date()) {
    throw new UnauthorizedException("Refresh token is invalid or expired.")
  }

  if (refreshToken.session.status !== "ACTIVE" || refreshToken.session.expiresAt <= new Date()) {
    throw new UnauthorizedException("The session is no longer active.")
  }

  ensureUserIsActive(refreshToken.user.status)

  const availableRoles = toRoles(refreshToken.user.roles)
  const activeRole = resolveRoleSelection(
    availableRoles,
    request.requestedRole ?? refreshToken.session.activeRole,
  )
  const refreshTokenExpiresAt = createRefreshTokenExpiry(context)
  const nextRefreshTokenRaw = createRawRefreshToken()
  const nextRefreshTokenHash = hashRefreshToken(nextRefreshTokenRaw)

  const session = await runInTransaction(context.database.prisma, async (transaction) => {
    await transaction.refreshToken.update({
      where: {
        id: refreshToken.id,
      },
      data: {
        revokedAt: new Date(),
      },
    })

    const updatedSession = await transaction.authSession.update({
      where: {
        id: refreshToken.session.id,
      },
      data: {
        activeRole,
        expiresAt: refreshTokenExpiresAt,
        lastActivityAt: new Date(),
      },
    })

    await transaction.refreshToken.create({
      data: {
        sessionId: updatedSession.id,
        userId: refreshToken.user.id,
        tokenHash: nextRefreshTokenHash,
        expiresAt: refreshTokenExpiresAt,
        rotatedFromId: refreshToken.id,
      },
    })

    return updatedSession
  })

  const deviceTrust = await context.deviceBindingService.getSessionDeviceTrust({
    userId: refreshToken.user.id,
    activeRole,
    deviceId: session.deviceId,
  })
  ensureDeviceTrustAllowsAuthentication(context, activeRole, deviceTrust)

  const tokens = await issueTokenBundle(context, {
    userId: refreshToken.user.id,
    sessionId: session.id,
    availableRoles,
    activeRole,
    platform: session.platform,
    refreshToken: nextRefreshTokenRaw,
    refreshTokenExpiresAt,
  })

  return {
    user: buildAuthenticatedUser({
      sessionId: session.id,
      platform: session.platform,
      deviceTrust,
      user: refreshToken.user,
      availableRoles,
      activeRole,
    }),
    tokens,
  }
}

export async function logoutSession(
  context: AuthServiceContext,
  auth: AuthRequestContext,
  request: AuthLogoutRequest,
) {
  const now = new Date()
  const refreshTokenHash = request.refreshToken ? hashRefreshToken(request.refreshToken) : null

  await runInTransaction(context.database.prisma, async (transaction) => {
    await transaction.authSession.update({
      where: {
        id: auth.sessionId,
      },
      data: {
        status: "REVOKED",
        revokedAt: now,
      },
    })

    await transaction.refreshToken.updateMany({
      where: {
        sessionId: auth.sessionId,
        ...(refreshTokenHash ? { tokenHash: refreshTokenHash } : {}),
      },
      data: {
        revokedAt: now,
      },
    })
  })

  return authOperationSuccessSchema.parse({
    success: true,
  })
}

export async function getAuthenticatedUser(context: AuthServiceContext, auth: AuthRequestContext) {
  const user = await context.database.prisma.user.findUnique({
    where: {
      id: auth.userId,
    },
    include: {
      roles: true,
      studentProfile: { select: { rollNumber: true, degree: true, branch: true } },
    },
  })

  if (!user) {
    throw new NotFoundException("Authenticated user not found.")
  }

  const availableRoles = toRoles(user.roles)
  const deviceTrust = await context.deviceBindingService.getSessionDeviceTrust({
    userId: auth.userId,
    activeRole: auth.activeRole,
    deviceId: auth.deviceId,
  })

  const assignments =
    auth.activeRole === "TEACHER"
      ? await context.assignmentsService.listTeacherAssignments(auth.userId)
      : []
  const enrollments =
    auth.activeRole === "STUDENT"
      ? await context.enrollmentsService.listStudentEnrollments(auth.userId)
      : []

  return authMeResponseSchema.parse({
    user: buildAuthenticatedUser({
      sessionId: auth.sessionId,
      platform: auth.platform,
      deviceTrust,
      user,
      availableRoles,
      activeRole: auth.activeRole,
      rollNumber: user.studentProfile?.rollNumber ?? null,
      degree: user.studentProfile?.degree ?? null,
      branch: user.studentProfile?.branch ?? null,
    }),
    assignments,
    enrollments,
  })
}

export async function validateAccessTokenContext(
  context: AuthServiceContext,
  token: string,
): Promise<AuthRequestContext> {
  let payload: Awaited<ReturnType<typeof verifyAccessToken>>

  try {
    payload = await verifyAccessToken(token, {
      secret: context.env.AUTH_ACCESS_TOKEN_SECRET,
      issuer: context.env.AUTH_ISSUER,
      audience: context.env.AUTH_AUDIENCE,
    })
  } catch (err) {
    if (err instanceof Error && err.name === "JWTExpired") {
      throw new UnauthorizedException("Access token has expired. Sign in again.")
    }
    throw err
  }

  const session = await context.database.prisma.authSession.findUnique({
    where: {
      id: payload.sessionId,
    },
    include: {
      user: {
        include: {
          roles: true,
        },
      },
    },
  })

  if (
    !session ||
    session.userId !== payload.userId ||
    session.status !== "ACTIVE" ||
    session.expiresAt <= new Date() ||
    session.activeRole !== payload.activeRole
  ) {
    throw new UnauthorizedException("The access token is no longer valid.")
  }

  const availableRoles = toRoles(session.user.roles)

  if (
    availableRoles.length !== payload.availableRoles.length ||
    payload.availableRoles.some((role) => !availableRoles.includes(role))
  ) {
    throw new UnauthorizedException("The access token role context is stale.")
  }

  ensureUserIsActive(session.user.status)

  return {
    userId: session.userId,
    sessionId: session.id,
    activeRole: session.activeRole,
    availableRoles,
    platform: session.platform,
    deviceId: session.deviceId,
  }
}
