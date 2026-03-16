import { buildStudentAttendancePermissionBanner } from "./student-attendance-builders-permissions"
import type {
  StudentAttendanceCandidate,
  StudentAttendanceGateModel,
  StudentAttendancePermissionState,
  StudentAttendanceResultBanner,
  StudentAttendanceResultKind,
  SupportedAttendanceMode,
} from "./student-attendance-types"

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
      message: buildStudentAttendancePermissionBanner({
        mode: input.mode,
        permissionState: input.permissionState,
      }).message,
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

function formatAttendanceMode(mode: SupportedAttendanceMode) {
  return mode === "QR_GPS" ? "QR + GPS" : "Bluetooth"
}
