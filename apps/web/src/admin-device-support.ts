import { createAuthApiClient } from "@attendease/auth"
import { loadWebEnv } from "@attendease/config"

import { webEnvSource } from "./web-env"
import type {
  AdminDeviceBindingRecord,
  AdminDeviceSupportDetail,
  AdminDeviceSupportSummary,
} from "@attendease/contracts"

export type AdminDeviceWorkspaceView = "support" | "recovery"

const adminSupportLabelOverrides: Record<string, string> = {
  TRUSTED: "Trusted",
  PENDING_REPLACEMENT: "Pending approval",
  REPLACED: "Replaced",
  BLOCKED: "Blocked",
  UNREGISTERED: "No device",
  NOT_APPLICABLE: "Not applicable",
  DEVICE_BOUND: "Device bound",
  DEVICE_REVOKED: "Device revoked",
  ATTENDANCE_BLOCKED_UNTRUSTED_DEVICE: "Attendance blocked on untrusted device",
  ATTENDANCE_LOCATION_VALIDATION_FAILED: "Location validation failed",
  ATTENDANCE_BLUETOOTH_VALIDATION_FAILED: "Bluetooth validation failed",
  MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT: "Same device used across accounts",
  SECOND_DEVICE_FOR_STUDENT_ATTEMPT: "Second phone attempt",
  REVOKED_DEVICE_USED: "Revoked phone used",
  LOGIN_RISK_DETECTED: "Login risk detected",
  DEVICE_REVOKE: "Device revoked by admin",
  DEVICE_APPROVE_REPLACEMENT: "Replacement phone approved",
  SEMESTER_ARCHIVE: "Semester archived",
  CLASSROOM_ARCHIVE: "Classroom archived",
  CLASSROOM_STUDENT_REMOVE: "Student removed from classroom",
}

export function createWebAdminDeviceSupportBootstrap(
  source: Record<string, string | undefined> = webEnvSource,
) {
  const env = loadWebEnv(source)

  return {
    apiBaseUrl: env.NEXT_PUBLIC_API_URL,
    pageTitle: "Admin Support and Device Recovery",
    authClient: createAuthApiClient({
      baseUrl: env.NEXT_PUBLIC_API_URL,
    }),
  }
}

export function resolveAdminDeviceWorkspaceView(
  value: string | null | undefined,
): AdminDeviceWorkspaceView {
  return value === "support" ? "support" : "recovery"
}

export function buildAdminDeviceWorkspaceModel(input: {
  view: AdminDeviceWorkspaceView
  hasSessionToken: boolean
}) {
  if (input.view === "support") {
    return {
      title: "Student support desk",
      description:
        "Search for a student, review the current attendance phone state, and decide whether the case needs recovery.",
      searchLabel: "Search students, roll numbers, or install IDs",
      searchPlaceholder: "student.one, 22CS101, or seed-install-student-one",
      searchButtonLabel: "Review support cases",
      emptyResultsMessage: "No student support cases loaded yet.",
      emptyDetailMessage: "Open a student support case to review device state and recent events.",
      selectedRecordTitle: "Selected support case",
      sessionMessage: input.hasSessionToken
        ? "Using the protected admin session for student support. Token override is optional and stays secondary."
        : "No protected admin session is available here yet. Enter an admin token to open support cases.",
      overrideTitle: "Use a different admin token",
      overrideDescription:
        "Only override the protected session when you need to validate a separate admin identity or recovery environment.",
      summaryTitle: "Support summary",
      summaryDescription:
        "Keep the student profile, current attendance phone, pending replacement state, and recent risk events together before you escalate.",
      actionsTitle: "Need recovery?",
      actionsDescription:
        "Move into device recovery only after you confirm the request and decide a student really needs a revoke, clear, or replacement action.",
      caseLabel: "support case",
    }
  }

  return {
    title: "Device recovery desk",
    description:
      "Use confirmed support cases to deregister the current phone, approve a replacement phone, and keep strict one-device enforcement visible while you work.",
    searchLabel: "Search students, roll numbers, or install IDs",
    searchPlaceholder: "student.one, 22CS101, or replacement-install-id",
    searchButtonLabel: "Load recovery cases",
    emptyResultsMessage: "No recovery cases loaded yet.",
    emptyDetailMessage: "Open a student case before you apply a recovery action.",
    selectedRecordTitle: "Selected recovery case",
    sessionMessage: input.hasSessionToken
      ? "Using the protected admin session for recovery. High-risk actions still require a confirmed reason before they run."
      : "No protected admin session is available here yet. Enter an admin token before using recovery actions.",
    overrideTitle: "Use a different admin token",
    overrideDescription:
      "Only use token override for controlled recovery validation. The protected admin session should stay the normal path.",
    summaryTitle: "Recovery summary",
    summaryDescription:
      "Confirm the student identity, current phone, pending replacement state, recent risk history, and latest recovery action before you change device trust.",
    actionsTitle: "Recovery actions",
    actionsDescription:
      "These actions change who can mark attendance. Record a clear reason, confirm the request, and follow the one-device policy notes before you continue.",
    caseLabel: "recovery case",
  }
}

export function buildAdminDeviceSupportSummaryMessage(
  count: number,
  query: string,
  view: AdminDeviceWorkspaceView = "support",
): string {
  const caseLabel = view === "recovery" ? "recovery case" : "student support case"

  if (count === 0) {
    return `No ${caseLabel}s matched "${query}".`
  }

  if (count === 1) {
    return `Loaded 1 ${caseLabel} for "${query}".`
  }

  return `Loaded ${count} ${caseLabel}s for "${query}".`
}

export function formatAdminSupportLabel(value: string): string {
  const override = adminSupportLabelOverrides[value]

  if (override) {
    return override
  }

  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ")
}

export function buildAdminDeviceActionReadiness(input: {
  action: "revoke" | "delink" | "approve-replacement"
  reason: string
  acknowledged: boolean
  replacementInstallId?: string | null
  replacementPublicKey?: string | null
}) {
  const reason = input.reason.trim()
  const installId = input.replacementInstallId?.trim() ?? ""
  const publicKey = input.replacementPublicKey?.trim() ?? ""

  if (reason.length < 3) {
    return {
      allowed: false,
      message: "Add a clear support reason before you run a recovery action.",
    }
  }

  if (!input.acknowledged) {
    return {
      allowed: false,
      message: "Confirm that the student request was verified before you continue.",
    }
  }

  if (input.action === "approve-replacement" && (!installId || !publicKey)) {
    return {
      allowed: false,
      message: "Enter the new install ID and public key before approving a replacement phone.",
    }
  }

  switch (input.action) {
    case "delink":
      return {
        allowed: true,
        message: "This clears active attendance phones until the student registers again.",
      }
    case "approve-replacement":
      return {
        allowed: true,
        message: "This approves the new phone and revokes older active attendance bindings.",
      }
    default:
      return {
        allowed: true,
        message: "This revokes the selected binding and keeps the audit trail intact.",
      }
  }
}

export function buildAdminDeviceRecoveryListCard(summary: AdminDeviceSupportSummary) {
  return {
    currentDeviceLabel: summary.recovery.currentDeviceLabel ?? "No trusted phone",
    pendingReplacementLabel: summary.recovery.pendingReplacementLabel ?? "No pending replacement",
    nextStepLabel: summary.recovery.recommendedActionLabel,
    nextStepDescription: summary.recovery.recommendedActionMessage,
  }
}

export function buildAdminDeviceRecoveryCaseModel(detail: AdminDeviceSupportDetail) {
  return {
    currentDeviceLabel: detail.recovery.currentDeviceLabel ?? "No trusted phone",
    pendingReplacementLabel: detail.recovery.pendingReplacementLabel ?? "No pending replacement",
    latestRiskLabel: detail.recovery.latestRiskEvent
      ? formatAdminSupportLabel(detail.recovery.latestRiskEvent.eventType)
      : "No recent risk event",
    latestRiskTime: detail.recovery.latestRiskEvent?.createdAt ?? null,
    latestRecoveryActionLabel: detail.recovery.latestRecoveryAction
      ? formatAdminSupportLabel(detail.recovery.latestRecoveryAction.actionType)
      : "No recent recovery action",
    latestRecoveryActionTime: detail.recovery.latestRecoveryAction?.createdAt ?? null,
    nextStepLabel: detail.recovery.recommendedActionLabel,
    nextStepDescription: detail.recovery.recommendedActionMessage,
    strictPolicyNote: detail.recovery.strictPolicyNote,
    canDeregisterCurrentDevice: detail.recovery.actions.canDeregisterCurrentDevice,
    canApproveReplacementDevice: detail.recovery.actions.canApproveReplacementDevice,
  }
}

export function buildAdminDeviceBindingActionLabel(binding: AdminDeviceBindingRecord): string {
  if (binding.binding.status === "REVOKED") {
    return "Already revoked"
  }

  if (binding.binding.status === "PENDING") {
    return "Reject pending phone"
  }

  return "Revoke this phone"
}
