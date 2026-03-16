import { AuthApiClientError } from "@attendease/auth"

import type { StudentAttendanceResultBanner } from "./student-attendance-types"

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
        message:
          "That nearby Bluetooth session could not be verified. Wait for a fresh scan and try again.",
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
