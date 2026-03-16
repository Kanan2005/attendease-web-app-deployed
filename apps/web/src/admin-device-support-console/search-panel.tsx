import type { Dispatch, SetStateAction } from "react"

import type { buildAdminDeviceWorkspaceModel } from "../admin-device-support"
import { inputStyle, panelStyle, primaryButtonStyle } from "./styles"

export function AdminDeviceSupportSearchPanel(props: {
  workspace: ReturnType<typeof buildAdminDeviceWorkspaceModel>
  sessionToken: string
  manualToken: string
  setManualToken: Dispatch<SetStateAction<string>>
  query: string
  setQuery: Dispatch<SetStateAction<string>>
  loadResults: () => void
  busy: boolean
}) {
  return (
    <div style={panelStyle}>
      <h2 style={{ marginTop: 0 }}>{props.workspace.title}</h2>
      <p style={{ marginTop: 0, color: "#475569", lineHeight: 1.6 }}>
        {props.workspace.description}
      </p>

      <div
        style={{
          borderRadius: 16,
          padding: 16,
          border: "1px solid #dbe4f0",
          background: "#f8fafc",
          color: "#334155",
          marginBottom: 18,
          lineHeight: 1.6,
        }}
      >
        {props.workspace.sessionMessage}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(0, 2fr) auto" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{props.workspace.searchLabel}</span>
            <input
              value={props.query}
              onChange={(event) => props.setQuery(event.target.value)}
              placeholder={props.workspace.searchPlaceholder}
              style={inputStyle}
            />
          </label>
          <div style={{ display: "grid", alignItems: "end" }}>
            <button
              type="button"
              onClick={props.loadResults}
              disabled={props.busy}
              style={primaryButtonStyle}
            >
              {props.busy ? "Loading..." : props.workspace.searchButtonLabel}
            </button>
          </div>
        </div>

        {props.sessionToken ? (
          <details
            style={{
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              padding: 16,
            }}
          >
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              {props.workspace.overrideTitle}
            </summary>
            <p style={{ color: "#475569", lineHeight: 1.6 }}>
              {props.workspace.overrideDescription}
            </p>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Admin token override</span>
              <input
                value={props.manualToken}
                onChange={(event) => props.setManualToken(event.target.value)}
                placeholder="Paste a different admin token only when needed"
                style={inputStyle}
              />
            </label>
          </details>
        ) : (
          <label style={{ display: "grid", gap: 6 }}>
            <span>Admin token</span>
            <input
              value={props.manualToken}
              onChange={(event) => props.setManualToken(event.target.value)}
              placeholder="Paste an admin token to continue"
              style={inputStyle}
            />
          </label>
        )}
      </div>
    </div>
  )
}
