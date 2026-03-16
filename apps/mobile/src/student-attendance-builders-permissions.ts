import type {
  StudentAttendancePermissionBanner,
  StudentAttendancePermissionState,
  SupportedAttendanceMode,
} from "./student-attendance-types"

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

export function buildStudentQrScanBanner(input: {
  cameraMode: "manual" | "camera"
  cameraPermissionState: StudentAttendancePermissionState
  hasQrPayload: boolean
  isPreparingCamera: boolean
}): StudentAttendancePermissionBanner {
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
