import {
  deviceRegistrationRequestSchema,
  deviceRegistrationResponseSchema,
  trustedDeviceAttendanceReadyResponseSchema,
} from "@attendease/contracts"
import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { CurrentTrustedDevice } from "./current-trusted-device.decorator.js"
import { DevicesService } from "./devices.service.js"
import type { TrustedDeviceRequestContext } from "./devices.types.js"
import { TrustedDeviceGuard } from "./trusted-device.guard.js"

@Controller("devices")
@UseGuards(AuthGuard)
export class DevicesController {
  constructor(@Inject(DevicesService) private readonly devicesService: DevicesService) {}

  @Post("register")
  async registerDevice(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    return deviceRegistrationResponseSchema.parse(
      await this.devicesService.registerCurrentDevice(
        auth,
        parseWithSchema(deviceRegistrationRequestSchema, body),
      ),
    )
  }

  @Get("trust/attendance-ready")
  @Roles("STUDENT")
  @UseGuards(RolesGuard, TrustedDeviceGuard)
  async getAttendanceReady(@CurrentTrustedDevice() trustedDevice: TrustedDeviceRequestContext) {
    return trustedDeviceAttendanceReadyResponseSchema.parse({
      ready: true,
      device: trustedDevice.device,
      binding: trustedDevice.binding,
      deviceTrust: trustedDevice.deviceTrust,
    })
  }
}
