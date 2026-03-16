import { AuthApiClientError } from "@attendease/auth"
import type { MarkBluetoothAttendanceRequest, MarkQrAttendanceRequest } from "@attendease/contracts"
import type { AttendanceMode } from "@attendease/contracts"

import type { StudentAttendanceGateModel } from "./device-trust"
import type { StudentAttendanceCandidate } from "./student-workflow-models"

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

type SupportedAttendanceMode = Extract<AttendanceMode, "QR_GPS" | "BLUETOOTH">

export function buildStudentAttendancePermissionBanner(input: {
  mode: SupportedAttendanceMode
  permissionState: StudentAttendancePermissionState
}): StudentAttendancePermissionBanner {
  if (input.permissionState === "GRANTED") {
    return {
      tone: "success",
      title: "Permission ready",
      message:
        input.mode === "QR_GPS"
          ? "QR attendance can continue once the live QR and location are ready."
          : "Bluetooth access is ready for the attendance scan flow.",
    }
  }

  if (input.permissionState === "DENIED") {
    return {
      tone: "danger",
      title: "Permission denied",
      message:
        input.mode === "QR_GPS"
          ? "Camera or location access was denied, so QR attendance cannot continue yet."
          : "Bluetooth access is required before Bluetooth attendance can continue.",
    }
  }

  if (input.permissionState === "UNAVAILABLE") {
    return {
      tone: "danger",
      title: "Capability unavailable",
      message:
        input.mode === "QR_GPS"
          ? "This device cannot complete QR attendance until camera and location are available."
          : "This device cannot complete the Bluetooth attendance flow until Bluetooth support is available.",
    }
  }

  return {
    tone: "warning",
    title: "Permission needed",
    message:
      input.mode === "QR_GPS"
        ? "AttendEase will ask for camera or location only when the QR flow needs it."
        : "AttendEase checks Bluetooth only when the nearby teacher scan needs it.",
  }
}

export function buildStudentQrScanBanner(
  input: StudentQrScanBannerInput,
): StudentAttendancePermissionBanner {
  if (input.hasQrPayload) {
    return {
      tone: "success",
      title: "QR captured",
      message: "The live QR is ready. Confirm your location, then submit attendance.",
    }
  }

  if (input.isPreparingCamera) {
    return {
      tone: "warning",
      title: "Opening camera",
      message: "Approve camera access so AttendEase can scan the live classroom QR.",
    }
  }

  if (input.cameraMode === "camera") {
    return {
      tone: "primary",
      title: "Scanning for QR",
      message: "Point your camera at the live classroom QR. The code fills in automatically.",
    }
  }

  if (input.cameraPermissionState === "DENIED") {
    return {
      tone: "warning",
      title: "Camera denied",
      message: "You can still paste the live QR manually, or enable camera access in settings.",
    }
  }

  if (input.cameraPermissionState === "UNAVAILABLE") {
    return {
      tone: "warning",
      title: "Camera unavailable",
      message: "Use manual QR entry on this device or build.",
    }
  }

  return {
    tone: "primary",
    title: "Scan the live QR",
    message: "Open the camera for the fastest path, or paste the live QR if you already have it.",
  }
}

export function buildStudentAttendanceResultBanner(input: {
  mode: SupportedAttendanceMode
  resultKind: StudentAttendanceResultKind
  gateModel: StudentAttendanceGateModel
  permissionState: StudentAttendancePermissionState
  selectedCandidate: StudentAttendanceCandidate | null
  scanValue: string
}): StudentAttendanceResultBanner | null {
  if (input.resultKind === "IDLE") {
    return null
  }

  if (input.resultKind === "SUCCESS") {
    return {
      tone: "success",
      title: "Attendance marked",
      message: "Your attendance was recorded and the latest classroom data is being refreshed.",
    }
  }

  if (!input.gateModel.canContinue) {
    return {
      tone: input.gateModel.tone === "danger" ? "danger" : "warning",
      title: input.gateModel.title,
      message: input.gateModel.supportHint,
    }
  }

  if (input.permissionState === "DENIED" || input.permissionState === "UNAVAILABLE") {
    return {
      tone: "danger",
      title: "Attendance blocked by permissions",
      message: buildStudentAttendancePermissionBanner(input).message,
    }
  }

  if (!input.selectedCandidate) {
    return {
      tone: "warning",
      title: "No attendance session open",
      message: `No live ${formatAttendanceMode(input.mode)} attendance session is open right now.`,
    }
  }

  if (input.mode === "QR_GPS" && input.scanValue.trim().length < 4) {
    return {
      tone: "warning",
      title: "QR payload required",
      message: "Scan or paste the live QR before you submit attendance.",
    }
  }

  if (input.mode === "QR_GPS" && input.permissionState === "PENDING_REQUEST") {
    return {
      tone: "warning",
      title: "Location needed",
      message: "Capture your location before you submit attendance.",
    }
  }

  if (input.resultKind === "READY") {
    return {
      tone: "success",
      title: "Ready to submit",
      message:
        input.mode === "QR_GPS"
          ? "The live QR, your location, and the active attendance session are all ready."
          : "The nearby Bluetooth session is ready to submit.",
    }
  }

  return {
    tone: "warning",
    title: "Finish the attendance steps",
    message: "Complete the remaining step so AttendEase can submit attendance safely.",
  }
}

export function buildStudentAttendanceControllerSnapshot(input: {
  mode: SupportedAttendanceMode
  gateModel: StudentAttendanceGateModel
  permissionState: StudentAttendancePermissionState
  selectedCandidate: StudentAttendanceCandidate | null
  scanValue: string
  resultKind: StudentAttendanceResultKind
}): StudentAttendanceControllerSnapshot {
  const canPrepareSubmission =
    input.gateModel.canContinue &&
    input.permissionState === "GRANTED" &&
    Boolean(input.selectedCandidate) &&
    (input.mode === "BLUETOOTH" || input.scanValue.trim().length >= 4)

  return {
    canPrepareSubmission,
    permissionBanner: buildStudentAttendancePermissionBanner({
      mode: input.mode,
      permissionState: input.permissionState,
    }),
    resultBanner: buildStudentAttendanceResultBanner(input),
  }
}

export function resolveStudentQrCameraPermissionState(input: {
  currentPermissionState: StudentAttendancePermissionState
  transition: StudentQrCameraPermissionTransition
}): StudentAttendancePermissionState {
  if (input.transition === "DENIED") {
    return "DENIED"
  }

  if (input.transition === "UNAVAILABLE") {
    return "UNAVAILABLE"
  }

  return input.currentPermissionState === "GRANTED" ? "GRANTED" : "PENDING_REQUEST"
}

export function buildStudentQrLocationBanner(input: {
  locationState: StudentQrLocationState
  location: StudentQrLocationSnapshot | null
  errorMessage?: string | null
}): StudentAttendanceResultBanner | null {
  if (input.locationState === "IDLE") {
    return {
      tone: "warning",
      title: "Location needed",
      message: "Capture your location so AttendEase can confirm you are inside the class area.",
    }
  }

  if (input.locationState === "CAPTURING") {
    return {
      tone: "warning",
      title: "Checking your location",
      message: "Stay still for a moment while AttendEase gets a fresh GPS fix.",
    }
  }

  if (input.locationState === "ERROR") {
    return {
      tone: "danger",
      title: "Location failed",
      message:
        input.errorMessage ?? "Location access is required before QR attendance can be submitted.",
    }
  }

  if (!input.location) {
    return null
  }

  return {
    tone: "success",
    title: "Location ready",
    message: `Accuracy ${Math.round(input.location.accuracyMeters)}m. You can submit attendance now.`,
  }
}

export function buildStudentQrMarkRequest(input: {
  qrPayload: string
  location: StudentQrLocationSnapshot | null
  deviceTimestamp?: string
}): MarkQrAttendanceRequest | null {
  if (!input.location) {
    return null
  }

  return {
    qrPayload: input.qrPayload.trim(),
    latitude: input.location.latitude,
    longitude: input.location.longitude,
    accuracyMeters: input.location.accuracyMeters,
    ...((input.deviceTimestamp ?? input.location.capturedAt)
      ? { deviceTimestamp: input.deviceTimestamp ?? input.location.capturedAt }
      : {}),
  }
}

export function buildStudentBluetoothMarkRequest(input: {
  detectedPayload: string
  rssi?: number | null
  deviceTimestamp?: string
}): MarkBluetoothAttendanceRequest {
  return {
    detectedPayload: input.detectedPayload.trim(),
    ...(input.rssi !== undefined && input.rssi !== null ? { rssi: input.rssi } : {}),
    ...(input.deviceTimestamp ? { deviceTimestamp: input.deviceTimestamp } : {}),
  }
}

export function buildStudentQrAttendanceErrorBanner(error: unknown): StudentAttendanceResultBanner {
  if (error instanceof AuthApiClientError) {
    const detailMessage = extractApiErrorMessage(error.details)

    if (error.status === 409 && detailMessage?.toLowerCase().includes("expired")) {
      return {
        tone: "warning",
        title: "QR expired",
        message: "The QR changed before you submitted. Scan the latest QR and try again.",
      }
    }

    if (error.status === 400 && detailMessage?.toLowerCase().includes("invalid")) {
      return {
        tone: "danger",
        title: "Invalid QR",
        message: "That QR does not match the current attendance session.",
      }
    }

    if (error.status === 409 && detailMessage?.toLowerCase().includes("not active")) {
      return {
        tone: "warning",
        title: "Session closed",
        message: "This attendance session is no longer open. Ask your teacher to refresh the QR.",
      }
    }

    if (error.status === 403 && detailMessage?.toLowerCase().includes("outside")) {
      return {
        tone: "danger",
        title: "Outside allowed range",
        message: "You need to be closer to the classroom area before attendance can be marked.",
      }
    }

    if (error.status === 400 && detailMessage?.toLowerCase().includes("accuracy is too low")) {
      return {
        tone: "warning",
        title: "Location accuracy too low",
        message: "Move to an open area and try again once your GPS accuracy improves.",
      }
    }

    if (error.status === 409 && detailMessage?.toLowerCase().includes("already been marked")) {
      return {
        tone: "warning",
        title: "Attendance already marked",
        message: "You already have a present mark for this attendance session.",
      }
    }

    if (error.status === 403) {
      return {
        tone: "danger",
        title: "Attendance blocked",
        message:
          detailMessage ?? "Attendance is currently blocked by classroom or trusted-device policy.",
      }
    }

    return {
      tone: "danger",
      title: "QR attendance failed",
      message: detailMessage ?? "AttendEase could not submit the QR attendance request.",
    }
  }

  return {
    tone: "danger",
    title: "QR attendance failed",
    message: error instanceof Error ? error.message : "AttendEase hit an unexpected QR error.",
  }
}

export function buildStudentBluetoothAttendanceErrorBanner(
  error: unknown,
): StudentAttendanceResultBanner {
  if (error instanceof AuthApiClientError) {
    const detailMessage = extractApiErrorMessage(error.details)

    if (error.status === 409 && detailMessage?.toLowerCase().includes("expired")) {
      return {
        tone: "warning",
        title: "Bluetooth token expired",
        message:
          "The nearby Bluetooth identifier rotated before submission. Wait for a fresh scan and retry.",
      }
    }

    if (error.status === 400 && detailMessage?.toLowerCase().includes("invalid")) {
      return {
        tone: "danger",
        title: "Invalid Bluetooth session",
        message: "That nearby Bluetooth session could not be verified. Wait for a fresh scan and try again.",
      }
    }

    if (error.status === 409 && detailMessage?.toLowerCase().includes("not active")) {
      return {
        tone: "warning",
        title: "Session closed",
        message: "This attendance session is no longer open. Ask your teacher to start it again.",
      }
    }

    if (error.status === 409 && detailMessage?.toLowerCase().includes("already been marked")) {
      return {
        tone: "warning",
        title: "Attendance already marked",
        message: "You already have a present mark for this attendance session.",
      }
    }

    if (error.status === 403) {
      return {
        tone: "danger",
        title: "Attendance blocked",
        message:
          detailMessage ?? "Attendance is currently blocked by classroom or trusted-device policy.",
      }
    }

    return {
      tone: "danger",
      title: "Bluetooth attendance failed",
      message: detailMessage ?? "AttendEase could not submit the Bluetooth attendance request.",
    }
  }

  return {
    tone: "danger",
    title: "Bluetooth attendance failed",
    message:
      error instanceof Error ? error.message : "AttendEase hit an unexpected Bluetooth error.",
  }
}

function formatAttendanceMode(mode: SupportedAttendanceMode) {
  return mode === "QR_GPS" ? "QR + GPS" : "Bluetooth"
}

function extractApiErrorMessage(details: unknown): string | null {
  if (!details || typeof details !== "object") {
    return null
  }

  const maybeMessage = "message" in details ? (details as { message?: unknown }).message : null

  if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
    return maybeMessage
  }

  if (
    Array.isArray(maybeMessage) &&
    maybeMessage.length > 0 &&
    typeof maybeMessage[0] === "string"
  ) {
    return maybeMessage[0]
  }

  return null
}
