import {
  bluetoothSessionCreateResponseSchema,
  createBluetoothSessionRequestSchema,
  markBluetoothAttendanceRequestSchema,
  markBluetoothAttendanceResponseSchema,
} from "@attendease/contracts"
import { Body, Controller, Inject, Post, UseGuards } from "@nestjs/common"

import { FeatureFlagsService } from "../../infrastructure/feature-flags.service.js"
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
import { BluetoothAttendanceService } from "./bluetooth-attendance.service.js"

@Controller()
export class BluetoothAttendanceController {
  constructor(
    @Inject(BluetoothAttendanceService)
    private readonly bluetoothAttendanceService: BluetoothAttendanceService,
    @Inject(FeatureFlagsService)
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  @Post("sessions/bluetooth")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMIN")
  async createBluetoothSession(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    this.featureFlags.assertBluetoothAttendanceEnabled()

    return bluetoothSessionCreateResponseSchema.parse(
      await this.bluetoothAttendanceService.createBluetoothSession(
        auth,
        parseWithSchema(createBluetoothSessionRequestSchema, body),
      ),
    )
  }

  @Post("attendance/bluetooth/mark")
  @UseGuards(AuthGuard, RolesGuard, RateLimitGuard, TrustedDeviceGuard)
  @Roles("STUDENT")
  @RateLimit("attendance_mark")
  async markBluetoothAttendance(
    @CurrentAuth() auth: AuthRequestContext,
    @CurrentTrustedDevice() trustedDevice: TrustedDeviceRequestContext,
    @Body() body: unknown,
  ) {
    this.featureFlags.assertBluetoothAttendanceEnabled()

    return markBluetoothAttendanceResponseSchema.parse(
      await this.bluetoothAttendanceService.markAttendanceFromBluetooth(
        auth,
        trustedDevice,
        parseWithSchema(markBluetoothAttendanceRequestSchema, body),
      ),
    )
  }
}
