import { buildStudentAttendancePermissionBanner } from "./student-attendance-builders-permissions"
import { buildStudentAttendanceResultBanner } from "./student-attendance-builders-result"
import type {
  StudentAttendanceControllerInput,
  StudentAttendancePermissionBanner,
  StudentAttendancePermissionState,
  StudentAttendanceResultBanner,
  StudentAttendanceResultKind,
} from "./student-attendance-types"

export function buildStudentAttendanceControllerSnapshot(input: StudentAttendanceControllerInput): {
  canPrepareSubmission: boolean
  permissionBanner: StudentAttendancePermissionBanner
  resultBanner: StudentAttendanceResultBanner | null
} {
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
  transition: "REQUESTING" | "DENIED" | "UNAVAILABLE"
}): StudentAttendancePermissionState {
  if (input.transition === "DENIED") {
    return "DENIED"
  }

  if (input.transition === "UNAVAILABLE") {
    return "UNAVAILABLE"
  }

  return input.currentPermissionState === "GRANTED" ? "GRANTED" : "PENDING_REQUEST"
}
