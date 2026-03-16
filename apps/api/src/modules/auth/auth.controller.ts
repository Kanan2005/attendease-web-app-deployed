import {
  authGoogleExchangeRequestSchema,
  authLoginRequestSchema,
  authLogoutRequestSchema,
  authMeResponseSchema,
  authOperationSuccessSchema,
  authRefreshRequestSchema,
  authSessionResponseSchema,
  studentRegistrationRequestSchema,
  studentRegistrationResponseSchema,
  teacherRegistrationRequestSchema,
  teacherRegistrationResponseSchema,
} from "@attendease/contracts"
import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common"

import { RateLimit } from "../../infrastructure/rate-limit.decorator.js"
import { RateLimitGuard } from "../../infrastructure/rate-limit.guard.js"
import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "./auth.guard.js"
import { AuthService } from "./auth.service.js"
import type { AuthRequestContext } from "./auth.types.js"
import { CurrentAuth } from "./current-auth.decorator.js"

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("login")
  @UseGuards(RateLimitGuard)
  @RateLimit("auth")
  async login(@Body() body: unknown) {
    return authSessionResponseSchema.parse(
      await this.authService.login(parseWithSchema(authLoginRequestSchema, body)),
    )
  }

  @Post("register/student")
  @UseGuards(RateLimitGuard)
  @RateLimit("auth")
  async registerStudent(@Body() body: unknown) {
    return studentRegistrationResponseSchema.parse(
      await this.authService.registerStudentAccount(
        parseWithSchema(studentRegistrationRequestSchema, body),
      ),
    )
  }

  @Post("register/teacher")
  @UseGuards(RateLimitGuard)
  @RateLimit("auth")
  async registerTeacher(@Body() body: unknown) {
    return teacherRegistrationResponseSchema.parse(
      await this.authService.registerTeacherAccount(
        parseWithSchema(teacherRegistrationRequestSchema, body),
      ),
    )
  }

  @Post("google/exchange")
  @UseGuards(RateLimitGuard)
  @RateLimit("auth")
  async exchangeGoogleIdentity(@Body() body: unknown) {
    return authSessionResponseSchema.parse(
      await this.authService.exchangeGoogleIdentity(
        parseWithSchema(authGoogleExchangeRequestSchema, body),
      ),
    )
  }

  @Post("refresh")
  @UseGuards(RateLimitGuard)
  @RateLimit("auth")
  async refresh(@Body() body: unknown) {
    return authSessionResponseSchema.parse(
      await this.authService.refresh(parseWithSchema(authRefreshRequestSchema, body)),
    )
  }

  @UseGuards(AuthGuard)
  @Post("logout")
  async logout(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    return authOperationSuccessSchema.parse(
      await this.authService.logout(auth, parseWithSchema(authLogoutRequestSchema, body)),
    )
  }

  @UseGuards(AuthGuard)
  @Get("me")
  async getMe(@CurrentAuth() auth: AuthRequestContext) {
    return authMeResponseSchema.parse(await this.authService.getMe(auth))
  }
}
