import { loadApiEnv } from "@attendease/config"
import type {
  AuthGoogleExchangeRequest,
  AuthLoginRequest,
  AuthLogoutRequest,
  AuthMeResponse,
  AuthRefreshRequest,
  AuthSessionResponse,
  StudentRegistrationRequest,
  StudentRegistrationResponse,
  TeacherRegistrationRequest,
  TeacherRegistrationResponse,
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
