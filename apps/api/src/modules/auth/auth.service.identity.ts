import { verifyPassword } from "@attendease/auth/password"
import type { AuthGoogleExchangeRequest, AuthLoginRequest } from "@attendease/contracts"
import { runInTransaction } from "@attendease/db"
import { ForbiddenException, UnauthorizedException } from "@nestjs/common"

import {
  ensureDeviceTrustAllowsAuthentication,
  ensureGoogleDomainAllowed,
  ensureGoogleIdentityIsVerified,
  ensureUserIsActive,
  resolveRoleSelection,
  toRoles,
  toSessionUserRecord,
} from "./auth.service.policies.js"
import { createAuthenticatedSession, recordLoginEvent } from "./auth.service.session.js"
import type { AuthServiceContext } from "./auth.service.types.js"

export async function loginWithPassword(context: AuthServiceContext, request: AuthLoginRequest) {
  const user = await context.database.prisma.user.findUnique({
    where: {
      email: request.email.toLowerCase(),
    },
    include: {
      credentials: true,
      roles: true,
    },
  })

  if (!user?.credentials) {
    await recordLoginEvent(context, {
      email: request.email.toLowerCase(),
      status: "FAILURE",
      deviceId: null,
    })
    throw new UnauthorizedException("Invalid email or password.")
  }

  const isPasswordValid = await verifyPassword(request.password, user.credentials.passwordHash)

  if (!isPasswordValid) {
    await recordLoginEvent(context, {
      email: request.email.toLowerCase(),
      userId: user.id,
      status: "FAILURE",
      deviceId: null,
    })
    throw new UnauthorizedException("Invalid email or password.")
  }

  ensureUserIsActive(user.status)

  const availableRoles = toRoles(user.roles)
  const activeRole = resolveRoleSelection(availableRoles, request.requestedRole)
  const deviceTrust = await context.deviceBindingService.evaluateLoginDeviceTrust({
    userId: user.id,
    activeRole,
    ...(request.device ? { registration: request.device } : {}),
  })
  ensureDeviceTrustAllowsAuthentication(context, activeRole, deviceTrust)

  return createAuthenticatedSession(context, {
    user,
    availableRoles,
    activeRole,
    platform: request.platform,
    deviceTrust,
    provider: null,
  })
}

export async function exchangeGoogleIdentity(
  context: AuthServiceContext,
  request: AuthGoogleExchangeRequest,
) {
  const verifiedIdentity = await context.googleOidcService.verifyExchange(request)
  const requestedRole = request.requestedRole

  if (!requestedRole) {
    throw new UnauthorizedException("Google exchange requires a requested role.")
  }

  if (requestedRole === "ADMIN") {
    throw new ForbiddenException("Google login is not available for admin accounts.")
  }

  ensureGoogleIdentityIsVerified(verifiedIdentity)
  ensureGoogleDomainAllowed(context, requestedRole, verifiedIdentity)

  const response = await runInTransaction(context.database.prisma, async (transaction) => {
    const oauthAccount = await transaction.oAuthAccount.findUnique({
      where: {
        provider_providerSubject: {
          provider: "GOOGLE",
          providerSubject: verifiedIdentity.providerSubject,
        },
      },
      include: {
        user: {
          include: {
            roles: true,
          },
        },
      },
    })

    if (oauthAccount) {
      if (!oauthAccount.user.roles.some((role) => role.role === requestedRole)) {
        throw new ForbiddenException("The requested role is not assigned to this account.")
      }

      await transaction.oAuthAccount.update({
        where: {
          id: oauthAccount.id,
        },
        data: {
          providerEmail: verifiedIdentity.email.toLowerCase(),
          lastUsedAt: new Date(),
        },
      })

      return toSessionUserRecord(oauthAccount.user)
    }

    const existingUser = await transaction.user.findUnique({
      where: {
        email: verifiedIdentity.email.toLowerCase(),
      },
      include: {
        roles: true,
      },
    })

    if (existingUser) {
      if (!existingUser.roles.some((role) => role.role === requestedRole)) {
        throw new ForbiddenException("The requested role is not assigned to this account.")
      }

      await transaction.oAuthAccount.create({
        data: {
          userId: existingUser.id,
          provider: "GOOGLE",
          providerSubject: verifiedIdentity.providerSubject,
          providerEmail: verifiedIdentity.email.toLowerCase(),
          lastUsedAt: new Date(),
        },
      })

      return toSessionUserRecord(existingUser)
    }

    const createdUser = await transaction.user.create({
      data: {
        email: verifiedIdentity.email.toLowerCase(),
        displayName: verifiedIdentity.displayName,
        ...(verifiedIdentity.avatarUrl !== undefined
          ? { avatarUrl: verifiedIdentity.avatarUrl }
          : {}),
        status: "ACTIVE",
        lastLoginAt: new Date(),
        roles: {
          create: {
            role: requestedRole,
          },
        },
        oauthAccounts: {
          create: {
            provider: "GOOGLE",
            providerSubject: verifiedIdentity.providerSubject,
            providerEmail: verifiedIdentity.email.toLowerCase(),
            lastUsedAt: new Date(),
          },
        },
        ...(requestedRole === "TEACHER"
          ? {
              teacherProfile: {
                create: {},
              },
            }
          : {}),
        ...(requestedRole === "STUDENT"
          ? {
              studentProfile: {
                create: {},
              },
            }
          : {}),
      },
      include: {
        roles: true,
      },
    })

    return toSessionUserRecord(createdUser)
  })

  ensureUserIsActive(response.status)

  const availableRoles = toRoles(response.roles)
  const activeRole = resolveRoleSelection(availableRoles, request.requestedRole)
  const deviceTrust = await context.deviceBindingService.evaluateLoginDeviceTrust({
    userId: response.id,
    activeRole,
    ...(request.device ? { registration: request.device } : {}),
  })
  ensureDeviceTrustAllowsAuthentication(context, activeRole, deviceTrust)

  return createAuthenticatedSession(context, {
    user: response,
    availableRoles,
    activeRole,
    platform: request.platform,
    deviceTrust,
    provider: "GOOGLE",
  })
}
