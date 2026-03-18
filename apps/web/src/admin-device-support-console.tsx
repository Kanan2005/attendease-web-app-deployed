"use client"

import type {
  AdminApproveReplacementDeviceRequest,
  AdminDeviceSupportDetail,
  AdminDeviceSupportSummary,
} from "@attendease/contracts"
import { startTransition, useState } from "react"

import {
  type AdminDeviceWorkspaceView,
  buildAdminDeviceSupportSummaryMessage,
  buildAdminDeviceWorkspaceModel,
  createWebAdminDeviceSupportBootstrap,
} from "./admin-device-support"
import { AdminDeviceSupportDetailPanel } from "./admin-device-support-console/detail-panel"
import { AdminDeviceSupportResultsList } from "./admin-device-support-console/results-list"
import { AdminDeviceSupportSearchPanel } from "./admin-device-support-console/search-panel"
import { panelStyle } from "./admin-device-support-console/styles"

const bootstrap = createWebAdminDeviceSupportBootstrap()

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
    if (!accessToken) {
      setStatusMessage(workspace.sessionMessage)
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
      <AdminDeviceSupportSearchPanel
        workspace={workspace}
        sessionToken={sessionToken}
        manualToken={manualToken}
        setManualToken={setManualToken}
        query={query}
        setQuery={setQuery}
        loadResults={loadResults}
        busy={busy}
      />

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
        <AdminDeviceSupportResultsList
          workspace={workspace}
          records={records}
          onSelect={loadDetail}
        />
        <AdminDeviceSupportDetailPanel
          detail={detail}
          view={view}
          workspace={workspace}
          busy={busy}
          actionReason={actionReason}
          setActionReason={setActionReason}
          highRiskAcknowledged={highRiskAcknowledged}
          setHighRiskAcknowledged={setHighRiskAcknowledged}
          replacementDevice={replacementDevice}
          setReplacementDevice={setReplacementDevice}
          onRevokeBinding={revokeBinding}
          onDelinkStudent={delinkStudent}
          onApproveReplacementDevice={approveReplacementDevice}
        />
      </div>
    </section>
  )
}
