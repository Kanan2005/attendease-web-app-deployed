"use client"

import type { AdminDeviceSupportSummary } from "@attendease/contracts"
import { startTransition, useState } from "react"

import { createWebAdminDeviceSupportBootstrap } from "./admin-device-support"

const bootstrap = createWebAdminDeviceSupportBootstrap()

const panelStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 20,
}

export function AdminDeviceSupportConsole(props: {
  initialToken?: string | null
  view?: string
}) {
  const accessToken = props.initialToken?.trim() ?? ""
  const [query, setQuery] = useState("")
  const [records, setRecords] = useState<AdminDeviceSupportSummary[]>([])
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [unbindingId, setUnbindingId] = useState<string | null>(null)

  const loadStudents = async () => {
    if (!accessToken) {
      setStatusMessage("No admin session. Please sign in as admin.")
      return
    }

    setBusy(true)
    setStatusMessage("Loading students...")

    try {
      const nextRecords = await bootstrap.authClient.listAdminDeviceSupport(accessToken, {
        query: query || undefined,
        includeHistory: true,
        limit: 50,
      })

      startTransition(() => {
        setRecords(nextRecords)
        setStatusMessage(
          nextRecords.length === 0
            ? `No students found for "${query || "all"}".`
            : `Found ${nextRecords.length} student${nextRecords.length === 1 ? "" : "s"}.`,
        )
      })
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to load students.")
    } finally {
      setBusy(false)
    }
  }

  const unbindDevice = async (studentId: string) => {
    if (!accessToken) return

    setUnbindingId(studentId)

    try {
      const result = await bootstrap.authClient.delinkAdminStudentDevices(accessToken, studentId, {
        reason: "Admin unbind — student requested device change.",
      })

      setStatusMessage(
        result.revokedBindingCount > 0
          ? `Device unbound successfully. The student can now sign in from a new phone.`
          : `No active device binding found for this student.`,
      )

      await loadStudents()
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to unbind device.")
    } finally {
      setUnbindingId(null)
    }
  }

  const currentDeviceLabel = (summary: AdminDeviceSupportSummary): string => {
    return summary.recovery.currentDeviceLabel ?? "No device bound"
  }

  const hasBoundDevice = (summary: AdminDeviceSupportSummary): boolean => {
    return Boolean(summary.recovery.currentDeviceLabel)
  }

  return (
    <section style={{ display: "grid", gap: 20, maxWidth: 900 }}>
      <div style={panelStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>
          Student Device Bindings
        </h2>
        <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 16px" }}>
          Each student&apos;s phone is bound on first registration. To let a student switch to a new
          phone, unbind the current device here.
        </p>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadStudents()}
            placeholder="Search by name, roll number, or email..."
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={loadStudents}
            disabled={busy}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: "#3b82f6",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Loading..." : "Search"}
          </button>
        </div>
      </div>

      {statusMessage ? (
        <div
          style={{
            ...panelStyle,
            borderColor: "#bfdbfe",
            background: "#eff6ff",
            color: "#1d4ed8",
            padding: "12px 16px",
            fontSize: 14,
          }}
        >
          {statusMessage}
        </div>
      ) : null}

      {records.length > 0 ? (
        <div style={panelStyle}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid #e2e8f0",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "8px 12px", fontWeight: 600 }}>Student</th>
                <th style={{ padding: "8px 12px", fontWeight: 600 }}>Roll</th>
                <th style={{ padding: "8px 12px", fontWeight: 600 }}>Device Status</th>
                <th style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right" }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr
                  key={record.student.id}
                  style={{ borderBottom: "1px solid #f1f5f9" }}
                >
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 500 }}>{record.student.displayName}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      {record.student.email}
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#64748b" }}>
                    {record.student.rollNumber ?? "—"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {hasBoundDevice(record) ? (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 600,
                          background: "#dcfce7",
                          color: "#166534",
                        }}
                      >
                        Bound — {currentDeviceLabel(record)}
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 600,
                          background: "#f1f5f9",
                          color: "#64748b",
                        }}
                      >
                        No device
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    {hasBoundDevice(record) ? (
                      <button
                        type="button"
                        onClick={() => unbindDevice(record.student.id)}
                        disabled={unbindingId === record.student.id}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 8,
                          border: "1px solid #fca5a5",
                          background: "#fef2f2",
                          color: "#dc2626",
                          fontWeight: 600,
                          fontSize: 13,
                          cursor:
                            unbindingId === record.student.id ? "not-allowed" : "pointer",
                          opacity: unbindingId === record.student.id ? 0.6 : 1,
                        }}
                      >
                        {unbindingId === record.student.id ? "Unbinding..." : "Unbind"}
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
