"use client"

import type {
  AdminApproveReplacementDeviceRequest,
  AdminDeviceBindingRecord,
  AdminDeviceSupportDetail,
  AdminDeviceSupportSummary,
} from "@attendease/contracts"
import Link from "next/link"
import { startTransition, useState } from "react"

import {
  type AdminDeviceWorkspaceView,
  buildAdminDeviceActionReadiness,
  buildAdminDeviceBindingActionLabel,
  buildAdminDeviceRecoveryCaseModel,
  buildAdminDeviceRecoveryListCard,
  buildAdminDeviceSupportSummaryMessage,
  buildAdminDeviceWorkspaceModel,
  createWebAdminDeviceSupportBootstrap,
  formatAdminSupportLabel,
} from "./admin-device-support"
import { formatPortalDateTime } from "./web-workflows"

const bootstrap = createWebAdminDeviceSupportBootstrap(
  process.env as Record<string, string | undefined>,
)

const panelStyle = {
  border: "1px solid #dbe4f0",
  borderRadius: 20,
  background: "#ffffff",
  padding: 20,
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.07)",
} as const

const inputStyle = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  padding: "12px 14px",
  fontSize: 14,
  background: "#ffffff",
} as const

const primaryButtonStyle = {
  borderRadius: 12,
  border: "none",
  padding: "12px 16px",
  background: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
} as const

const secondaryButtonStyle = {
  borderRadius: 12,
  border: "1px solid #94a3b8",
  padding: "10px 14px",
  background: "#ffffff",
  color: "#0f172a",
  cursor: "pointer",
  fontWeight: 700,
} as const

const dangerButtonStyle = {
  borderRadius: 12,
  border: "none",
  padding: "10px 14px",
  background: "#b91c1c",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
} as const

export function AdminDeviceSupportConsole(props: {
  initialToken?: string | null
  view?: AdminDeviceWorkspaceView
}) {
  const sessionToken = props.initialToken?.trim() ?? ""
  const view = props.view ?? "recovery"
  const workspace = buildAdminDeviceWorkspaceModel({
    view,
    hasSessionToken: Boolean(sessionToken),
  })
  const [manualToken, setManualToken] = useState("")
  const [query, setQuery] = useState("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [records, setRecords] = useState<AdminDeviceSupportSummary[]>([])
  const [detail, setDetail] = useState<AdminDeviceSupportDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionReason, setActionReason] = useState(
    "Support verified a legitimate recovery request.",
  )
  const [highRiskAcknowledged, setHighRiskAcknowledged] = useState(false)
  const [replacementDevice, setReplacementDevice] = useState<AdminApproveReplacementDeviceRequest>({
    installId: "",
    platform: "ANDROID",
    publicKey: "",
    reason: "Support approved a replacement device after student verification.",
  })

  const accessToken = manualToken.trim() || sessionToken
  const activeBinding = detail ? findBindingByStatus(detail.bindings, "ACTIVE") : null
  const pendingBinding = detail ? findBindingByStatus(detail.bindings, "PENDING") : null
  const recoveryCase = detail ? buildAdminDeviceRecoveryCaseModel(detail) : null
  const delinkReadiness = buildAdminDeviceActionReadiness({
    action: "delink",
    reason: actionReason,
    acknowledged: highRiskAcknowledged,
  })
  const replacementReadiness = buildAdminDeviceActionReadiness({
    action: "approve-replacement",
    reason: replacementDevice.reason || actionReason,
    acknowledged: highRiskAcknowledged,
    replacementInstallId: replacementDevice.installId,
    replacementPublicKey: replacementDevice.publicKey,
  })

  const loadResults = async () => {
    if (!accessToken) {
      setStatusMessage(workspace.sessionMessage)
      return
    }

    setBusy(true)
    setStatusMessage(view === "recovery" ? "Loading recovery cases..." : "Loading support cases...")

    try {
      const nextRecords = await bootstrap.authClient.listAdminDeviceSupport(accessToken, {
        query: query || undefined,
        includeHistory: view === "recovery",
        limit: 12,
      })

      startTransition(() => {
        setRecords(nextRecords)
        setDetail(null)
        setHighRiskAcknowledged(false)
        setStatusMessage(
          buildAdminDeviceSupportSummaryMessage(nextRecords.length, query || "all students", view),
        )
      })
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to load support cases.")
    } finally {
      setBusy(false)
    }
  }

  const loadDetail = async (studentId: string) => {
    if (!accessToken) {
      setStatusMessage(workspace.sessionMessage)
      return
    }

    setBusy(true)
    setStatusMessage(
      view === "recovery" ? "Loading the recovery case..." : "Loading the support case...",
    )

    try {
      const nextDetail = await bootstrap.authClient.getAdminDeviceSupport(accessToken, studentId)

      startTransition(() => {
        setDetail(nextDetail)
        setHighRiskAcknowledged(false)
        setStatusMessage(`Loaded ${nextDetail.student.displayName}.`)
      })
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to load support detail.")
    } finally {
      setBusy(false)
    }
  }

  const revokeBinding = async (bindingId: string) => {
    const readiness = buildAdminDeviceActionReadiness({
      action: "revoke",
      reason: actionReason,
      acknowledged: highRiskAcknowledged,
    })

    if (!accessToken) {
      setStatusMessage(workspace.sessionMessage)
      return
    }

    if (!readiness.allowed) {
      setStatusMessage(readiness.message)
      return
    }

    setBusy(true)
    setStatusMessage("Revoking the selected device binding...")

    try {
      await bootstrap.authClient.revokeAdminDeviceBinding(accessToken, bindingId, {
        reason: actionReason.trim(),
      })

      setStatusMessage("The binding was revoked. Reloaded case details show the latest state.")
      if (detail) {
        await loadDetail(detail.student.id)
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to revoke the binding.")
    } finally {
      setBusy(false)
    }
  }

  const delinkStudent = async (studentId: string) => {
    if (!accessToken) {
      setStatusMessage(workspace.sessionMessage)
      return
    }

    if (!delinkReadiness.allowed) {
      setStatusMessage(delinkReadiness.message)
      return
    }

    setBusy(true)
    setStatusMessage("Clearing active attendance phones...")

    try {
      const result = await bootstrap.authClient.delinkAdminStudentDevices(accessToken, studentId, {
        reason: actionReason.trim(),
      })

      setStatusMessage(
        `Cleared ${result.revokedBindingCount} active attendance phone${result.revokedBindingCount === 1 ? "" : "s"}.`,
      )
      if (detail) {
        await loadDetail(detail.student.id)
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to clear active phones.")
    } finally {
      setBusy(false)
    }
  }

  const approveReplacementDevice = async (studentId: string) => {
    if (!accessToken) {
      setStatusMessage(workspace.sessionMessage)
      return
    }

    if (!replacementReadiness.allowed) {
      setStatusMessage(replacementReadiness.message)
      return
    }

    setBusy(true)
    setStatusMessage("Approving the replacement phone...")

    try {
      const result = await bootstrap.authClient.approveAdminReplacementDevice(
        accessToken,
        studentId,
        {
          ...replacementDevice,
          reason: (replacementDevice.reason || actionReason).trim(),
        },
      )

      setStatusMessage(
        `Approved ${result.binding.device.installId} and revoked ${result.revokedBindingCount} older binding${result.revokedBindingCount === 1 ? "" : "s"}.`,
      )
      if (detail) {
        await loadDetail(detail.student.id)
      }
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to approve the replacement phone.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>{workspace.title}</h2>
        <p style={{ marginTop: 0, color: "#475569", lineHeight: 1.6 }}>{workspace.description}</p>

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
          {workspace.sessionMessage}
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(0, 2fr) auto" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>{workspace.searchLabel}</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={workspace.searchPlaceholder}
                style={inputStyle}
              />
            </label>
            <div style={{ display: "grid", alignItems: "end" }}>
              <button
                type="button"
                onClick={loadResults}
                disabled={busy}
                style={primaryButtonStyle}
              >
                {busy ? "Loading..." : workspace.searchButtonLabel}
              </button>
            </div>
          </div>

          {sessionToken ? (
            <details
              style={{
                borderRadius: 16,
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                padding: 16,
              }}
            >
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                {workspace.overrideTitle}
              </summary>
              <p style={{ color: "#475569", lineHeight: 1.6 }}>{workspace.overrideDescription}</p>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Admin token override</span>
                <input
                  value={manualToken}
                  onChange={(event) => setManualToken(event.target.value)}
                  placeholder="Paste a different admin token only when needed"
                  style={inputStyle}
                />
              </label>
            </details>
          ) : (
            <label style={{ display: "grid", gap: 6 }}>
              <span>Admin token</span>
              <input
                value={manualToken}
                onChange={(event) => setManualToken(event.target.value)}
                placeholder="Paste an admin token to continue"
                style={inputStyle}
              />
            </label>
          )}
        </div>
      </div>

      {statusMessage ? (
        <div
          style={{
            ...panelStyle,
            borderColor: "#bfdbfe",
            background: "#eff6ff",
            color: "#1d4ed8",
          }}
        >
          {statusMessage}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns: "minmax(0, 0.95fr) minmax(0, 1.25fr)",
        }}
      >
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Matching students</h3>
          {records.length === 0 ? (
            <p style={{ color: "#475569", marginBottom: 0 }}>{workspace.emptyResultsMessage}</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {records.map((record) => (
                <AdminRecoveryListCard
                  key={record.student.id}
                  record={record}
                  onSelect={() => loadDetail(record.student.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>{workspace.selectedRecordTitle}</h3>
          {!detail ? (
            <p style={{ color: "#475569", marginBottom: 0 }}>{workspace.emptyDetailMessage}</p>
          ) : (
            <div style={{ display: "grid", gap: 18 }}>
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
                  <h4 style={{ margin: "0 0 6px" }}>{workspace.summaryTitle}</h4>
                  <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
                    {workspace.summaryDescription}
                  </p>
                </div>

                <div>
                  <strong>{detail.student.displayName}</strong>
                  <div style={{ color: "#475569" }}>{detail.student.email}</div>
                  <div style={{ color: "#475569" }}>
                    Roll: {detail.student.rollNumber ?? "Not set"}
                  </div>
                  <div style={{ color: "#475569" }}>
                    Attendance access: {detail.student.attendanceDisabled ? "Blocked" : "Allowed"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <StatusPill
                    label={formatAdminSupportLabel(detail.attendanceDeviceState)}
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

                {recoveryCase ? (
                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    }}
                  >
                    <SummaryValueCard
                      title="Current trusted phone"
                      value={recoveryCase.currentDeviceLabel}
                    />
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
                ) : null}
              </section>

              {recoveryCase ? (
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
              ) : null}

              <section style={{ display: "grid", gap: 12 }}>
                <h4 style={{ margin: 0 }}>Bindings</h4>
                {detail.bindings.length === 0 ? (
                  <p style={{ color: "#475569", margin: 0 }}>No device bindings recorded yet.</p>
                ) : (
                  detail.bindings.map((entry) => {
                    const revokeReadiness = buildAdminDeviceActionReadiness({
                      action: "revoke",
                      reason: actionReason,
                      acknowledged: highRiskAcknowledged,
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
                          <div style={{ color: "#475569" }}>
                            Revoke reason: {entry.binding.revokeReason}
                          </div>
                        ) : null}

                        {view === "recovery" ? (
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
                                onClick={() => revokeBinding(entry.binding.id)}
                                disabled={
                                  busy ||
                                  entry.binding.status === "REVOKED" ||
                                  !revokeReadiness.allowed
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

              <section style={{ display: "grid", gap: 12 }}>
                <h4 style={{ margin: 0 }}>Recent security events</h4>
                {detail.securityEvents.length === 0 ? (
                  <p style={{ color: "#475569", margin: 0 }}>No security events recorded yet.</p>
                ) : (
                  detail.securityEvents.map((event) => (
                    <div key={event.id} style={historyCardStyle}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <strong>{formatAdminSupportLabel(event.eventType)}</strong>
                        <span style={{ color: "#475569" }}>
                          {formatAdminSupportLabel(event.severity)}
                        </span>
                      </div>
                      <div style={{ color: "#475569" }}>
                        {event.description ?? "No description recorded."}
                      </div>
                      <div style={{ color: "#64748b" }}>
                        {formatPortalDateTime(event.createdAt)}
                      </div>
                    </div>
                  ))
                )}
              </section>

              <section style={{ display: "grid", gap: 12 }}>
                <h4 style={{ margin: 0 }}>Recent admin actions</h4>
                {detail.adminActions.length === 0 ? (
                  <p style={{ color: "#475569", margin: 0 }}>No admin actions recorded yet.</p>
                ) : (
                  detail.adminActions.map((action) => (
                    <div key={action.id} style={historyCardStyle}>
                      <strong>{formatAdminSupportLabel(action.actionType)}</strong>
                      <div style={{ color: "#64748b" }}>
                        {formatPortalDateTime(action.createdAt)}
                      </div>
                    </div>
                  ))
                )}
              </section>

              {view === "support" ? (
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
                  <h4 style={{ margin: 0 }}>{workspace.actionsTitle}</h4>
                  <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
                    {workspace.actionsDescription}
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
              ) : (
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
                    <h4 style={{ margin: "0 0 6px" }}>{workspace.actionsTitle}</h4>
                    <p style={{ margin: 0, color: "#7f1d1d", lineHeight: 1.6 }}>
                      {workspace.actionsDescription}
                    </p>
                  </div>

                  {recoveryCase ? (
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
                      <strong style={{ display: "block", marginBottom: 6 }}>
                        {recoveryCase.nextStepLabel}
                      </strong>
                      <div>{recoveryCase.nextStepDescription}</div>
                    </div>
                  ) : null}

                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Support reason</span>
                    <textarea
                      value={actionReason}
                      onChange={(event) => setActionReason(event.target.value)}
                      rows={3}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  </label>

                  <label
                    style={{ display: "flex", gap: 10, alignItems: "start", color: "#7f1d1d" }}
                  >
                    <input
                      type="checkbox"
                      checked={highRiskAcknowledged}
                      onChange={(event) => setHighRiskAcknowledged(event.target.checked)}
                    />
                    <span>
                      I verified the student request and understand these actions affect who can
                      mark attendance on this account.
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
                      onClick={() => delinkStudent(detail.student.id)}
                      disabled={
                        busy ||
                        !delinkReadiness.allowed ||
                        !(recoveryCase?.canDeregisterCurrentDevice ?? false)
                      }
                      style={dangerButtonStyle}
                    >
                      {(recoveryCase?.canDeregisterCurrentDevice ?? false)
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
                          value={replacementDevice.installId}
                          onChange={(event) =>
                            setReplacementDevice((current) => ({
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
                          value={replacementDevice.platform}
                          onChange={(event) =>
                            setReplacementDevice((current) => ({
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
                          value={replacementDevice.publicKey}
                          onChange={(event) =>
                            setReplacementDevice((current) => ({
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
                          value={replacementDevice.appVersion ?? ""}
                          onChange={(event) =>
                            setReplacementDevice((current) => ({
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
                        value={replacementDevice.reason}
                        onChange={(event) =>
                          setReplacementDevice((current) => ({
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
                        onClick={() => approveReplacementDevice(detail.student.id)}
                        disabled={
                          busy ||
                          !replacementReadiness.allowed ||
                          !(recoveryCase?.canApproveReplacementDevice ?? false)
                        }
                        style={primaryButtonStyle}
                      >
                        Approve replacement phone
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function findBindingByStatus(bindings: AdminDeviceBindingRecord[], status: "ACTIVE" | "PENDING") {
  return bindings.find((entry) => entry.binding.status === status) ?? null
}

function AdminRecoveryListCard(props: {
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

function SummaryValueCard(props: {
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

function StatusPill(props: {
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

const historyCardStyle = {
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  padding: 12,
  display: "grid",
  gap: 6,
} as const
