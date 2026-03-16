import type { MarkBluetoothAttendanceRequest, MarkQrAttendanceRequest } from "@attendease/contracts"
import type { StudentQrLocationSnapshot } from "./student-attendance-types"
import type { StudentBluetoothMarkRequestInput } from "./student-attendance-types"

export function buildStudentQrMarkRequest(input: {
  qrPayload: string
  location: StudentQrLocationSnapshot | null
  deviceTimestamp?: string | null
}): MarkQrAttendanceRequest | null {
  if (!input.location) {
    return null
  }

  return {
    qrPayload: input.qrPayload.trim(),
    latitude: input.location.latitude,
    longitude: input.location.longitude,
    accuracyMeters: input.location.accuracyMeters,
    ...(input.deviceTimestamp
      ? { deviceTimestamp: input.deviceTimestamp }
      : {
          deviceTimestamp: input.location.capturedAt,
        }),
  }
}

export function buildStudentBluetoothMarkRequest(
  input: StudentBluetoothMarkRequestInput,
): MarkBluetoothAttendanceRequest {
  return {
    detectedPayload: input.detectedPayload.trim(),
    ...(input.rssi !== undefined && input.rssi !== null ? { rssi: input.rssi } : {}),
    ...(input.deviceTimestamp ? { deviceTimestamp: input.deviceTimestamp } : {}),
  }
}
