import type { AdminDeviceSupportDetail } from "@attendease/contracts"

import {
  buildAdminDeviceRecoveryCaseModel,
  type buildAdminDeviceWorkspaceModel,
  formatAdminSupportLabel,
} from "../admin-device-support"
import { formatPortalDateTime } from "../web-workflows"
import { StatusPill, SummaryValueCard, findBindingByStatus } from "./shared"

export function AdminDeviceSupportOverviewSection(props: {
  detail: AdminDeviceSupportDetail
  workspace: ReturnType<typeof buildAdminDeviceWorkspaceModel>
}) {
  const activeBinding = findBindingByStatus(props.detail.bindings, "ACTIVE")
  const pendingBinding = findBindingByStatus(props.detail.bindings, "PENDING")
  const recoveryCase = buildAdminDeviceRecoveryCaseModel(props.detail)

  return (
    <>
      <section
        style={{
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          background: "#f8fafc",
          padding: 16,
          display: "grid",
          gap: 12,
        }}
      >
        <div>
          <h4 style={{ margin: "0 0 6px" }}>{props.workspace.summaryTitle}</h4>
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
            {props.workspace.summaryDescription}
          </p>
        </div>

        <div>
          <strong>{props.detail.student.displayName}</strong>
          <div style={{ color: "#475569" }}>{props.detail.student.email}</div>
          <div style={{ color: "#475569" }}>
            Roll: {props.detail.student.rollNumber ?? "Not set"}
          </div>
          <div style={{ color: "#475569" }}>
            Attendance access: {props.detail.student.attendanceDisabled ? "Blocked" : "Allowed"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatusPill
            label={formatAdminSupportLabel(props.detail.attendanceDeviceState)}
            tone="primary"
          />
          <StatusPill
            label={`Active ${activeBinding ? "1" : "0"}`}
            tone={activeBinding ? "success" : "warning"}
          />
          <StatusPill
            label={`Pending ${pendingBinding ? "1" : "0"}`}
            tone={pendingBinding ? "warning" : "primary"}
          />
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          <SummaryValueCard title="Current trusted phone" value={recoveryCase.currentDeviceLabel} />
          <SummaryValueCard
            title="Pending replacement"
            value={recoveryCase.pendingReplacementLabel}
          />
          <SummaryValueCard
            title="Latest risk"
            value={recoveryCase.latestRiskLabel}
            detail={
              recoveryCase.latestRiskTime
                ? formatPortalDateTime(recoveryCase.latestRiskTime)
                : "No timestamp"
            }
          />
          <SummaryValueCard
            title="Latest recovery action"
            value={recoveryCase.latestRecoveryActionLabel}
            detail={
              recoveryCase.latestRecoveryActionTime
                ? formatPortalDateTime(recoveryCase.latestRecoveryActionTime)
                : "No timestamp"
            }
          />
        </div>
      </section>

      <section
        style={{
          borderRadius: 16,
          border: "1px solid #bfdbfe",
          background: "#eff6ff",
          padding: 16,
          display: "grid",
          gap: 10,
        }}
      >
        <h4 style={{ margin: 0 }}>{recoveryCase.nextStepLabel}</h4>
        <p style={{ margin: 0, color: "#1d4ed8", lineHeight: 1.6 }}>
          {recoveryCase.nextStepDescription}
        </p>
        <div
          style={{
            borderRadius: 12,
            border: "1px solid #bfdbfe",
            background: "#ffffff",
            padding: 12,
            color: "#334155",
            lineHeight: 1.6,
          }}
        >
          {recoveryCase.strictPolicyNote}
        </div>
      </section>
    </>
  )
}
