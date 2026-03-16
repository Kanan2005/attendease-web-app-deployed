import type {
  AdminApproveReplacementDeviceRequest,
  AdminApproveReplacementDeviceResponse,
  AdminDelinkStudentDevicesRequest,
  AdminDelinkStudentDevicesResponse,
  AdminRevokeDeviceBindingRequest,
} from "@attendease/contracts"
import type { AuthRequestContext } from "../auth/auth.types.js"

import { AdminDeviceSupportServiceStatusGovernanceBinding } from "./admin-device-support.service-status-governance-binding.js"
import { AdminDeviceSupportServiceStatusGovernanceReplacement } from "./admin-device-support.service-status-governance-replacement.js"
import type { AdminDeviceSupportDependencies } from "./admin-device-support.service.types.js"

export class AdminDeviceSupportServiceStatusGovernanceDevice {
  private readonly binding: AdminDeviceSupportServiceStatusGovernanceBinding
  private readonly replacement: AdminDeviceSupportServiceStatusGovernanceReplacement

  constructor(deps: AdminDeviceSupportDependencies) {
    this.binding = new AdminDeviceSupportServiceStatusGovernanceBinding(deps)
    this.replacement = new AdminDeviceSupportServiceStatusGovernanceReplacement(deps)
  }

  async revokeBinding(
    auth: AuthRequestContext,
    bindingId: string,
    request: AdminRevokeDeviceBindingRequest,
  ): Promise<void> {
    return this.binding.revokeBinding(auth, bindingId, request)
  }

  async delinkStudentDevices(
    auth: AuthRequestContext,
    studentId: string,
    request: AdminDelinkStudentDevicesRequest,
  ): Promise<AdminDelinkStudentDevicesResponse> {
    return this.binding.delinkStudentDevices(auth, studentId, request)
  }

  async approveReplacementDevice(
    auth: AuthRequestContext,
    studentId: string,
    request: AdminApproveReplacementDeviceRequest,
  ): Promise<AdminApproveReplacementDeviceResponse> {
    return this.replacement.approveReplacementDevice(auth, studentId, request)
  }
}
