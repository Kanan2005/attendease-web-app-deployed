import { describe, expect, it } from "vitest"

import {
  buildAdminDeviceActionReadiness,
  buildAdminDeviceBindingActionLabel,
  buildAdminDeviceRecoveryCaseModel,
  buildAdminDeviceRecoveryListCard,
  buildAdminDeviceSupportSummaryMessage,
  buildAdminDeviceWorkspaceModel,
  createWebAdminDeviceSupportBootstrap,
  formatAdminSupportLabel,
  resolveAdminDeviceWorkspaceView,
} from "./admin-device-support.js"

describe("admin device support bootstrap", () => {
  it("builds the admin device support bootstrap from public web env", () => {
    const bootstrap = createWebAdminDeviceSupportBootstrap({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_API_URL: "http://localhost:4000",
    })

    expect(bootstrap.apiBaseUrl).toBe("http://localhost:4000")
    expect(bootstrap.pageTitle).toBe("Admin Support and Device Recovery")
  })

  it("normalizes device workspace view selection", () => {
    expect(resolveAdminDeviceWorkspaceView("support")).toBe("support")
    expect(resolveAdminDeviceWorkspaceView("recovery")).toBe("recovery")
    expect(resolveAdminDeviceWorkspaceView("unknown")).toBe("recovery")
  })

  it("builds session-first copy for support and recovery workspaces", () => {
    expect(
      buildAdminDeviceWorkspaceModel({
        view: "support",
        hasSessionToken: true,
      }),
    ).toMatchObject({
      title: "Student support desk",
      searchButtonLabel: "Review support cases",
    })

    expect(
      buildAdminDeviceWorkspaceModel({
        view: "recovery",
        hasSessionToken: false,
      }),
    ).toMatchObject({
      title: "Device recovery desk",
      searchButtonLabel: "Load recovery cases",
      sessionMessage: expect.stringContaining("Enter an admin token"),
    })
  })

  it("formats search summary text for support and recovery workspaces", () => {
    expect(buildAdminDeviceSupportSummaryMessage(0, "student.one")).toContain(
      "No student support cases",
    )
    expect(buildAdminDeviceSupportSummaryMessage(1, "student.one", "recovery")).toContain(
      "Loaded 1 recovery case",
    )
    expect(buildAdminDeviceSupportSummaryMessage(2, "student")).toContain("Loaded 2")
  })

  it("formats internal admin-support enums into product-facing labels", () => {
    expect(formatAdminSupportLabel("PENDING_REPLACEMENT")).toBe("Pending approval")
    expect(formatAdminSupportLabel("SECOND_DEVICE_FOR_STUDENT_ATTEMPT")).toBe(
      "Second phone attempt",
    )
    expect(formatAdminSupportLabel("ACTIVE")).toBe("Active")
  })

  it("requires verified reasons before high-risk device actions can run", () => {
    expect(
      buildAdminDeviceActionReadiness({
        action: "delink",
        reason: "",
        acknowledged: false,
      }),
    ).toEqual({
      allowed: false,
      message: "Add a clear support reason before you run a recovery action.",
    })

    expect(
      buildAdminDeviceActionReadiness({
        action: "revoke",
        reason: "Student changed phones.",
        acknowledged: false,
      }),
    ).toEqual({
      allowed: false,
      message: "Confirm that the student request was verified before you continue.",
    })

    expect(
      buildAdminDeviceActionReadiness({
        action: "approve-replacement",
        reason: "Student changed phones.",
        acknowledged: true,
        replacementInstallId: "replacement-install-id",
        replacementPublicKey: "",
      }),
    ).toEqual({
      allowed: false,
      message: "Enter the new install ID and public key before approving a replacement phone.",
    })

    expect(
      buildAdminDeviceActionReadiness({
        action: "approve-replacement",
        reason: "Student changed phones.",
        acknowledged: true,
        replacementInstallId: "replacement-install-id",
        replacementPublicKey: "replacement-public-key",
      }),
    ).toEqual({
      allowed: true,
      message: "This approves the new phone and revokes older active attendance bindings.",
    })
  })

  it("builds recovery list and detail models from the API recovery summary", () => {
    const summaryCard = buildAdminDeviceRecoveryListCard({
      student: {
        id: "student_1",
        email: "student.one@attendease.dev",
        displayName: "Student One",
        rollNumber: "23CS001",
        status: "ACTIVE",
        attendanceDisabled: false,
      },
      attendanceDeviceState: "PENDING_REPLACEMENT",
      activeBinding: null,
      pendingBinding: null,
      latestSecurityEvent: null,
      activeBindingCount: 0,
      revokedBindingCount: 1,
      recovery: {
        activeBindingCount: 0,
        pendingBindingCount: 1,
        revokedBindingCount: 1,
        blockedBindingCount: 0,
        currentDeviceLabel: null,
        pendingReplacementLabel: "replacement-install-id",
        latestRiskEvent: {
          id: "event_1",
          userId: "student_1",
          actorUserId: null,
          deviceId: "device_2",
          bindingId: "binding_2",
          eventType: "SECOND_DEVICE_FOR_STUDENT_ATTEMPT",
          severity: "HIGH",
          description: "Student tried a second phone.",
          metadata: null,
          createdAt: "2026-03-15T09:10:00.000Z",
        },
        latestRecoveryAction: null,
        recommendedAction: "APPROVE_PENDING_REPLACEMENT",
        recommendedActionLabel: "Approve the pending replacement",
        recommendedActionMessage:
          "The current phone is already cleared, but the pending replacement still cannot mark attendance until support approves it.",
        strictPolicyNote:
          "A pending replacement never becomes trusted automatically. Clearing the current phone does not auto-trust the pending phone.",
        actions: {
          canDeregisterCurrentDevice: false,
          canApproveReplacementDevice: true,
          canRevokeActiveBinding: false,
        },
      },
    })

    expect(summaryCard).toEqual({
      currentDeviceLabel: "No trusted phone",
      pendingReplacementLabel: "replacement-install-id",
      nextStepLabel: "Approve the pending replacement",
      nextStepDescription:
        "The current phone is already cleared, but the pending replacement still cannot mark attendance until support approves it.",
    })

    const detailModel = buildAdminDeviceRecoveryCaseModel({
      student: {
        id: "student_1",
        email: "student.one@attendease.dev",
        displayName: "Student One",
        rollNumber: "23CS001",
        status: "ACTIVE",
        attendanceDisabled: false,
      },
      attendanceDeviceState: "PENDING_REPLACEMENT",
      bindings: [],
      securityEvents: [],
      adminActions: [],
      recovery: {
        activeBindingCount: 0,
        pendingBindingCount: 1,
        revokedBindingCount: 1,
        blockedBindingCount: 0,
        currentDeviceLabel: null,
        pendingReplacementLabel: "replacement-install-id",
        latestRiskEvent: {
          id: "event_1",
          userId: "student_1",
          actorUserId: null,
          deviceId: "device_2",
          bindingId: "binding_2",
          eventType: "SECOND_DEVICE_FOR_STUDENT_ATTEMPT",
          severity: "HIGH",
          description: "Student tried a second phone.",
          metadata: null,
          createdAt: "2026-03-15T09:10:00.000Z",
        },
        latestRecoveryAction: {
          id: "admin_action_1",
          adminUserId: "admin_1",
          targetUserId: "student_1",
          targetDeviceId: "device_1",
          targetBindingId: "binding_1",
          actionType: "DEVICE_REVOKE",
          metadata: {
            reason: "Student reported a lost phone.",
          },
          createdAt: "2026-03-15T09:30:00.000Z",
        },
        recommendedAction: "APPROVE_PENDING_REPLACEMENT",
        recommendedActionLabel: "Approve the pending replacement",
        recommendedActionMessage:
          "The current phone is already cleared, but the pending replacement still cannot mark attendance until support approves it.",
        strictPolicyNote:
          "A pending replacement never becomes trusted automatically. Clearing the current phone does not auto-trust the pending phone.",
        actions: {
          canDeregisterCurrentDevice: false,
          canApproveReplacementDevice: true,
          canRevokeActiveBinding: false,
        },
      },
    })

    expect(detailModel.currentDeviceLabel).toBe("No trusted phone")
    expect(detailModel.pendingReplacementLabel).toBe("replacement-install-id")
    expect(detailModel.latestRiskLabel).toBe("Second phone attempt")
    expect(detailModel.latestRecoveryActionLabel).toBe("Device revoked by admin")
    expect(detailModel.strictPolicyNote).toContain("does not auto-trust")
    expect(detailModel.canApproveReplacementDevice).toBe(true)
  })

  it("labels binding actions clearly for active, pending, and revoked phones", () => {
    expect(
      buildAdminDeviceBindingActionLabel({
        binding: {
          id: "binding_1",
          userId: "student_1",
          deviceId: "device_1",
          bindingType: "STUDENT_ATTENDANCE",
          status: "ACTIVE",
          boundAt: "2026-03-15T09:00:00.000Z",
          activatedAt: "2026-03-15T09:01:00.000Z",
          revokedAt: null,
          revokeReason: null,
        },
        device: {
          id: "device_1",
          installId: "install-1",
          platform: "ANDROID",
          deviceModel: null,
          osVersion: null,
          appVersion: null,
          publicKey: "public-key-active",
          attestationStatus: "UNKNOWN",
          attestationProvider: null,
          attestedAt: null,
          lastSeenAt: "2026-03-15T09:10:00.000Z",
        },
      }),
    ).toBe("Revoke this phone")

    expect(
      buildAdminDeviceBindingActionLabel({
        binding: {
          id: "binding_2",
          userId: "student_1",
          deviceId: "device_2",
          bindingType: "STUDENT_ATTENDANCE",
          status: "PENDING",
          boundAt: "2026-03-15T09:00:00.000Z",
          activatedAt: null,
          revokedAt: null,
          revokeReason: null,
        },
        device: {
          id: "device_2",
          installId: "install-2",
          platform: "ANDROID",
          deviceModel: null,
          osVersion: null,
          appVersion: null,
          publicKey: "public-key-pending",
          attestationStatus: "UNKNOWN",
          attestationProvider: null,
          attestedAt: null,
          lastSeenAt: "2026-03-15T09:10:00.000Z",
        },
      }),
    ).toBe("Reject pending phone")
  })
})
