import {
  type AdminApproveReplacementDeviceRequest,
  type AdminApproveReplacementDeviceResponse,
  type AdminDelinkStudentDevicesRequest,
  type AdminDelinkStudentDevicesResponse,
  type AdminDeviceSupportDetail,
  type AdminDeviceSupportSearchQuery,
  type AdminDeviceSupportSummary,
  type AdminRevokeDeviceBindingRequest,
  type AdminStudentManagementDetail,
  type AdminStudentManagementSearchQuery,
  type AdminStudentManagementSummary,
  type AdminUpdateStudentStatusRequest,
  type AdminUpdateStudentStatusResponse,
  type ApproveReplacementStudentDeviceRequest,
  type ApproveReplacementStudentDeviceResponse,
  type RevokeStudentDeviceRegistrationRequest,
  type StudentSupportCaseDetail,
  type StudentSupportCaseSummary,
  type StudentSupportSearchQuery,
  adminApproveReplacementDeviceResponseSchema,
  adminDelinkStudentDevicesResponseSchema,
  adminDeviceSupportDetailSchema,
  adminDeviceSupportSummariesResponseSchema,
  adminStudentManagementDetailSchema,
  adminStudentManagementSearchQuerySchema,
  adminStudentManagementSummariesResponseSchema,
  adminUpdateStudentStatusRequestSchema,
  adminUpdateStudentStatusResponseSchema,
  approveReplacementStudentDeviceRequestSchema,
  approveReplacementStudentDeviceResponseSchema,
  authOperationSuccessSchema,
  revokeStudentDeviceRegistrationRequestSchema,
  studentSupportCaseDetailSchema,
  studentSupportCasesResponseSchema,
  studentSupportSearchQuerySchema,
} from "@attendease/contracts"

import { type AuthApiRequest, toQuery } from "./client.core"

export function buildAuthClientAdminMethods(request: AuthApiRequest) {
  return {
    listAdminDeviceSupport(
      token: string,
      filters: Partial<AdminDeviceSupportSearchQuery> = {},
    ): Promise<AdminDeviceSupportSummary[]> {
      return request("/admin/device-bindings", {
        method: "GET",
        token,
        query: toQuery(filters as Record<string, string | boolean | number | undefined>),
        parse: adminDeviceSupportSummariesResponseSchema.parse,
      })
    },
    listAdminStudents(
      token: string,
      filters: Partial<AdminStudentManagementSearchQuery> = {},
    ): Promise<AdminStudentManagementSummary[]> {
      const query = adminStudentManagementSearchQuerySchema.parse(filters)

      return request("/admin/students", {
        method: "GET",
        token,
        query: toQuery(query),
        parse: adminStudentManagementSummariesResponseSchema.parse,
      })
    },
    listStudentSupportCases(
      token: string,
      filters: Partial<StudentSupportSearchQuery> = {},
    ): Promise<StudentSupportCaseSummary[]> {
      const query = studentSupportSearchQuerySchema.parse(filters)

      return request("/admin/students", {
        method: "GET",
        token,
        query: toQuery(query),
        parse: studentSupportCasesResponseSchema.parse,
      })
    },
    getAdminDeviceSupport(token: string, studentId: string): Promise<AdminDeviceSupportDetail> {
      return request(`/admin/device-bindings/${studentId}`, {
        method: "GET",
        token,
        parse: adminDeviceSupportDetailSchema.parse,
      })
    },
    getAdminStudent(token: string, studentId: string): Promise<AdminStudentManagementDetail> {
      return request(`/admin/students/${studentId}`, {
        method: "GET",
        token,
        parse: adminStudentManagementDetailSchema.parse,
      })
    },
    getStudentSupportCase(token: string, studentId: string): Promise<StudentSupportCaseDetail> {
      return request(`/admin/students/${studentId}`, {
        method: "GET",
        token,
        parse: studentSupportCaseDetailSchema.parse,
      })
    },
    updateAdminStudentStatus(
      token: string,
      studentId: string,
      payload: AdminUpdateStudentStatusRequest,
    ): Promise<AdminUpdateStudentStatusResponse> {
      return request(`/admin/students/${studentId}/status`, {
        method: "POST",
        token,
        payload: adminUpdateStudentStatusRequestSchema.parse(payload),
        parse: adminUpdateStudentStatusResponseSchema.parse,
      })
    },
    revokeAdminDeviceBinding(
      token: string,
      bindingId: string,
      payload: AdminRevokeDeviceBindingRequest,
    ): Promise<void> {
      return request(`/admin/device-bindings/${bindingId}/revoke`, {
        method: "POST",
        token,
        payload,
        parse: authOperationSuccessSchema.parse,
      }).then(() => undefined)
    },
    revokeStudentDeviceRegistration(
      token: string,
      bindingId: string,
      payload: RevokeStudentDeviceRegistrationRequest,
    ): Promise<void> {
      return request(`/admin/device-bindings/${bindingId}/revoke`, {
        method: "POST",
        token,
        payload: revokeStudentDeviceRegistrationRequestSchema.parse(payload),
        parse: authOperationSuccessSchema.parse,
      }).then(() => undefined)
    },
    delinkAdminStudentDevices(
      token: string,
      studentId: string,
      payload: AdminDelinkStudentDevicesRequest,
    ): Promise<AdminDelinkStudentDevicesResponse> {
      return request(`/admin/device-bindings/${studentId}/delink`, {
        method: "POST",
        token,
        payload,
        parse: adminDelinkStudentDevicesResponseSchema.parse,
      })
    },
    approveAdminReplacementDevice(
      token: string,
      studentId: string,
      payload: AdminApproveReplacementDeviceRequest,
    ): Promise<AdminApproveReplacementDeviceResponse> {
      return request(`/admin/device-bindings/${studentId}/approve-new-device`, {
        method: "POST",
        token,
        payload,
        parse: adminApproveReplacementDeviceResponseSchema.parse,
      })
    },
    approveReplacementStudentDevice(
      token: string,
      studentId: string,
      payload: ApproveReplacementStudentDeviceRequest,
    ): Promise<ApproveReplacementStudentDeviceResponse> {
      return request(`/admin/device-bindings/${studentId}/approve-new-device`, {
        method: "POST",
        token,
        payload: approveReplacementStudentDeviceRequestSchema.parse(payload),
        parse: approveReplacementStudentDeviceResponseSchema.parse,
      })
    },
  }
}
