import {
  type ClearStudentDeviceRegistrationsRequest,
  type ClearStudentDeviceRegistrationsResponse,
  type DeviceRegistrationRequest,
  type DeviceRegistrationResponse,
  type TrustedDeviceAttendanceReadyResponse,
  clearStudentDeviceRegistrationsRequestSchema,
  clearStudentDeviceRegistrationsResponseSchema,
  deviceRegistrationResponseSchema,
  trustedDeviceAttendanceReadyResponseSchema,
} from "@attendease/contracts"

import type { AuthApiRequest } from "./client.core"
import { buildTrustedDeviceHeaders } from "./device"

export function buildAuthClientDeviceMethods(request: AuthApiRequest) {
  return {
    registerDevice(
      token: string,
      payload: DeviceRegistrationRequest,
    ): Promise<DeviceRegistrationResponse> {
      return request("/devices/register", {
        method: "POST",
        token,
        payload,
        parse: deviceRegistrationResponseSchema.parse,
      })
    },
    getTrustedAttendanceReady(
      token: string,
      installId: string,
    ): Promise<TrustedDeviceAttendanceReadyResponse> {
      return request("/devices/trust/attendance-ready", {
        method: "GET",
        token,
        headers: buildTrustedDeviceHeaders(installId),
        parse: trustedDeviceAttendanceReadyResponseSchema.parse,
      })
    },
    clearStudentDeviceRegistrations(
      token: string,
      studentId: string,
      payload: ClearStudentDeviceRegistrationsRequest,
    ): Promise<ClearStudentDeviceRegistrationsResponse> {
      return request(`/admin/device-bindings/${studentId}/delink`, {
        method: "POST",
        token,
        payload: clearStudentDeviceRegistrationsRequestSchema.parse(payload),
        parse: clearStudentDeviceRegistrationsResponseSchema.parse,
      })
    },
  }
}
