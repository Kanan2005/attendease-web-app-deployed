import type {
  AdminApproveReplacementDeviceRequest,
  AdminApproveReplacementDeviceResponse,
  AdminDelinkStudentDevicesRequest,
  AdminDelinkStudentDevicesResponse,
  AdminDeviceSupportDetail,
  AdminDeviceSupportSearchQuery,
  AdminDeviceSupportSummary,
  AdminRevokeDeviceBindingRequest,
  AdminStudentManagementDetail,
  AdminStudentManagementSearchQuery,
  AdminStudentManagementSummary,
  AdminUpdateStudentStatusRequest,
  AdminUpdateStudentStatusResponse,
} from "@attendease/contracts"
import { Inject, Injectable } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { DeviceBindingPolicyService } from "../devices/device-binding-policy.service.js"

import { AdminDeviceSupportServiceManagementQueries } from "./admin-device-support.service-management-queries.js"
import { AdminDeviceSupportServiceStatusGovernance } from "./admin-device-support.service-status-governance.js"
import { AdminDeviceSupportServiceSearchQueries } from "./admin-device-support.service.search-queries.js"

@Injectable()
export class AdminDeviceSupportService {
  private readonly searchQueries: AdminDeviceSupportServiceSearchQueries
  private readonly managementQueries: AdminDeviceSupportServiceManagementQueries
  private readonly statusGovernance: AdminDeviceSupportServiceStatusGovernance

  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
    @Inject(DeviceBindingPolicyService)
    private readonly deviceBindingPolicyService: DeviceBindingPolicyService,
  ) {
    const deps = {
      database,
      deviceBindingPolicyService,
    }

    this.searchQueries = new AdminDeviceSupportServiceSearchQueries(deps)
    this.managementQueries = new AdminDeviceSupportServiceManagementQueries(deps)
    this.statusGovernance = new AdminDeviceSupportServiceStatusGovernance(deps)
  }

  async listStudentDeviceSupport(
    filters: AdminDeviceSupportSearchQuery,
  ): Promise<AdminDeviceSupportSummary[]> {
    return this.searchQueries.listStudentDeviceSupport(filters)
  }

  async getStudentDeviceSupport(studentId: string): Promise<AdminDeviceSupportDetail> {
    return this.searchQueries.getStudentDeviceSupport(studentId)
  }

  async listStudentManagement(
    filters: AdminStudentManagementSearchQuery,
  ): Promise<AdminStudentManagementSummary[]> {
    return this.managementQueries.listStudentManagement(filters)
  }

  async getStudentManagementDetail(studentId: string): Promise<AdminStudentManagementDetail> {
    return this.managementQueries.getStudentManagementDetail(studentId)
  }

  async updateStudentStatus(
    auth: AuthRequestContext,
    studentId: string,
    request: AdminUpdateStudentStatusRequest,
  ): Promise<AdminUpdateStudentStatusResponse> {
    const updateSummary = await this.statusGovernance.updateStudentStatus(auth, studentId, request)

    return {
      student: await this.getStudentManagementDetail(studentId),
      revokedSessionCount: updateSummary.revokedSessionCount,
    }
  }

  async revokeBinding(
    auth: AuthRequestContext,
    bindingId: string,
    request: AdminRevokeDeviceBindingRequest,
  ): Promise<void> {
    return this.statusGovernance.revokeBinding(auth, bindingId, request)
  }

  async delinkStudentDevices(
    auth: AuthRequestContext,
    studentId: string,
    request: AdminDelinkStudentDevicesRequest,
  ): Promise<AdminDelinkStudentDevicesResponse> {
    return this.statusGovernance.delinkStudentDevices(auth, studentId, request)
  }

  async approveReplacementDevice(
    auth: AuthRequestContext,
    studentId: string,
    request: AdminApproveReplacementDeviceRequest,
  ): Promise<AdminApproveReplacementDeviceResponse> {
    return this.statusGovernance.approveReplacementDevice(auth, studentId, request)
  }
}
