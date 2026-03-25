import type { DevicePlatform } from "@attendease/contracts"

export interface DeviceIdentity {
  installId: string
  publicKey: string
  platform: Extract<DevicePlatform, "ANDROID" | "IOS"> | "WEB"
  deviceModel: string | null
  osVersion: string | null
  appVersion: string
  resolved: true
}

export type DeviceIdentityState = { resolved: false } | DeviceIdentity

/**
 * Build a deterministic placeholder identity for tests or SSR
 * where the file system is not available.
 */
export function buildPlaceholderDeviceIdentity(
  installId = "student-dev-install",
  publicKey = "student-dev-public-key",
  platform: DeviceIdentity["platform"] = "ANDROID",
): DeviceIdentity {
  return {
    installId,
    publicKey,
    platform,
    deviceModel: null,
    osVersion: "unknown",
    appVersion: "0.1.0",
    resolved: true,
  }
}

/**
 * Classify a login/register error as device-binding related.
 * Returns a structured result the UI can use for specific guidance.
 */
export type DeviceBindingErrorKind =
  | "DEVICE_BOUND_TO_ANOTHER"
  | "REPLACEMENT_PENDING"
  | "DEVICE_REPLACED"
  | "DEVICE_UNREGISTERED"
  | "DEVICE_BLOCKED"
  | null

export function classifyDeviceBindingError(message: string): DeviceBindingErrorKind {
  const lower = message.toLowerCase()
  if (
    lower.includes("already registered to another") ||
    lower.includes("already bound to another")
  ) {
    return "DEVICE_BOUND_TO_ANOTHER"
  }
  if (lower.includes("waiting for admin approval") || lower.includes("replacement")) {
    return "REPLACEMENT_PENDING"
  }
  if (lower.includes("no longer the trusted")) {
    return "DEVICE_REPLACED"
  }
  if (
    lower.includes("requires device registration") ||
    lower.includes("requires a trusted registered")
  ) {
    return "DEVICE_UNREGISTERED"
  }
  if (lower.includes("not trusted") || lower.includes("could not be verified")) {
    return "DEVICE_BLOCKED"
  }
  return null
}

export interface DeviceBindingErrorModel {
  kind: DeviceBindingErrorKind
  title: string
  message: string
  supportHint: string
}

export function buildDeviceBindingErrorModel(errorMessage: string): DeviceBindingErrorModel | null {
  const kind = classifyDeviceBindingError(errorMessage)
  if (!kind) return null

  switch (kind) {
    case "DEVICE_BOUND_TO_ANOTHER":
      return {
        kind,
        title: "Phone already linked",
        message: "This device is already registered to another student's account.",
        supportHint:
          "Each phone can only be linked to one student. Use your own phone or contact admin support.",
      }
    case "REPLACEMENT_PENDING":
      return {
        kind,
        title: "Approval needed",
        message: "This phone is waiting for admin approval as your new attendance device.",
        supportHint: "Contact your admin to approve this device replacement.",
      }
    case "DEVICE_REPLACED":
      return {
        kind,
        title: "Phone was replaced",
        message: "Your attendance was moved to a different approved phone.",
        supportHint: "Use the approved phone or contact admin to switch back to this device.",
      }
    case "DEVICE_UNREGISTERED":
      return {
        kind,
        title: "Device not registered",
        message: "This phone needs to be registered before you can sign in.",
        supportHint: "Try signing in again. If the problem persists, contact admin support.",
      }
    case "DEVICE_BLOCKED":
      return {
        kind,
        title: "Device blocked",
        message: "This phone is not trusted for student attendance.",
        supportHint: "Contact admin support to review your device status.",
      }
  }
}
