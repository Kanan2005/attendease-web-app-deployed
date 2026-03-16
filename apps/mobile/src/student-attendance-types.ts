import type { MarkBluetoothAttendanceRequest, MarkQrAttendanceRequest } from "@attendease/contracts"
import type { AttendanceMode } from "@attendease/contracts"

import type { StudentAttendanceGateModel } from "./device-trust"
import type { StudentAttendanceCandidate } from "./student-workflow-models"

export type { StudentAttendanceGateModel } from "./device-trust"
export type { StudentAttendanceCandidate } from "./student-workflow-models"

export const studentAttendancePermissionStateValues = [
  "PENDING_REQUEST",
  "GRANTED",
  "DENIED",
  "UNAVAILABLE",
] as const

export type StudentAttendancePermissionState =
  (typeof studentAttendancePermissionStateValues)[number]

export const studentAttendanceResultKindValues = ["IDLE", "READY", "SUCCESS", "ERROR"] as const

export type StudentAttendanceResultKind = (typeof studentAttendanceResultKindValues)[number]

export interface StudentAttendancePermissionBanner {
  tone: "primary" | "warning" | "danger" | "success"
  title: string
  message: string
}

export interface StudentAttendanceResultBanner {
  tone: "success" | "warning" | "danger"
  title: string
  message: string
}

export interface StudentAttendanceControllerSnapshot {
  canPrepareSubmission: boolean
  permissionBanner: StudentAttendancePermissionBanner
  resultBanner: StudentAttendanceResultBanner | null
}

export interface StudentQrScanBannerInput {
  cameraMode: "manual" | "camera"
  cameraPermissionState: StudentAttendancePermissionState
  hasQrPayload: boolean
  isPreparingCamera: boolean
}

export type StudentQrCameraPermissionTransition = "REQUESTING" | "DENIED" | "UNAVAILABLE"

export const studentQrLocationStateValues = ["IDLE", "CAPTURING", "READY", "ERROR"] as const

export type StudentQrLocationState = (typeof studentQrLocationStateValues)[number]

export interface StudentQrLocationSnapshot {
  latitude: number
  longitude: number
  accuracyMeters: number
  capturedAt: string
}

export type SupportedAttendanceMode = Extract<AttendanceMode, "QR_GPS" | "BLUETOOTH">

export interface StudentQrMarkRequest {
  qrPayload: string
  latitude: number
  longitude: number
  accuracyMeters: number
  deviceTimestamp?: string
}

export interface StudentQrAttendanceSnapshotInput {
  mode: SupportedAttendanceMode
  gateModel: StudentAttendanceGateModel
  permissionState: StudentAttendancePermissionState
  selectedCandidate: StudentAttendanceCandidate | null
  scanValue: string
  resultKind: StudentAttendanceResultKind
}

export interface StudentAttendanceControllerInput {
  mode: SupportedAttendanceMode
  gateModel: StudentAttendanceGateModel
  permissionState: StudentAttendancePermissionState
  selectedCandidate: StudentAttendanceCandidate | null
  scanValue: string
  resultKind: StudentAttendanceResultKind
}

export interface StudentQrLocationBannerInput {
  locationState: StudentQrLocationState
  location: StudentQrLocationSnapshot | null
  errorMessage?: string | null
}

export interface StudentBluetoothMarkRequestInput {
  detectedPayload: string
  rssi?: number | null
  deviceTimestamp?: string
}
