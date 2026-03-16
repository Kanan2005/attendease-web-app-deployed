import type { AppRole, AuthDeviceRegistration } from "@attendease/contracts"
import { Inject, Injectable } from "@nestjs/common"

import { DeviceBindingPolicyService } from "../devices/device-binding-policy.service.js"
import type { DeviceTrustEvaluation } from "./auth.types.js"

@Injectable()
export class DeviceBindingService {
  constructor(
    @Inject(DeviceBindingPolicyService)
    private readonly deviceBindingPolicyService: DeviceBindingPolicyService,
  ) {}

  async upsertRegisteredDevice(registration?: AuthDeviceRegistration) {
    return this.deviceBindingPolicyService.upsertRegisteredDevice(registration)
  }

  async evaluateLoginDeviceTrust(params: {
    userId: string
    activeRole: AppRole
    registration?: AuthDeviceRegistration
  }): Promise<DeviceTrustEvaluation> {
    return this.deviceBindingPolicyService.evaluateLoginDeviceTrust(params)
  }

  async getSessionDeviceTrust(params: {
    userId: string
    activeRole: AppRole
    deviceId: string | null
  }): Promise<DeviceTrustEvaluation> {
    return this.deviceBindingPolicyService.getSessionDeviceTrust(params)
  }
}
