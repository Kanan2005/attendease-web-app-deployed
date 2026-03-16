import { Module } from "@nestjs/common"

import { DeviceBindingPolicyService } from "./device-binding-policy.service.js"
import { DevicesController } from "./devices.controller.js"
import { DevicesService } from "./devices.service.js"
import { TrustedDeviceGuard } from "./trusted-device.guard.js"

@Module({
  controllers: [DevicesController],
  providers: [DeviceBindingPolicyService, DevicesService, TrustedDeviceGuard],
  exports: [DeviceBindingPolicyService, DevicesService, TrustedDeviceGuard],
})
export class DevicesModule {}
