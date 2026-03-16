import {
  type AttendanceSessionDetail,
  type AttendanceSessionHistoryItem,
  type AttendanceSessionHistoryListQuery,
  type AttendanceSessionStudentSummary,
  type AttendanceSessionSummary,
  type BluetoothSessionCreateResponse,
  type CreateBluetoothSessionRequest,
  type CreateQrSessionRequest,
  type LiveAttendanceSessionDiscoveryQuery,
  type LiveAttendanceSessionSummary,
  type ManualAttendanceUpdateRequest,
  type ManualAttendanceUpdateResponse,
  type MarkBluetoothAttendanceRequest,
  type MarkBluetoothAttendanceResponse,
  type MarkQrAttendanceRequest,
  type MarkQrAttendanceResponse,
  type UpdateAttendanceSessionAttendanceRequest,
  type UpdateAttendanceSessionAttendanceResponse,
  attendanceSessionDetailSchema,
  attendanceSessionHistoryListQuerySchema,
  attendanceSessionHistoryResponseSchema,
  attendanceSessionStudentsResponseSchema,
  attendanceSessionSummarySchema,
  bluetoothSessionCreateResponseSchema,
  liveAttendanceSessionDiscoveryQuerySchema,
  liveAttendanceSessionsResponseSchema,
  manualAttendanceActionToStatusMap,
  manualAttendanceUpdateRequestSchema,
  manualAttendanceUpdateResponseSchema,
  markBluetoothAttendanceRequestSchema,
  markBluetoothAttendanceResponseSchema,
  markQrAttendanceRequestSchema,
  markQrAttendanceResponseSchema,
  updateAttendanceSessionAttendanceRequestSchema,
  updateAttendanceSessionAttendanceResponseSchema,
} from "@attendease/contracts"

import { type AuthApiRequest, toQuery } from "./client.core"
import { buildTrustedDeviceHeaders } from "./device"

function toLegacyManualAttendanceUpdateRequest(payload: ManualAttendanceUpdateRequest) {
  const requestPayload = manualAttendanceUpdateRequestSchema.parse(payload)

  return updateAttendanceSessionAttendanceRequestSchema.parse({
    changes: requestPayload.updates.map((update) => ({
      attendanceRecordId: update.attendanceRecordId,
      status: manualAttendanceActionToStatusMap[update.action],
    })),
  })
}

export function buildAuthClientAttendanceMethods(request: AuthApiRequest) {
  const getAttendanceSession = (
    token: string,
    sessionId: string,
  ): Promise<AttendanceSessionSummary> =>
    request(`/sessions/${sessionId}`, {
      method: "GET",
      token,
      parse: attendanceSessionSummarySchema.parse,
    })

  const endAttendanceSession = (
    token: string,
    sessionId: string,
  ): Promise<AttendanceSessionSummary> =>
    request(`/sessions/${sessionId}/end`, {
      method: "POST",
      token,
      parse: attendanceSessionSummarySchema.parse,
    })

  return {
    createQrAttendanceSession(
      token: string,
      payload: CreateQrSessionRequest,
    ): Promise<AttendanceSessionSummary> {
      return request("/sessions/qr", {
        method: "POST",
        token,
        payload,
        parse: attendanceSessionSummarySchema.parse,
      })
    },
    createBluetoothAttendanceSession(
      token: string,
      payload: CreateBluetoothSessionRequest,
    ): Promise<BluetoothSessionCreateResponse> {
      return request("/sessions/bluetooth", {
        method: "POST",
        token,
        payload,
        parse: bluetoothSessionCreateResponseSchema.parse,
      })
    },
    getAttendanceSession,
    listAttendanceSessions(
      token: string,
      filters: AttendanceSessionHistoryListQuery = {},
    ): Promise<AttendanceSessionHistoryItem[]> {
      return request("/sessions", {
        method: "GET",
        token,
        query: toQuery(attendanceSessionHistoryListQuerySchema.parse(filters)),
        parse: attendanceSessionHistoryResponseSchema.parse,
      })
    },
    listLiveAttendanceSessions(
      token: string,
      filters: LiveAttendanceSessionDiscoveryQuery = {},
    ): Promise<LiveAttendanceSessionSummary[]> {
      return request("/sessions/live", {
        method: "GET",
        token,
        query: toQuery(liveAttendanceSessionDiscoveryQuerySchema.parse(filters)),
        parse: liveAttendanceSessionsResponseSchema.parse,
      })
    },
    getAttendanceSessionDetail(token: string, sessionId: string): Promise<AttendanceSessionDetail> {
      return request(`/sessions/${sessionId}`, {
        method: "GET",
        token,
        parse: attendanceSessionDetailSchema.parse,
      })
    },
    listAttendanceSessionStudents(
      token: string,
      sessionId: string,
    ): Promise<AttendanceSessionStudentSummary[]> {
      return request(`/sessions/${sessionId}/students`, {
        method: "GET",
        token,
        parse: attendanceSessionStudentsResponseSchema.parse,
      })
    },
    updateAttendanceSessionAttendance(
      token: string,
      sessionId: string,
      payload: UpdateAttendanceSessionAttendanceRequest,
    ): Promise<UpdateAttendanceSessionAttendanceResponse> {
      return request(`/sessions/${sessionId}/attendance`, {
        method: "PATCH",
        token,
        payload: updateAttendanceSessionAttendanceRequestSchema.parse(payload),
        parse: updateAttendanceSessionAttendanceResponseSchema.parse,
      })
    },
    saveManualAttendanceUpdates(
      token: string,
      sessionId: string,
      payload: ManualAttendanceUpdateRequest,
    ): Promise<ManualAttendanceUpdateResponse> {
      return request(`/sessions/${sessionId}/attendance`, {
        method: "PATCH",
        token,
        payload: toLegacyManualAttendanceUpdateRequest(payload),
        parse: manualAttendanceUpdateResponseSchema.parse,
      })
    },
    getQrAttendanceSession(token: string, sessionId: string): Promise<AttendanceSessionSummary> {
      return getAttendanceSession(token, sessionId)
    },
    endAttendanceSession,
    endQrAttendanceSession(token: string, sessionId: string): Promise<AttendanceSessionSummary> {
      return endAttendanceSession(token, sessionId)
    },
    markQrAttendance(
      token: string,
      installId: string,
      payload: MarkQrAttendanceRequest,
    ): Promise<MarkQrAttendanceResponse> {
      return request("/attendance/qr/mark", {
        method: "POST",
        token,
        headers: buildTrustedDeviceHeaders(installId),
        payload: markQrAttendanceRequestSchema.parse(payload),
        parse: markQrAttendanceResponseSchema.parse,
      })
    },
    markBluetoothAttendance(
      token: string,
      installId: string,
      payload: MarkBluetoothAttendanceRequest,
    ): Promise<MarkBluetoothAttendanceResponse> {
      return request("/attendance/bluetooth/mark", {
        method: "POST",
        token,
        headers: buildTrustedDeviceHeaders(installId),
        payload: markBluetoothAttendanceRequestSchema.parse(payload),
        parse: markBluetoothAttendanceResponseSchema.parse,
      })
    },
  }
}
