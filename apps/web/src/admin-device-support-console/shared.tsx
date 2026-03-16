import type { AdminDeviceBindingRecord, AdminDeviceSupportSummary } from "@attendease/contracts"

import { buildAdminDeviceRecoveryListCard, formatAdminSupportLabel } from "../admin-device-support"

export function findBindingByStatus(
  bindings: AdminDeviceBindingRecord[],
  status: "ACTIVE" | "PENDING",
) {
  return bindings.find((entry) => entry.binding.status === status) ?? null
}

export function AdminRecoveryListCard(props: {
  record: AdminDeviceSupportSummary
  onSelect: () => void
}) {
  const summary = buildAdminDeviceRecoveryListCard(props.record)

  return (
    <button
      type="button"
      onClick={props.onSelect}
      style={{
        textAlign: "left",
        border: "1px solid #dbe4f0",
        borderRadius: 16,
        padding: 16,
        background: "#f8fafc",
        cursor: "pointer",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <strong>{props.record.student.displayName}</strong>
        <StatusPill
          label={formatAdminSupportLabel(props.record.attendanceDeviceState)}
          tone="primary"
        />
      </div>
      <div style={{ color: "#475569" }}>{props.record.student.email}</div>
      <div style={{ color: "#475569" }}>Roll: {props.record.student.rollNumber ?? "Not set"}</div>
      <div style={{ color: "#475569" }}>Current phone: {summary.currentDeviceLabel}</div>
      <div style={{ color: "#475569" }}>Pending replacement: {summary.pendingReplacementLabel}</div>
      <div style={{ color: "#1d4ed8", fontWeight: 700 }}>Next step: {summary.nextStepLabel}</div>
      <div style={{ color: "#475569" }}>{summary.nextStepDescription}</div>
    </button>
  )
}

export function SummaryValueCard(props: {
  title: string
  value: string
  detail?: string
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid #dbe4f0",
        background: "#ffffff",
        padding: 12,
        display: "grid",
        gap: 6,
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {props.title}
      </div>
      <strong>{props.value}</strong>
      {props.detail ? <div style={{ color: "#475569" }}>{props.detail}</div> : null}
    </div>
  )
}

export function StatusPill(props: {
  label: string
  tone: "primary" | "success" | "warning"
}) {
  const colors =
    props.tone === "success"
      ? { border: "#bbf7d0", background: "#f0fdf4", text: "#15803d" }
      : props.tone === "warning"
        ? { border: "#fde68a", background: "#fffbeb", text: "#b45309" }
        : { border: "#bfdbfe", background: "#eff6ff", text: "#1d4ed8" }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        border: `1px solid ${colors.border}`,
        background: colors.background,
        color: colors.text,
        padding: "8px 12px",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {props.label}
    </span>
  )
}
