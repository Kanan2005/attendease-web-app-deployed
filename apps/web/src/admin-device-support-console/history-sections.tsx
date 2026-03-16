import type { AdminDeviceSupportDetail } from "@attendease/contracts"

import { formatAdminSupportLabel } from "../admin-device-support"
import { formatPortalDateTime } from "../web-workflows"
import { historyCardStyle } from "./styles"

export function AdminDeviceHistorySections(props: {
  detail: AdminDeviceSupportDetail
}) {
  return (
    <>
      <section style={{ display: "grid", gap: 12 }}>
        <h4 style={{ margin: 0 }}>Recent security events</h4>
        {props.detail.securityEvents.length === 0 ? (
          <p style={{ color: "#475569", margin: 0 }}>No security events recorded yet.</p>
        ) : (
          props.detail.securityEvents.map((event) => (
            <div key={event.id} style={historyCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong>{formatAdminSupportLabel(event.eventType)}</strong>
                <span style={{ color: "#475569" }}>{formatAdminSupportLabel(event.severity)}</span>
              </div>
              <div style={{ color: "#475569" }}>
                {event.description ?? "No description recorded."}
              </div>
              <div style={{ color: "#64748b" }}>{formatPortalDateTime(event.createdAt)}</div>
            </div>
          ))
        )}
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <h4 style={{ margin: 0 }}>Recent admin actions</h4>
        {props.detail.adminActions.length === 0 ? (
          <p style={{ color: "#475569", margin: 0 }}>No admin actions recorded yet.</p>
        ) : (
          props.detail.adminActions.map((action) => (
            <div key={action.id} style={historyCardStyle}>
              <strong>{formatAdminSupportLabel(action.actionType)}</strong>
              <div style={{ color: "#64748b" }}>{formatPortalDateTime(action.createdAt)}</div>
            </div>
          ))
        )}
      </section>
    </>
  )
}
