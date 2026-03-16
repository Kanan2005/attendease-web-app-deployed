import type { DeviceBindingSummary, DeviceSummary } from "@attendease/contracts"

import type { DeviceTrustEvaluation } from "../auth/auth.types.js"

export type TrustedDeviceRequestContext = {
  device: DeviceSummary
  binding: DeviceBindingSummary
  deviceTrust: DeviceTrustEvaluation
}
