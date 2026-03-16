import {
  canStudentMarkAttendanceWithDeviceTrust,
  trustedDeviceInstallIdHeaderName,
} from "@attendease/auth"
import { type MobileEnv, loadMobileEnv } from "@attendease/config"
import type {
  DevicePlatform,
  DeviceRegistrationRequest,
  TrustedDeviceAttendanceReadyResponse,
  TrustedDeviceContext,
  TrustedDeviceReason,
} from "@attendease/contracts"

import { createMobileAuthBootstrap } from "./auth"

type AttestationMode =
  | MobileEnv["EXPO_PUBLIC_DEVICE_ATTESTATION_ANDROID_MODE"]
  | MobileEnv["EXPO_PUBLIC_DEVICE_ATTESTATION_APPLE_MODE"]

export type MobileAttestationPlaceholder = {
  platform: "ANDROID" | "IOS"
  mode: AttestationMode
  provider: string | null
  description: string
}

export type StudentAttendanceGateModel = {
  title: string
  message: string
  tone: "success" | "warning" | "danger"
  supportHint: string
  canContinue: boolean
}

export function createMobileDeviceTrustBootstrap(
  source: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
) {
  const env = loadMobileEnv(source)
  const authBootstrap = createMobileAuthBootstrap(source)
  const androidAttestation = resolveAttestationPlaceholder(
    "ANDROID",
    env.EXPO_PUBLIC_DEVICE_ATTESTATION_ANDROID_MODE,
  )
  const appleAttestation = resolveAttestationPlaceholder(
    "IOS",
    env.EXPO_PUBLIC_DEVICE_ATTESTATION_APPLE_MODE,
  )

  return {
    installHeaderName: trustedDeviceInstallIdHeaderName,
    androidAttestation,
    appleAttestation,
    authClient: authBootstrap.authClient,
    buildRegistrationPayload(input: {
      installId: string
      platform: DevicePlatform
      publicKey: string
      appVersion?: string
      deviceModel?: string
      osVersion?: string
    }): DeviceRegistrationRequest {
      const attestation = resolveRegistrationAttestation(
        input.platform,
        androidAttestation,
        appleAttestation,
      )

      return {
        installId: input.installId,
        platform: input.platform,
        publicKey: input.publicKey,
        ...(input.appVersion ? { appVersion: input.appVersion } : {}),
        ...(input.deviceModel ? { deviceModel: input.deviceModel } : {}),
        ...(input.osVersion ? { osVersion: input.osVersion } : {}),
        ...(attestation.provider ? { attestationProvider: attestation.provider } : {}),
      }
    },
    async registerCurrentDevice(token: string, payload: DeviceRegistrationRequest) {
      return authBootstrap.authClient.registerDevice(token, payload)
    },
    async getAttendanceReady(token: string, installId: string) {
      return authBootstrap.authClient.getTrustedAttendanceReady(token, installId)
    },
  }
}

export function buildStudentAttendanceGateModel(input: {
  deviceTrust?: TrustedDeviceContext | null
  attendanceReady?: TrustedDeviceAttendanceReadyResponse | null
}): StudentAttendanceGateModel {
  if (input.attendanceReady?.ready) {
    return {
      title: "Attendance device verified",
      message: "This student session is running on the trusted device bound for attendance.",
      tone: "success",
      supportHint: "QR or Bluetooth attendance can continue on this phone.",
      canContinue: true,
    }
  }

  const deviceTrust = input.deviceTrust ?? null

  if (!deviceTrust) {
    return {
      title: "Device trust unavailable",
      message: "Attendance is waiting for trusted-device context before this student can continue.",
      tone: "warning",
      supportHint: "Register the device after login and retry attendance readiness.",
      canContinue: false,
    }
  }

  switch (deviceTrust.lifecycleState) {
    case "TRUSTED":
      return {
        title: "Trusted device ready",
        message: "The device is trusted for student attendance on this account.",
        tone: "success",
        supportHint: "Attendance can continue once the session-specific checks pass.",
        canContinue: true,
      }
    case "PENDING_REPLACEMENT":
      return {
        title: "Replacement phone pending approval",
        message:
          "This phone is waiting for admin approval before it can become the attendance device for this student.",
        tone: "warning",
        supportHint:
          "Keep the old phone inactive and ask admin support to approve the replacement device.",
        canContinue: false,
      }
    case "REPLACED":
      return {
        title: "This phone was replaced",
        message:
          "Attendance moved to another approved phone, so this device can no longer mark attendance.",
        tone: "danger",
        supportHint:
          "Use the approved replacement phone or ask admin support if the change was incorrect.",
        canContinue: false,
      }
    case "UNREGISTERED":
      return {
        title: "Device registration incomplete",
        message:
          "Attendance cannot continue until the app presents the expected device registration for this student.",
        tone: "warning",
        supportHint:
          "Finish sign in on the assigned phone, keep the same install active, and retry the attendance check.",
        canContinue: false,
      }
    default:
      break
  }

  if (canStudentMarkAttendanceWithDeviceTrust(deviceTrust.state)) {
    return {
      title: "Trusted device ready",
      message: "The device is trusted for student attendance on this account.",
      tone: "success",
      supportHint: "Attendance can continue once the session-specific checks pass.",
      canContinue: true,
    }
  }

  return buildBlockedAttendanceGate(deviceTrust.reason)
}

function buildBlockedAttendanceGate(
  reason: TrustedDeviceReason | undefined,
): StudentAttendanceGateModel {
  switch (reason) {
    case "DEVICE_ALREADY_BOUND_TO_ANOTHER_STUDENT":
      return {
        title: "Attendance blocked on this phone",
        message:
          "This device is already bound to another student's attendance profile and cannot be reused.",
        tone: "danger",
        supportHint: "Use the assigned student phone or ask admin support to review the binding.",
        canContinue: false,
      }
    case "STUDENT_ALREADY_HAS_ANOTHER_DEVICE":
    case "DEVICE_REPLACEMENT_PENDING_APPROVAL":
      return {
        title: "Replacement phone approval required",
        message:
          "This student already has another trusted attendance device, so this new install is waiting for approval.",
        tone: "danger",
        supportHint:
          "Ask admin support to delink the old phone or approve this replacement device.",
        canContinue: false,
      }
    case "DEVICE_REPLACED":
      return {
        title: "This phone was replaced",
        message:
          "Attendance moved to a newer approved phone, so this device is no longer allowed to mark attendance.",
        tone: "danger",
        supportHint:
          "Use the approved replacement phone or ask admin support if this device should be restored.",
        canContinue: false,
      }
    case "DEVICE_BINDING_REVOKED":
      return {
        title: "This device was revoked",
        message:
          "Attendance has been disabled on this phone because the existing device binding was revoked.",
        tone: "danger",
        supportHint: "Contact admin support if the phone was replaced, repaired, or recovered.",
        canContinue: false,
      }
    case "MISSING_DEVICE_CONTEXT":
      return {
        title: "Device registration incomplete",
        message:
          "Attendance cannot continue until the app presents the expected trusted-device context.",
        tone: "warning",
        supportHint:
          "Finish device registration, keep the same install active, and retry the attendance check.",
        canContinue: false,
      }
    case "DEVICE_ATTESTATION_FAILED":
      return {
        title: "Device integrity check failed",
        message:
          "The app could not trust this device environment for attendance-sensitive student actions.",
        tone: "danger",
        supportHint: "Retry on a supported device or ask support if the device should be reviewed.",
        canContinue: false,
      }
    default:
      return {
        title: "Attendance temporarily blocked",
        message:
          "This student device is not currently trusted enough for attendance-sensitive access.",
        tone: "warning",
        supportHint: "Retry after device registration or contact admin support for recovery.",
        canContinue: false,
      }
  }
}

function resolveRegistrationAttestation(
  platform: DevicePlatform,
  androidAttestation: MobileAttestationPlaceholder,
  appleAttestation: MobileAttestationPlaceholder,
) {
  if (platform === "ANDROID") {
    return androidAttestation
  }

  if (platform === "IOS") {
    return appleAttestation
  }

  return {
    platform: "ANDROID" as const,
    mode: "disabled" as const,
    provider: null,
    description: "Web builds do not participate in mobile device attestation.",
  }
}

function resolveAttestationPlaceholder(
  platform: "ANDROID" | "IOS",
  mode: AttestationMode,
): MobileAttestationPlaceholder {
  if (mode === "disabled") {
    return {
      platform,
      mode,
      provider: null,
      description: "Attestation is disabled for this platform in the current environment.",
    }
  }

  if (mode === "native") {
    return {
      platform,
      mode,
      provider: platform === "ANDROID" ? "play-integrity" : "apple-app-attest",
      description:
        platform === "ANDROID"
          ? "Android builds should use the native Play Integrity adapter when it is wired."
          : "iOS builds should use the native App Attest or DeviceCheck adapter when it is wired.",
    }
  }

  return {
    platform,
    mode,
    provider:
      platform === "ANDROID" ? "play-integrity-placeholder" : "apple-app-attest-placeholder",
    description:
      platform === "ANDROID"
        ? "Android currently uses a placeholder Play Integrity integration seam."
        : "iOS currently uses a placeholder App Attest integration seam.",
  }
}
