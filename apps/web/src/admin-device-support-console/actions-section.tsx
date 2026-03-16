import type {
  AdminApproveReplacementDeviceRequest,
  AdminDeviceSupportDetail,
} from "@attendease/contracts"
import Link from "next/link"
import type { Dispatch, SetStateAction } from "react"

import {
  type AdminDeviceWorkspaceView,
  buildAdminDeviceActionReadiness,
  buildAdminDeviceRecoveryCaseModel,
  type buildAdminDeviceWorkspaceModel,
} from "../admin-device-support"
import { dangerButtonStyle, inputStyle, primaryButtonStyle } from "./styles"

export function AdminDeviceActionsSection(props: {
  detail: AdminDeviceSupportDetail
  view: AdminDeviceWorkspaceView
  workspace: ReturnType<typeof buildAdminDeviceWorkspaceModel>
  busy: boolean
  actionReason: string
  setActionReason: Dispatch<SetStateAction<string>>
  highRiskAcknowledged: boolean
  setHighRiskAcknowledged: Dispatch<SetStateAction<boolean>>
  replacementDevice: AdminApproveReplacementDeviceRequest
  setReplacementDevice: Dispatch<SetStateAction<AdminApproveReplacementDeviceRequest>>
  onDelinkStudent: (studentId: string) => void
  onApproveReplacementDevice: (studentId: string) => void
}) {
  const recoveryCase = buildAdminDeviceRecoveryCaseModel(props.detail)
  const delinkReadiness = buildAdminDeviceActionReadiness({
    action: "delink",
    reason: props.actionReason,
    acknowledged: props.highRiskAcknowledged,
  })
  const replacementReadiness = buildAdminDeviceActionReadiness({
    action: "approve-replacement",
    reason: props.replacementDevice.reason || props.actionReason,
    acknowledged: props.highRiskAcknowledged,
    replacementInstallId: props.replacementDevice.installId,
    replacementPublicKey: props.replacementDevice.publicKey,
  })

  if (props.view === "support") {
    return (
      <section
        style={{
          borderRadius: 16,
          border: "1px solid #cbd5e1",
          background: "#f8fafc",
          padding: 16,
          display: "grid",
          gap: 10,
        }}
      >
        <h4 style={{ margin: 0 }}>{props.workspace.actionsTitle}</h4>
        <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
          {props.workspace.actionsDescription}
        </p>
        <div>
          <Link
            href="/admin/devices"
            style={{
              display: "inline-flex",
              padding: "10px 14px",
              borderRadius: 12,
              background: "#1d4ed8",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Open device recovery
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section
      style={{
        borderRadius: 16,
        border: "1px solid #fecaca",
        background: "#fef2f2",
        padding: 16,
        display: "grid",
        gap: 14,
      }}
    >
      <div>
        <h4 style={{ margin: "0 0 6px" }}>{props.workspace.actionsTitle}</h4>
        <p style={{ margin: 0, color: "#7f1d1d", lineHeight: 1.6 }}>
          {props.workspace.actionsDescription}
        </p>
      </div>

      <div
        style={{
          borderRadius: 14,
          border: "1px solid #fecaca",
          background: "#ffffff",
          padding: 14,
          color: "#7f1d1d",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ display: "block", marginBottom: 6 }}>{recoveryCase.nextStepLabel}</strong>
        <div>{recoveryCase.nextStepDescription}</div>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span>Support reason</span>
        <textarea
          value={props.actionReason}
          onChange={(event) => props.setActionReason(event.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </label>

      <label style={{ display: "flex", gap: 10, alignItems: "start", color: "#7f1d1d" }}>
        <input
          type="checkbox"
          checked={props.highRiskAcknowledged}
          onChange={(event) => props.setHighRiskAcknowledged(event.target.checked)}
        />
        <span>
          I verified the student request and understand these actions affect who can mark attendance
          on this account.
        </span>
      </label>

      <div
        style={{
          borderRadius: 14,
          border: "1px solid #fecaca",
          background: "#ffffff",
          padding: 14,
          color: "#7f1d1d",
          lineHeight: 1.6,
        }}
      >
        {delinkReadiness.message}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => props.onDelinkStudent(props.detail.student.id)}
          disabled={
            props.busy || !delinkReadiness.allowed || !recoveryCase.canDeregisterCurrentDevice
          }
          style={dangerButtonStyle}
        >
          {recoveryCase.canDeregisterCurrentDevice
            ? "Deregister current phone"
            : "No current phone to deregister"}
        </button>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <h5 style={{ margin: 0 }}>Approve replacement phone</h5>
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span>Install ID</span>
            <input
              value={props.replacementDevice.installId}
              onChange={(event) =>
                props.setReplacementDevice((current) => ({
                  ...current,
                  installId: event.target.value,
                }))
              }
              placeholder="replacement-install-id"
              style={inputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Platform</span>
            <select
              value={props.replacementDevice.platform}
              onChange={(event) =>
                props.setReplacementDevice((current) => ({
                  ...current,
                  platform: event.target.value as "ANDROID" | "IOS" | "WEB",
                }))
              }
              style={inputStyle}
            >
              <option value="ANDROID">ANDROID</option>
              <option value="IOS">IOS</option>
              <option value="WEB">WEB</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Public key</span>
            <input
              value={props.replacementDevice.publicKey}
              onChange={(event) =>
                props.setReplacementDevice((current) => ({
                  ...current,
                  publicKey: event.target.value,
                }))
              }
              placeholder="replacement-device-public-key"
              style={inputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>App version</span>
            <input
              value={props.replacementDevice.appVersion ?? ""}
              onChange={(event) =>
                props.setReplacementDevice((current) => ({
                  ...current,
                  appVersion: event.target.value || undefined,
                }))
              }
              placeholder="0.2.0"
              style={inputStyle}
            />
          </label>
        </div>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Replacement approval reason</span>
          <textarea
            value={props.replacementDevice.reason}
            onChange={(event) =>
              props.setReplacementDevice((current) => ({
                ...current,
                reason: event.target.value,
              }))
            }
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </label>

        <div
          style={{
            borderRadius: 14,
            border: "1px solid #fecaca",
            background: "#ffffff",
            padding: 14,
            color: "#7f1d1d",
            lineHeight: 1.6,
          }}
        >
          {replacementReadiness.message}
        </div>

        <div>
          <button
            type="button"
            onClick={() => props.onApproveReplacementDevice(props.detail.student.id)}
            disabled={
              props.busy ||
              !replacementReadiness.allowed ||
              !recoveryCase.canApproveReplacementDevice
            }
            style={primaryButtonStyle}
          >
            Approve replacement phone
          </button>
        </div>
      </div>
    </section>
  )
}
