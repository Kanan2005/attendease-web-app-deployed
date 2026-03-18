import { loadApiEnv } from "@attendease/config"
import type {
  AuthGoogleExchangeRequest,
  AuthLoginRequest,
  AuthLogoutRequest,
  AuthMeResponse,
  AuthRefreshRequest,
  AuthSessionResponse,
  ProfileResponse,
  StudentRegistrationRequest,
  StudentRegistrationResponse,
  TeacherRegistrationRequest,
  TeacherRegistrationResponse,
  UpdateProfileRequest,
} from "@attendease/contracts"
import { Inject, Injectable } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import { AssignmentsService } from "../academic/assignments.service.js"
import { EnrollmentsService } from "../academic/enrollments.service.js"
import { exchangeGoogleIdentity, loginWithPassword } from "./auth.service.identity.js"
import { registerStudentAccount, registerTeacherAccount } from "./auth.service.registration.js"
import {
  getAuthenticatedUser,
  logoutSession,
  refreshSession,
  validateAccessTokenContext,
} from "./auth.service.session-operations.js"
import type { AuthServiceContext } from "./auth.service.types.js"
import type { AuthRequestContext } from "./auth.types.js"
import { DeviceBindingService } from "./device-binding.service.js"
import { GoogleOidcService } from "./google-oidc.service.js"

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
    return loginWithPassword(this.getContext(), request)
  }

  async registerStudentAccount(
    request: StudentRegistrationRequest,
  ): Promise<StudentRegistrationResponse> {
    return registerStudentAccount(this.getContext(), request)
  }

  async registerTeacherAccount(
    request: TeacherRegistrationRequest,
  ): Promise<TeacherRegistrationResponse> {
    return registerTeacherAccount(this.getContext(), request)
  }

  async exchangeGoogleIdentity(request: AuthGoogleExchangeRequest): Promise<AuthSessionResponse> {
    return exchangeGoogleIdentity(this.getContext(), request)
  }

  async refresh(request: AuthRefreshRequest): Promise<AuthSessionResponse> {
    return refreshSession(this.getContext(), request)
  }

  async logout(auth: AuthRequestContext, request: AuthLogoutRequest): Promise<{ success: true }> {
    return logoutSession(this.getContext(), auth, request)
  }

  async getMe(auth: AuthRequestContext): Promise<AuthMeResponse> {
    return getAuthenticatedUser(this.getContext(), auth)
  }

  async getProfile(auth: AuthRequestContext): Promise<ProfileResponse> {
    const user = await this.database.prisma.user.findUniqueOrThrow({
      where: { id: auth.userId },
      include: { teacherProfile: true, studentProfile: { select: { rollNumber: true, degree: true, branch: true } } },
    })
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      department: user.teacherProfile?.department ?? null,
      designation: user.teacherProfile?.designation ?? null,
      employeeCode: user.teacherProfile?.employeeCode ?? null,
      rollNumber: user.studentProfile?.rollNumber ?? null,
      degree: user.studentProfile?.degree ?? null,
      branch: user.studentProfile?.branch ?? null,
      createdAt: user.createdAt.toISOString(),
    }
  }

  async updateProfile(auth: AuthRequestContext, request: UpdateProfileRequest): Promise<ProfileResponse> {
    const { displayName, avatarUrl, department, designation, employeeCode, rollNumber, degree, branch } = request

    await this.database.prisma.user.update({
      where: { id: auth.userId },
      data: {
        ...(displayName !== undefined ? { displayName } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl ?? null } : {}),
      },
    })

    const hasTeacherFields = department !== undefined || designation !== undefined || employeeCode !== undefined
    if (hasTeacherFields && auth.activeRole === "TEACHER") {
      await this.database.prisma.teacherProfile.upsert({
        where: { userId: auth.userId },
        create: {
          userId: auth.userId,
          department: department ?? null,
          designation: designation ?? null,
          employeeCode: employeeCode ?? null,
        },
        update: {
          ...(department !== undefined ? { department: department ?? null } : {}),
          ...(designation !== undefined ? { designation: designation ?? null } : {}),
          ...(employeeCode !== undefined ? { employeeCode: employeeCode ?? null } : {}),
        },
      })
    }

    const hasStudentFields = rollNumber !== undefined || degree !== undefined || branch !== undefined
    if (hasStudentFields && auth.activeRole === "STUDENT") {
      await this.database.prisma.studentProfile.upsert({
        where: { userId: auth.userId },
        create: {
          userId: auth.userId,
          rollNumber: rollNumber ?? null,
          ...(degree !== undefined ? { degree: degree ?? null } : {}),
          ...(branch !== undefined ? { branch: branch ?? null } : {}),
        },
        update: {
          ...(rollNumber !== undefined ? { rollNumber: rollNumber ?? null } : {}),
          ...(degree !== undefined ? { degree: degree ?? null } : {}),
          ...(branch !== undefined ? { branch: branch ?? null } : {}),
        },
      })
    }

    return this.getProfile(auth)
  }

  async validateAccessToken(token: string): Promise<AuthRequestContext> {
    return validateAccessTokenContext(this.getContext(), token)
  }

  private getContext(): AuthServiceContext {
    return {
      database: this.database,
      assignmentsService: this.assignmentsService,
      enrollmentsService: this.enrollmentsService,
      googleOidcService: this.googleOidcService,
      deviceBindingService: this.deviceBindingService,
      env: this.env,
    }
  }
}
