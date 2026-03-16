import type {
  StudentAttendanceResultBanner,
  StudentQrLocationBannerInput,
} from "./student-attendance-types"

export function buildStudentQrLocationBanner(
  input: StudentQrLocationBannerInput,
): StudentAttendanceResultBanner | null {
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
