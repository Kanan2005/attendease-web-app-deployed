import type { ApiEnv } from "@attendease/config"
import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common"

import { API_ENV } from "./api-env.js"

@Injectable()
export class FeatureFlagsService {
  constructor(@Inject(API_ENV) private readonly env: ApiEnv) {}

  isBluetoothAttendanceEnabled(): boolean {
    return this.env.FEATURE_BLUETOOTH_ATTENDANCE_ENABLED
  }

  isEmailAutomationEnabled(): boolean {
    return this.env.FEATURE_EMAIL_AUTOMATION_ENABLED
  }

  getStrictDeviceBindingMode(): ApiEnv["FEATURE_STRICT_DEVICE_BINDING_MODE"] {
    return this.env.FEATURE_STRICT_DEVICE_BINDING_MODE
  }

  isStrictDeviceBindingEnforced(): boolean {
    return this.getStrictDeviceBindingMode() === "ENFORCE"
  }

  assertBluetoothAttendanceEnabled() {
    if (!this.isBluetoothAttendanceEnabled()) {
      throw new ServiceUnavailableException(
        "Bluetooth attendance is disabled by the current rollout configuration.",
      )
    }
  }

  assertEmailAutomationEnabled() {
    if (!this.isEmailAutomationEnabled()) {
      throw new ServiceUnavailableException(
        "Email automation is disabled by the current rollout configuration.",
      )
    }
  }
}
