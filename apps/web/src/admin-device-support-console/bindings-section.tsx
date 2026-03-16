import type { AdminDeviceSupportDetail } from "@attendease/contracts"

import {
  type AdminDeviceWorkspaceView,
  buildAdminDeviceActionReadiness,
  buildAdminDeviceBindingActionLabel,
  formatAdminSupportLabel,
} from "../admin-device-support"
import { formatPortalDateTime } from "../web-workflows"
import { StatusPill } from "./shared"
import { dangerButtonStyle } from "./styles"

export function AdminDeviceBindingsSection(props: {
  detail: AdminDeviceSupportDetail
  view: AdminDeviceWorkspaceView
  actionReason: string
  highRiskAcknowledged: boolean
  busy: boolean
  onRevokeBinding: (bindingId: string) => void
}) {
  return (
    <section style={{ display: "grid", gap: 12 }}>
      <h4 style={{ margin: 0 }}>Bindings</h4>
      {props.detail.bindings.length === 0 ? (
        <p style={{ color: "#475569", margin: 0 }}>No device bindings recorded yet.</p>
      ) : (
        props.detail.bindings.map((entry) => {
          const revokeReadiness = buildAdminDeviceActionReadiness({
            action: "revoke",
            reason: props.actionReason,
            acknowledged: props.highRiskAcknowledged,
          })

          return (
            <div
              key={entry.binding.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                padding: 14,
                background: "#ffffff",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong>{entry.device.installId}</strong>
                <StatusPill
                  label={formatAdminSupportLabel(entry.binding.status)}
                  tone={entry.binding.status === "ACTIVE" ? "success" : "warning"}
                />
              </div>
              <div style={{ color: "#475569" }}>{entry.device.platform}</div>
              <div style={{ color: "#475569" }}>
                App version: {entry.device.appVersion ?? "Unknown"}
              </div>
              <div style={{ color: "#475569" }}>
                Attestation: {formatAdminSupportLabel(entry.device.attestationStatus)}
              </div>
              <div style={{ color: "#475569" }}>
                Bound: {formatPortalDateTime(entry.binding.boundAt)}
              </div>
              {entry.binding.revokeReason ? (
                <div style={{ color: "#475569" }}>Revoke reason: {entry.binding.revokeReason}</div>
              ) : null}

              {props.view === "recovery" ? (
                <div
                  style={{
                    marginTop: 6,
                    display: "grid",
                    gap: 8,
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: 10,
                  }}
                >
                  <p style={{ margin: 0, color: "#64748b", lineHeight: 1.5 }}>
                    {revokeReadiness.message}
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => props.onRevokeBinding(entry.binding.id)}
                      disabled={
                        props.busy || entry.binding.status === "REVOKED" || !revokeReadiness.allowed
                      }
                      style={dangerButtonStyle}
                    >
                      {buildAdminDeviceBindingActionLabel(entry)}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )
        })
      )}
    </section>
  )
}
