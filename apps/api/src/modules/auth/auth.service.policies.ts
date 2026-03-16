import { RoleSelectionError, resolveActiveRole } from "@attendease/auth"
import type { AppRole } from "@attendease/contracts"
import { ForbiddenException, UnauthorizedException } from "@nestjs/common"

import type { AuthServiceContext, SessionUserRecord } from "./auth.service.types.js"
import type { DeviceTrustEvaluation, VerifiedGoogleIdentity } from "./auth.types.js"

export function ensureUserIsActive(status: string) {
  if (status !== "ACTIVE") {
    throw new ForbiddenException("The user account is not active.")
  }
}

export function ensureGoogleDomainAllowed(
  context: AuthServiceContext,
  role: AppRole,
  identity: VerifiedGoogleIdentity,
) {
  const allowedDomains = parseAllowedDomains(
    role === "TEACHER"
      ? context.env.GOOGLE_TEACHER_ALLOWED_DOMAINS
      : context.env.GOOGLE_STUDENT_ALLOWED_DOMAINS,
  )

  if (allowedDomains.length === 0) {
    return
  }

  const emailDomain = identity.email.split("@")[1]?.toLowerCase()

  if (!emailDomain || !allowedDomains.includes(emailDomain)) {
    throw new ForbiddenException("Google login is not allowed for this email domain.")
  }
}

export function ensureGoogleIdentityIsVerified(identity: VerifiedGoogleIdentity) {
  if (!identity.emailVerified) {
    throw new UnauthorizedException("Google identity email is not verified.")
  }
}

export function ensureDeviceTrustAllowsAuthentication(
  context: AuthServiceContext,
  activeRole: AppRole,
  deviceTrust: DeviceTrustEvaluation,
) {
  if (activeRole !== "STUDENT") {
    return
  }

  if (context.env.FEATURE_STRICT_DEVICE_BINDING_MODE !== "ENFORCE") {
    return
  }

  if (deviceTrust.state !== "TRUSTED") {
    switch (deviceTrust.lifecycleState) {
      case "PENDING_REPLACEMENT":
        throw new ForbiddenException(
          "This phone is waiting for admin approval as the replacement attendance device.",
        )
      case "REPLACED":
        throw new ForbiddenException(
          "This phone is no longer the trusted attendance device for this student.",
        )
      case "UNREGISTERED":
        throw new ForbiddenException(
          "Student authentication requires device registration on the attendance phone.",
        )
      default:
        throw new ForbiddenException("Student authentication requires a trusted registered device.")
    }
  }
}

export function toRoles(roles: { role: AppRole }[]): AppRole[] {
  return roles.map((role) => role.role)
}

export function toSessionUserRecord(user: {
  id: string
  email: string
  displayName: string
  status: string
  roles: { role: AppRole }[]
}): SessionUserRecord {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
    roles: user.roles.map((role) => ({
      role: role.role,
    })),
  }
}

export function resolveRoleSelection(roles: readonly AppRole[], requestedRole?: AppRole): AppRole {
  try {
    return resolveActiveRole(roles, requestedRole)
  } catch (error) {
    if (error instanceof RoleSelectionError) {
      throw new ForbiddenException(error.message)
    }

    throw error
  }
}

function parseAllowedDomains(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}
