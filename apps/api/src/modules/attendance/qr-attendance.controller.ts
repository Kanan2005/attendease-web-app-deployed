import {
  attendanceSessionParamsSchema,
  attendanceSessionSummarySchema,
  createQrSessionRequestSchema,
  markQrAttendanceRequestSchema,
  markQrAttendanceResponseSchema,
} from "@attendease/contracts"
import { Body, Controller, Inject, Param, Post, UseGuards } from "@nestjs/common"

import { RateLimit } from "../../infrastructure/rate-limit.decorator.js"
import { RateLimitGuard } from "../../infrastructure/rate-limit.guard.js"
import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { CurrentTrustedDevice } from "../devices/current-trusted-device.decorator.js"
import type { TrustedDeviceRequestContext } from "../devices/devices.types.js"
import { TrustedDeviceGuard } from "../devices/trusted-device.guard.js"
import { QrAttendanceService } from "./qr-attendance.service.js"

@Controller()
export class QrAttendanceController {
  constructor(
    @Inject(QrAttendanceService) private readonly qrAttendanceService: QrAttendanceService,
  ) {}

  @Post("sessions/qr")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMIN")
  async createQrSession(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    return attendanceSessionSummarySchema.parse(
      await this.qrAttendanceService.createQrSession(
        auth,
        parseWithSchema(createQrSessionRequestSchema, body),
      ),
    )
  }

  @Post("sessions/:sessionId/end")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMIN")
  async endQrSession(@CurrentAuth() auth: AuthRequestContext, @Param() params: unknown) {
    return attendanceSessionSummarySchema.parse(
      await this.qrAttendanceService.endSession(
        auth,
        parseWithSchema(attendanceSessionParamsSchema, params),
      ),
    )
  }

  @Post("attendance/qr/mark")
  @UseGuards(AuthGuard, RolesGuard, RateLimitGuard, TrustedDeviceGuard)
  @Roles("STUDENT")
  @RateLimit("attendance_mark")
  async markQrAttendance(
    @CurrentAuth() auth: AuthRequestContext,
    @CurrentTrustedDevice() trustedDevice: TrustedDeviceRequestContext,
    @Body() body: unknown,
  ) {
    return markQrAttendanceResponseSchema.parse(
      await this.qrAttendanceService.markAttendanceFromQr(
        auth,
        trustedDevice,
        parseWithSchema(markQrAttendanceRequestSchema, body),
      ),
    )
  }
}
