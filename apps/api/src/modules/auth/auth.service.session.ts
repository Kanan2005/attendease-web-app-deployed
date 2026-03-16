import { createHash, randomBytes } from "node:crypto"

import { issueAccessToken } from "@attendease/auth/tokens"
import {
  type AppRole,
  type AuthSessionResponse,
  type AuthenticatedUser,
  type SessionPlatform,
  type TrustedDeviceContext,
  authSessionResponseSchema,
} from "@attendease/contracts"
import { runInTransaction } from "@attendease/db"

import type {
  AuthServiceContext,
  CreateAuthenticatedSessionParams,
  SessionUserRecord,
} from "./auth.service.types.js"
import type { DeviceTrustEvaluation } from "./auth.types.js"

export async function createAuthenticatedSession(
  context: AuthServiceContext,
  params: CreateAuthenticatedSessionParams,
): Promise<AuthSessionResponse> {
  const refreshTokenRaw = createRawRefreshToken()
  const refreshTokenHash = hashRefreshToken(refreshTokenRaw)
  const refreshTokenExpiresAt = createRefreshTokenExpiry(context)

  const session = await runInTransaction(context.database.prisma, async (transaction) => {
    const createdSession = await transaction.authSession.create({
      data: {
        userId: params.user.id,
        deviceId: params.deviceTrust.deviceId,
        platform: params.platform,
        activeRole: params.activeRole,
        status: "ACTIVE",
        lastActivityAt: new Date(),
        expiresAt: refreshTokenExpiresAt,
      },
    })

    await transaction.refreshToken.create({
      data: {
        sessionId: createdSession.id,
        userId: params.user.id,
        tokenHash: refreshTokenHash,
        expiresAt: refreshTokenExpiresAt,
      },
    })

    await transaction.loginEvent.create({
      data: {
        userId: params.user.id,
        deviceId: params.deviceTrust.deviceId,
        provider: params.provider,
        email: params.user.email,
        status: "SUCCESS",
      },
    })

    await transaction.user.update({
      where: {
        id: params.user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    })

    return createdSession
  })

  const tokens = await issueTokenBundle(context, {
    userId: params.user.id,
    sessionId: session.id,
    availableRoles: params.availableRoles,
    activeRole: params.activeRole,
    platform: params.platform,
    refreshToken: refreshTokenRaw,
    refreshTokenExpiresAt,
  })

  return authSessionResponseSchema.parse({
    user: buildAuthenticatedUser({
      sessionId: session.id,
      platform: params.platform,
      deviceTrust: params.deviceTrust,
      user: params.user,
      availableRoles: params.availableRoles,
      activeRole: params.activeRole,
    }),
    tokens,
  })
}

export function buildAuthenticatedUser(input: {
  sessionId: string
  platform: SessionPlatform
  deviceTrust: TrustedDeviceContext
  user: Pick<SessionUserRecord, "id" | "email" | "displayName" | "status">
  availableRoles: AppRole[]
  activeRole: AppRole
}): AuthenticatedUser {
  return {
    id: input.user.id,
    email: input.user.email,
    displayName: input.user.displayName,
    status: input.user.status as AuthenticatedUser["status"],
    availableRoles: input.availableRoles,
    activeRole: input.activeRole,
    sessionId: input.sessionId,
    platform: input.platform,
    deviceTrust: input.deviceTrust,
  }
}

export async function issueTokenBundle(
  context: AuthServiceContext,
  params: {
    userId: string
    sessionId: string
    availableRoles: AppRole[]
    activeRole: AppRole
    platform: SessionPlatform
    refreshToken: string
    refreshTokenExpiresAt: Date
  },
) {
  const accessToken = await issueAccessToken(
    {
      userId: params.userId,
      sessionId: params.sessionId,
      activeRole: params.activeRole,
      availableRoles: params.availableRoles,
      platform: params.platform,
    },
    {
      secret: context.env.AUTH_ACCESS_TOKEN_SECRET,
      issuer: context.env.AUTH_ISSUER,
      audience: context.env.AUTH_AUDIENCE,
      expiresInMinutes: context.env.AUTH_ACCESS_TOKEN_TTL_MINUTES,
    },
  )

  return {
    accessToken: accessToken.token,
    accessTokenExpiresAt: accessToken.expiresAt.toISOString(),
    refreshToken: params.refreshToken,
    refreshTokenExpiresAt: params.refreshTokenExpiresAt.toISOString(),
  }
}

export async function recordLoginEvent(
  context: AuthServiceContext,
  input: {
    email: string
    status: "SUCCESS" | "FAILURE"
    userId?: string
    deviceId?: string | null
  },
) {
  await context.database.prisma.loginEvent.create({
    data: {
      email: input.email,
      status: input.status,
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.deviceId !== undefined ? { deviceId: input.deviceId } : {}),
    },
  })
}

export function createRawRefreshToken(): string {
  return randomBytes(32).toString("base64url")
}

export function hashRefreshToken(rawRefreshToken: string): string {
  return createHash("sha256").update(rawRefreshToken).digest("base64url")
}

export function createRefreshTokenExpiry(context: AuthServiceContext): Date {
  return new Date(Date.now() + context.env.AUTH_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
}
