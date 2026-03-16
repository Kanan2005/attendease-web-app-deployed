import { createHash, randomBytes } from "node:crypto"

import { RoleSelectionError, resolveActiveRole } from "@attendease/auth"
import { hashPassword, verifyPassword } from "@attendease/auth/password"
import { issueAccessToken, verifyAccessToken } from "@attendease/auth/tokens"
import { loadApiEnv } from "@attendease/config"
import {
  type AppRole,
  type AuthGoogleExchangeRequest,
  type AuthLoginRequest,
  type AuthLogoutRequest,
  type AuthMeResponse,
  type AuthRefreshRequest,
  type AuthSessionResponse,
  type AuthenticatedUser,
  type SessionPlatform,
  type StudentRegistrationRequest,
  type StudentRegistrationResponse,
  type TeacherRegistrationRequest,
  type TeacherRegistrationResponse,
  type TrustedDeviceContext,
  authMeResponseSchema,
  authOperationSuccessSchema,
  authSessionResponseSchema,
  studentRegistrationResponseSchema,
  teacherRegistrationResponseSchema,
} from "@attendease/contracts"
import { isUniqueConstraintError, recordDeviceActionTrail, runInTransaction } from "@attendease/db"
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import { AssignmentsService } from "../academic/assignments.service.js"
import { EnrollmentsService } from "../academic/enrollments.service.js"
import type {
  AuthRequestContext,
  DeviceTrustEvaluation,
  VerifiedGoogleIdentity,
} from "./auth.types.js"
import { DeviceBindingService } from "./device-binding.service.js"
import { GoogleOidcService } from "./google-oidc.service.js"

type SessionUserRecord = {
  id: string
  email: string
  displayName: string
  status: string
  roles: { role: AppRole }[]
}

@Injectable()
export class AuthService {
  private readonly env = loadApiEnv(process.env)

  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
    @Inject(AssignmentsService)
    private readonly assignmentsService: AssignmentsService,
    @Inject(EnrollmentsService)
    private readonly enrollmentsService: EnrollmentsService,
    @Inject(GoogleOidcService)
    private readonly googleOidcService: GoogleOidcService,
    @Inject(DeviceBindingService)
    private readonly deviceBindingService: DeviceBindingService,
  ) {}

  async login(request: AuthLoginRequest): Promise<AuthSessionResponse> {
    const user = await this.database.prisma.user.findUnique({
      where: {
        email: request.email.toLowerCase(),
      },
      include: {
        credentials: true,
        roles: true,
      },
    })

    if (!user?.credentials) {
      await this.recordLoginEvent({
        email: request.email.toLowerCase(),
        status: "FAILURE",
        deviceId: null,
      })
      throw new UnauthorizedException("Invalid email or password.")
    }

    const isPasswordValid = await verifyPassword(request.password, user.credentials.passwordHash)

    if (!isPasswordValid) {
      await this.recordLoginEvent({
        email: request.email.toLowerCase(),
        userId: user.id,
        status: "FAILURE",
        deviceId: null,
      })
      throw new UnauthorizedException("Invalid email or password.")
    }

    this.ensureUserIsActive(user.status)

    const availableRoles = this.toRoles(user.roles)
    const activeRole = this.resolveRoleSelection(availableRoles, request.requestedRole)
    const deviceTrust = await this.deviceBindingService.evaluateLoginDeviceTrust({
      userId: user.id,
      activeRole,
      ...(request.device ? { registration: request.device } : {}),
    })
    this.ensureDeviceTrustAllowsAuthentication(activeRole, deviceTrust)

    return this.createAuthenticatedSession({
      user,
      availableRoles,
      activeRole,
      platform: request.platform,
      deviceTrust,
      provider: null,
    })
  }

  async registerStudentAccount(
    request: StudentRegistrationRequest,
  ): Promise<StudentRegistrationResponse> {
    const email = request.email.toLowerCase()
    const existingUser = await this.database.prisma.user.findUnique({
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

    const registrationDeviceTrust = await this.prepareStudentRegistrationDeviceTrust(request.device)
    const passwordHash = await hashPassword(request.password)
    const refreshTokenRaw = this.createRawRefreshToken()
    const refreshTokenHash = this.hashRefreshToken(refreshTokenRaw)
    const refreshTokenExpiresAt = this.createRefreshTokenExpiry()

    try {
      const registration = await runInTransaction(this.database.prisma, async (transaction) => {
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
              create: {},
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

      const availableRoles = this.toRoles(registration.user.roles)
      const tokens = await this.issueTokenBundle({
        userId: registration.user.id,
        sessionId: registration.sessionId,
        availableRoles,
        activeRole: "STUDENT",
        platform: request.platform,
        refreshToken: refreshTokenRaw,
        refreshTokenExpiresAt,
      })

      return studentRegistrationResponseSchema.parse({
        user: this.buildAuthenticatedUser({
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
        const latestEmailOwner = await this.database.prisma.user.findUnique({
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

        const activeBinding = await this.database.prisma.userDeviceBinding.findFirst({
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

  async registerTeacherAccount(
    request: TeacherRegistrationRequest,
  ): Promise<TeacherRegistrationResponse> {
    const email = request.email.toLowerCase()
    const existingUser = await this.database.prisma.user.findUnique({
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
      const createdUser = await runInTransaction(this.database.prisma, async (transaction) => {
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

      const availableRoles = this.toRoles(createdUser.roles)
      const activeRole = this.resolveRoleSelection(availableRoles, "TEACHER")
      const deviceTrust = await this.deviceBindingService.evaluateLoginDeviceTrust({
        userId: createdUser.id,
        activeRole,
        ...(request.device ? { registration: request.device } : {}),
      })
      this.ensureDeviceTrustAllowsAuthentication(activeRole, deviceTrust)

      const session = await this.createAuthenticatedSession({
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

  async exchangeGoogleIdentity(request: AuthGoogleExchangeRequest): Promise<AuthSessionResponse> {
    const verifiedIdentity = await this.googleOidcService.verifyExchange(request)
    const requestedRole = request.requestedRole

    if (!requestedRole) {
      throw new UnauthorizedException("Google exchange requires a requested role.")
    }

    if (requestedRole === "ADMIN") {
      throw new ForbiddenException("Google login is not available for admin accounts.")
    }

    this.ensureGoogleIdentityIsVerified(verifiedIdentity)
    this.ensureGoogleDomainAllowed(requestedRole, verifiedIdentity)

    const response = await runInTransaction(this.database.prisma, async (transaction) => {
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

        return this.toSessionUserRecord(oauthAccount.user)
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

        return this.toSessionUserRecord(existingUser)
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

      return this.toSessionUserRecord(createdUser)
    })

    this.ensureUserIsActive(response.status)

    const availableRoles = this.toRoles(response.roles)
    const activeRole = this.resolveRoleSelection(availableRoles, request.requestedRole)
    const deviceTrust = await this.deviceBindingService.evaluateLoginDeviceTrust({
      userId: response.id,
      activeRole,
      ...(request.device ? { registration: request.device } : {}),
    })
    this.ensureDeviceTrustAllowsAuthentication(activeRole, deviceTrust)

    return this.createAuthenticatedSession({
      user: response,
      availableRoles,
      activeRole,
      platform: request.platform,
      deviceTrust,
      provider: "GOOGLE",
    })
  }

  async refresh(request: AuthRefreshRequest): Promise<AuthSessionResponse> {
    const rawRefreshToken = request.refreshToken
    const refreshTokenHash = this.hashRefreshToken(rawRefreshToken)
    const refreshToken = await this.database.prisma.refreshToken.findUnique({
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

    this.ensureUserIsActive(refreshToken.user.status)

    const availableRoles = this.toRoles(refreshToken.user.roles)
    const activeRole = this.resolveRoleSelection(
      availableRoles,
      request.requestedRole ?? refreshToken.session.activeRole,
    )
    const refreshTokenExpiresAt = this.createRefreshTokenExpiry()
    const nextRefreshTokenRaw = this.createRawRefreshToken()
    const nextRefreshTokenHash = this.hashRefreshToken(nextRefreshTokenRaw)

    const session = await runInTransaction(this.database.prisma, async (transaction) => {
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

    const deviceTrust = await this.deviceBindingService.getSessionDeviceTrust({
      userId: refreshToken.user.id,
      activeRole,
      deviceId: session.deviceId,
    })
    this.ensureDeviceTrustAllowsAuthentication(activeRole, deviceTrust)

    const tokens = await this.issueTokenBundle({
      userId: refreshToken.user.id,
      sessionId: session.id,
      availableRoles,
      activeRole,
      platform: session.platform,
      refreshToken: nextRefreshTokenRaw,
      refreshTokenExpiresAt,
    })

    return authSessionResponseSchema.parse({
      user: this.buildAuthenticatedUser({
        sessionId: session.id,
        platform: session.platform,
        deviceTrust,
        user: refreshToken.user,
        availableRoles,
        activeRole,
      }),
      tokens,
    })
  }

  async logout(
    auth: AuthRequestContext,
    request: AuthLogoutRequest,
  ): Promise<ReturnType<typeof authOperationSuccessSchema.parse>> {
    const now = new Date()
    const refreshTokenHash = request.refreshToken
      ? this.hashRefreshToken(request.refreshToken)
      : null

    await runInTransaction(this.database.prisma, async (transaction) => {
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

  async getMe(auth: AuthRequestContext): Promise<AuthMeResponse> {
    const user = await this.database.prisma.user.findUnique({
      where: {
        id: auth.userId,
      },
      include: {
        roles: true,
      },
    })

    if (!user) {
      throw new NotFoundException("Authenticated user not found.")
    }

    const availableRoles = this.toRoles(user.roles)
    const deviceTrust = await this.deviceBindingService.getSessionDeviceTrust({
      userId: auth.userId,
      activeRole: auth.activeRole,
      deviceId: auth.deviceId,
    })

    const assignments =
      auth.activeRole === "TEACHER"
        ? await this.assignmentsService.listTeacherAssignments(auth.userId)
        : []
    const enrollments =
      auth.activeRole === "STUDENT"
        ? await this.enrollmentsService.listStudentEnrollments(auth.userId)
        : []

    return authMeResponseSchema.parse({
      user: this.buildAuthenticatedUser({
        sessionId: auth.sessionId,
        platform: auth.platform,
        deviceTrust,
        user,
        availableRoles,
        activeRole: auth.activeRole,
      }),
      assignments,
      enrollments,
    })
  }

  async validateAccessToken(token: string): Promise<AuthRequestContext> {
    const payload = await verifyAccessToken(token, {
      secret: this.env.AUTH_ACCESS_TOKEN_SECRET,
      issuer: this.env.AUTH_ISSUER,
      audience: this.env.AUTH_AUDIENCE,
    })

    const session = await this.database.prisma.authSession.findUnique({
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

    const availableRoles = this.toRoles(session.user.roles)

    if (
      availableRoles.length !== payload.availableRoles.length ||
      payload.availableRoles.some((role) => !availableRoles.includes(role))
    ) {
      throw new UnauthorizedException("The access token role context is stale.")
    }

    this.ensureUserIsActive(session.user.status)

    return {
      userId: session.userId,
      sessionId: session.id,
      activeRole: session.activeRole,
      availableRoles,
      platform: session.platform,
      deviceId: session.deviceId,
    }
  }

  private async createAuthenticatedSession(params: {
    user: SessionUserRecord
    availableRoles: AppRole[]
    activeRole: AppRole
    platform: SessionPlatform
    deviceTrust: DeviceTrustEvaluation
    provider: "GOOGLE" | null
  }): Promise<AuthSessionResponse> {
    const refreshTokenRaw = this.createRawRefreshToken()
    const refreshTokenHash = this.hashRefreshToken(refreshTokenRaw)
    const refreshTokenExpiresAt = this.createRefreshTokenExpiry()

    const session = await runInTransaction(this.database.prisma, async (transaction) => {
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

    const tokens = await this.issueTokenBundle({
      userId: params.user.id,
      sessionId: session.id,
      availableRoles: params.availableRoles,
      activeRole: params.activeRole,
      platform: params.platform,
      refreshToken: refreshTokenRaw,
      refreshTokenExpiresAt,
    })

    return authSessionResponseSchema.parse({
      user: this.buildAuthenticatedUser({
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

  private buildAuthenticatedUser(input: {
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

  private async issueTokenBundle(params: {
    userId: string
    sessionId: string
    availableRoles: AppRole[]
    activeRole: AppRole
    platform: SessionPlatform
    refreshToken: string
    refreshTokenExpiresAt: Date
  }) {
    const accessToken = await issueAccessToken(
      {
        userId: params.userId,
        sessionId: params.sessionId,
        activeRole: params.activeRole,
        availableRoles: params.availableRoles,
        platform: params.platform,
      },
      {
        secret: this.env.AUTH_ACCESS_TOKEN_SECRET,
        issuer: this.env.AUTH_ISSUER,
        audience: this.env.AUTH_AUDIENCE,
        expiresInMinutes: this.env.AUTH_ACCESS_TOKEN_TTL_MINUTES,
      },
    )

    return {
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt.toISOString(),
      refreshToken: params.refreshToken,
      refreshTokenExpiresAt: params.refreshTokenExpiresAt.toISOString(),
    }
  }

  private ensureUserIsActive(status: string) {
    if (status !== "ACTIVE") {
      throw new ForbiddenException("The user account is not active.")
    }
  }

  private ensureGoogleDomainAllowed(role: AppRole, identity: VerifiedGoogleIdentity) {
    const allowedDomains = this.parseAllowedDomains(
      role === "TEACHER"
        ? this.env.GOOGLE_TEACHER_ALLOWED_DOMAINS
        : this.env.GOOGLE_STUDENT_ALLOWED_DOMAINS,
    )

    if (allowedDomains.length === 0) {
      return
    }

    const emailDomain = identity.email.split("@")[1]?.toLowerCase()

    if (!emailDomain || !allowedDomains.includes(emailDomain)) {
      throw new ForbiddenException("Google login is not allowed for this email domain.")
    }
  }

  private ensureGoogleIdentityIsVerified(identity: VerifiedGoogleIdentity) {
    if (!identity.emailVerified) {
      throw new UnauthorizedException("Google identity email is not verified.")
    }
  }

  private ensureDeviceTrustAllowsAuthentication(
    activeRole: AppRole,
    deviceTrust: DeviceTrustEvaluation,
  ) {
    if (activeRole !== "STUDENT") {
      return
    }

    if (this.env.FEATURE_STRICT_DEVICE_BINDING_MODE !== "ENFORCE") {
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
          throw new ForbiddenException(
            "Student authentication requires a trusted registered device.",
          )
      }
    }
  }

  private async prepareStudentRegistrationDeviceTrust(
    registration: StudentRegistrationRequest["device"],
  ): Promise<{
    deviceId: string
  }> {
    const device = await this.deviceBindingService.upsertRegisteredDevice(registration)

    if (!device) {
      throw new ForbiddenException("Device registration details are required.")
    }

    if (device.attestationStatus === "FAILED") {
      await this.database.prisma.securityEvent.create({
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

    const activeBindingForDevice = await this.database.prisma.userDeviceBinding.findFirst({
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
      await this.database.prisma.securityEvent.create({
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

  private parseAllowedDomains(value: string): string[] {
    return value
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  }

  private createRawRefreshToken(): string {
    return randomBytes(32).toString("base64url")
  }

  private hashRefreshToken(rawRefreshToken: string): string {
    return createHash("sha256").update(rawRefreshToken).digest("base64url")
  }

  private createRefreshTokenExpiry(): Date {
    return new Date(Date.now() + this.env.AUTH_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
  }

  private toRoles(roles: { role: AppRole }[]): AppRole[] {
    return roles.map((role) => role.role)
  }

  private toSessionUserRecord(user: {
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

  private resolveRoleSelection(roles: readonly AppRole[], requestedRole?: AppRole): AppRole {
    try {
      return resolveActiveRole(roles, requestedRole)
    } catch (error) {
      if (error instanceof RoleSelectionError) {
        throw new ForbiddenException(error.message)
      }

      throw error
    }
  }

  private async recordLoginEvent(input: {
    email: string
    status: "SUCCESS" | "FAILURE"
    userId?: string
    deviceId?: string | null
  }) {
    await this.database.prisma.loginEvent.create({
      data: {
        email: input.email,
        status: input.status,
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.deviceId !== undefined ? { deviceId: input.deviceId } : {}),
      },
    })
  }
}
