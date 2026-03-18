import { hashPassword } from "@attendease/auth/password"
import {
  type StudentRegistrationRequest,
  type TeacherRegistrationRequest,
  studentRegistrationResponseSchema,
  teacherRegistrationResponseSchema,
} from "@attendease/contracts"
import { isUniqueConstraintError, recordDeviceActionTrail, runInTransaction } from "@attendease/db"
import { ConflictException, ForbiddenException } from "@nestjs/common"

import {
  ensureDeviceTrustAllowsAuthentication,
  resolveRoleSelection,
  toRoles,
} from "./auth.service.policies.js"
import {
  buildAuthenticatedUser,
  createAuthenticatedSession,
  createRawRefreshToken,
  createRefreshTokenExpiry,
  hashRefreshToken,
  issueTokenBundle,
} from "./auth.service.session.js"
import type { AuthServiceContext } from "./auth.service.types.js"

export async function registerStudentAccount(
  context: AuthServiceContext,
  request: StudentRegistrationRequest,
) {
  const email = request.email.toLowerCase()
  const existingUser = await context.database.prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  })

  if (existingUser) {
    throw new ConflictException("An account already exists for this email.")
  }

  const registrationDeviceTrust = await prepareStudentRegistrationDeviceTrust(
    context,
    request.device,
  )
  const passwordHash = await hashPassword(request.password)
  const refreshTokenRaw = createRawRefreshToken()
  const refreshTokenHash = hashRefreshToken(refreshTokenRaw)
  const refreshTokenExpiresAt = createRefreshTokenExpiry(context)

  try {
    const registration = await runInTransaction(context.database.prisma, async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          email,
          displayName: request.displayName.trim(),
          status: "ACTIVE",
          lastLoginAt: new Date(),
          roles: {
            create: {
              role: "STUDENT",
            },
          },
          credentials: {
            create: {
              passwordHash,
              passwordChangedAt: new Date(),
            },
          },
          studentProfile: {
            create: {
              ...(request.degree ? { degree: request.degree } : {}),
              ...(request.branch ? { branch: request.branch } : {}),
            },
          },
        },
        include: {
          roles: true,
        },
      })

      const createdBinding = await transaction.userDeviceBinding.create({
        data: {
          userId: createdUser.id,
          deviceId: registrationDeviceTrust.deviceId,
          bindingType: "STUDENT_ATTENDANCE",
          status: "ACTIVE",
          activatedAt: new Date(),
        },
        select: {
          id: true,
        },
      })

      await recordDeviceActionTrail(transaction, {
        securityEvent: {
          userId: createdUser.id,
          deviceId: registrationDeviceTrust.deviceId,
          bindingId: createdBinding.id,
          eventType: "DEVICE_BOUND",
          severity: "LOW",
          description: "A student device was bound during self-registration.",
          metadata: {
            source: "REGISTER",
          },
        },
      })

      const session = await transaction.authSession.create({
        data: {
          userId: createdUser.id,
          deviceId: registrationDeviceTrust.deviceId,
          platform: request.platform,
          activeRole: "STUDENT",
          status: "ACTIVE",
          lastActivityAt: new Date(),
          expiresAt: refreshTokenExpiresAt,
        },
      })

      await transaction.refreshToken.create({
        data: {
          sessionId: session.id,
          userId: createdUser.id,
          tokenHash: refreshTokenHash,
          expiresAt: refreshTokenExpiresAt,
        },
      })

      await transaction.loginEvent.create({
        data: {
          userId: createdUser.id,
          deviceId: registrationDeviceTrust.deviceId,
          email,
          status: "SUCCESS",
        },
      })

      return {
        user: createdUser,
        sessionId: session.id,
        deviceTrust: {
          state: "TRUSTED" as const,
          lifecycleState: "TRUSTED" as const,
          reason: "DEVICE_BOUND" as const,
          deviceId: registrationDeviceTrust.deviceId,
          bindingId: createdBinding.id,
        },
      }
    })

    const availableRoles = toRoles(registration.user.roles)
    const tokens = await issueTokenBundle(context, {
      userId: registration.user.id,
      sessionId: registration.sessionId,
      availableRoles,
      activeRole: "STUDENT",
      platform: request.platform,
      refreshToken: refreshTokenRaw,
      refreshTokenExpiresAt,
    })

    return studentRegistrationResponseSchema.parse({
      user: buildAuthenticatedUser({
        sessionId: registration.sessionId,
        platform: request.platform,
        deviceTrust: registration.deviceTrust,
        user: registration.user,
        availableRoles,
        activeRole: "STUDENT",
      }),
      tokens,
      onboarding: {
        recommendedNextStep: "JOIN_CLASSROOM",
      },
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const latestEmailOwner = await context.database.prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
        },
      })

      if (latestEmailOwner) {
        throw new ConflictException("An account already exists for this email.")
      }

      const activeBinding = await context.database.prisma.userDeviceBinding.findFirst({
        where: {
          deviceId: registrationDeviceTrust.deviceId,
          bindingType: "STUDENT_ATTENDANCE",
          status: "ACTIVE",
        },
        select: {
          id: true,
        },
      })

      if (activeBinding) {
        throw new ForbiddenException(
          "This device is already registered to another student account.",
        )
      }
    }

    throw error
  }
}

export async function registerTeacherAccount(
  context: AuthServiceContext,
  request: TeacherRegistrationRequest,
) {
  const email = request.email.toLowerCase()
  const existingUser = await context.database.prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  })

  if (existingUser) {
    throw new ConflictException("An account already exists for this email.")
  }

  const passwordHash = await hashPassword(request.password)

  try {
    const createdUser = await runInTransaction(context.database.prisma, async (transaction) => {
      return transaction.user.create({
        data: {
          email,
          displayName: request.displayName.trim(),
          status: "ACTIVE",
          lastLoginAt: new Date(),
          roles: {
            create: {
              role: "TEACHER",
            },
          },
          credentials: {
            create: {
              passwordHash,
              passwordChangedAt: new Date(),
            },
          },
          teacherProfile: {
            create: {},
          },
        },
        include: {
          roles: true,
        },
      })
    })

    const availableRoles = toRoles(createdUser.roles)
    const activeRole = resolveRoleSelection(availableRoles, "TEACHER")
    const deviceTrust = await context.deviceBindingService.evaluateLoginDeviceTrust({
      userId: createdUser.id,
      activeRole,
      ...(request.device ? { registration: request.device } : {}),
    })
    ensureDeviceTrustAllowsAuthentication(context, activeRole, deviceTrust)

    const session = await createAuthenticatedSession(context, {
      user: createdUser,
      availableRoles,
      activeRole,
      platform: request.platform,
      deviceTrust,
      provider: null,
    })

    return teacherRegistrationResponseSchema.parse({
      ...session,
      onboarding: {
        recommendedNextStep: "OPEN_HOME",
      },
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ConflictException("An account already exists for this email.")
    }

    throw error
  }
}

async function prepareStudentRegistrationDeviceTrust(
  context: AuthServiceContext,
  registration: StudentRegistrationRequest["device"],
): Promise<{
  deviceId: string
}> {
  const device = await context.deviceBindingService.upsertRegisteredDevice(registration)

  if (!device) {
    throw new ForbiddenException("Device registration details are required.")
  }

  if (device.attestationStatus === "FAILED") {
    await context.database.prisma.securityEvent.create({
      data: {
        deviceId: device.id,
        eventType: "LOGIN_RISK_DETECTED",
        severity: "HIGH",
        description: "Student self-registration was blocked because device attestation failed.",
        metadata: {
          source: "REGISTER",
          installId: registration.installId,
        },
      },
    })

    throw new ForbiddenException("This device could not be verified for student registration.")
  }

  const activeBindingForDevice = await context.database.prisma.userDeviceBinding.findFirst({
    where: {
      deviceId: device.id,
      bindingType: "STUDENT_ATTENDANCE",
      status: {
        in: ["ACTIVE", "PENDING", "BLOCKED"],
      },
    },
    select: {
      id: true,
      userId: true,
      status: true,
    },
  })

  if (activeBindingForDevice) {
    await context.database.prisma.securityEvent.create({
      data: {
        deviceId: device.id,
        bindingId: activeBindingForDevice.id,
        eventType: "MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT",
        severity: "HIGH",
        description:
          "Student self-registration was blocked because the device is already bound to another student.",
        metadata: {
          source: "REGISTER",
          installId: registration.installId,
          boundStudentUserId: activeBindingForDevice.userId,
          bindingStatus: activeBindingForDevice.status,
        },
      },
    })

    throw new ForbiddenException("This device is already registered to another student.")
  }

  return {
    deviceId: device.id,
  }
}
