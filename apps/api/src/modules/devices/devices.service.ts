import type {
  DeviceRegistrationRequest,
  DeviceRegistrationResponse,
  TrustedDeviceAttendanceReadyResponse,
} from "@attendease/contracts"
import { Inject, Injectable } from "@nestjs/common"

import type { AuthRequestContext } from "../auth/auth.types.js"
import { DeviceBindingPolicyService } from "./device-binding-policy.service.js"

@Injectable()
export class DevicesService {
  constructor(
    @Inject(DeviceBindingPolicyService)
    private readonly deviceBindingPolicyService: DeviceBindingPolicyService,
  ) {}

  async registerCurrentDevice(
    auth: AuthRequestContext,
    request: DeviceRegistrationRequest,
  ): Promise<DeviceRegistrationResponse> {
    return this.deviceBindingPolicyService.registerDeviceForSession(auth, request)
  }

  async getAttendanceReadyState(
    auth: AuthRequestContext,
    installId: string | null,
  ): Promise<TrustedDeviceAttendanceReadyResponse> {
    const trustedDevice =
      await this.deviceBindingPolicyService.getTrustedAttendanceContextForRequest(auth, installId)

    return {
      ready: true,
      device: trustedDevice.device,
      binding: trustedDevice.binding,
      deviceTrust: trustedDevice.deviceTrust,
    }
  }
}
