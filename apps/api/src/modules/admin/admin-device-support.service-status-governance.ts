import type {
  AdminApproveReplacementDeviceRequest,
  AdminApproveReplacementDeviceResponse,
  AdminDelinkStudentDevicesRequest,
  AdminDelinkStudentDevicesResponse,
  AdminRevokeDeviceBindingRequest,
  AdminUpdateStudentStatusRequest,
} from "@attendease/contracts"
import type { AuthRequestContext } from "../auth/auth.types.js"

import { AdminDeviceSupportServiceStatusGovernanceDevice } from "./admin-device-support.service-status-governance-device.js"
import { AdminDeviceSupportServiceStatusGovernanceStudent } from "./admin-device-support.service-status-governance-student.js"
import type { AdminDeviceSupportDependencies } from "./admin-device-support.service.types.js"

export class AdminDeviceSupportServiceStatusGovernance {
  private readonly studentManagement: AdminDeviceSupportServiceStatusGovernanceStudent
  private readonly deviceManagement: AdminDeviceSupportServiceStatusGovernanceDevice

  constructor(deps: AdminDeviceSupportDependencies) {
    this.studentManagement = new AdminDeviceSupportServiceStatusGovernanceStudent(deps)
    this.deviceManagement = new AdminDeviceSupportServiceStatusGovernanceDevice(deps)
  }

  async updateStudentStatus(
    auth: AuthRequestContext,
    studentId: string,
    request: AdminUpdateStudentStatusRequest,
  ): Promise<{ revokedSessionCount: number }> {
    return this.studentManagement.updateStudentStatus(auth, studentId, request)
  }

  async revokeBinding(
    auth: AuthRequestContext,
    bindingId: string,
    request: AdminRevokeDeviceBindingRequest,
  ): Promise<void> {
    return this.deviceManagement.revokeBinding(auth, bindingId, request)
  }

  async delinkStudentDevices(
    auth: AuthRequestContext,
    studentId: string,
    request: AdminDelinkStudentDevicesRequest,
  ): Promise<AdminDelinkStudentDevicesResponse> {
    return this.deviceManagement.delinkStudentDevices(auth, studentId, request)
  }

  async approveReplacementDevice(
    auth: AuthRequestContext,
    studentId: string,
    request: AdminApproveReplacementDeviceRequest,
  ): Promise<AdminApproveReplacementDeviceResponse> {
    return this.deviceManagement.approveReplacementDevice(auth, studentId, request)
  }
}
