import { createSecretKey } from "node:crypto"

import {
  type AppRole,
  type SessionPlatform,
  appRoleValues,
  sessionPlatformValues,
} from "@attendease/contracts"
import { type JWTPayload, SignJWT, jwtVerify } from "jose"

export type AccessTokenPayload = {
  userId: string
  sessionId: string
  activeRole: AppRole
  availableRoles: AppRole[]
  platform: SessionPlatform
}

export type AccessTokenEnvelope = {
  token: string
  expiresAt: Date
}

type IssueAccessTokenOptions = {
  secret: string
  issuer: string
  audience: string
  expiresInMinutes: number
}

type VerifyAccessTokenOptions = {
  secret: string
  issuer: string
  audience: string
}

type AttendEaseAccessTokenClaims = JWTPayload & {
  sid: string
  role: AppRole
  roles: AppRole[]
  platform: SessionPlatform
  typ: "access"
}

function getSecretKey(secret: string) {
  return createSecretKey(Buffer.from(secret, "utf8"))
}

function isAppRole(value: unknown): value is AppRole {
  return appRoleValues.includes(value as AppRole)
}

function isSessionPlatform(value: unknown): value is SessionPlatform {
  return sessionPlatformValues.includes(value as SessionPlatform)
}

export async function issueAccessToken(
  payload: AccessTokenPayload,
  options: IssueAccessTokenOptions,
): Promise<AccessTokenEnvelope> {
  const expiresAt = new Date(Date.now() + options.expiresInMinutes * 60_000)
  const token = await new SignJWT({
    sid: payload.sessionId,
    role: payload.activeRole,
    roles: payload.availableRoles,
    platform: payload.platform,
    typ: "access",
  })
    .setProtectedHeader({
      alg: "HS256",
      typ: "JWT",
    })
    .setSubject(payload.userId)
    .setIssuer(options.issuer)
    .setAudience(options.audience)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSecretKey(options.secret))

  return {
    token,
    expiresAt,
  }
}

export async function verifyAccessToken(
  token: string,
  options: VerifyAccessTokenOptions,
): Promise<AccessTokenPayload & { expiresAt: Date }> {
  const { payload } = await jwtVerify(token, getSecretKey(options.secret), {
    issuer: options.issuer,
    audience: options.audience,
  })
  const claims = payload as AttendEaseAccessTokenClaims

  if (
    claims.typ !== "access" ||
    typeof claims.sub !== "string" ||
    typeof claims.sid !== "string" ||
    !Array.isArray(claims.roles) ||
    !isAppRole(claims.role) ||
    !claims.roles.every((role) => isAppRole(role)) ||
    !isSessionPlatform(claims.platform) ||
    typeof claims.exp !== "number"
  ) {
    throw new Error("Invalid AttendEase access token.")
  }

  return {
    userId: claims.sub,
    sessionId: claims.sid,
    activeRole: claims.role,
    availableRoles: claims.roles,
    platform: claims.platform,
    expiresAt: new Date(claims.exp * 1000),
  }
}
