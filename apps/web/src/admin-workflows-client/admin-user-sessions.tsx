"use client"

import type { AdminUserSession } from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { WebSectionCard } from "../web-shell"
import { webWorkflowQueryKeys } from "../web-workflows"
import { Banner, StateCard, bootstrap, styles } from "./shared"

// ---------------------------------------------------------------------------
// User Sessions Panel — embeddable in any admin user profile page
// ---------------------------------------------------------------------------

export function AdminUserSessionsPanel(props: {
  accessToken: string | null
  userId: string
  userName: string
}) {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)

  const filters: Record<string, string | undefined> = {
    status: statusFilter || undefined,
  }

  const sessionsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminUserSessions(props.userId, filters),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listUserSessions(props.accessToken ?? "", props.userId, {
        status: (statusFilter || undefined) as never,
      }),
    staleTime: 15_000,
  })

  const forceLogoutMutation = useMutation({
    mutationFn: () =>
      bootstrap.authClient.forceLogout(props.accessToken ?? "", props.userId),
    onSuccess: () => {
      setShowConfirm(false)
      queryClient.invalidateQueries({
        queryKey: ["web-workflows", "admin-users", "sessions", props.userId],
      })
    },
  })

  const data = sessionsQuery.data

  return (
    <WebSectionCard
      title="Login Sessions"
      description={`Active and recent auth sessions for ${props.userName}`}
    >
      <div style={{ display: "grid", gap: 16 }}>
        {/* Filter + force-logout toolbar */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "end",
            justifyContent: "space-between",
          }}
        >
          <label
            style={{
              display: "grid",
              gap: 4,
              fontSize: 12,
              color: webTheme.colors.textMuted,
            }}
          >
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ ...styles.input, minWidth: 140, padding: "8px 12px" }}
            >
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="REVOKED">Revoked</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </label>

          <button
            type="button"
            disabled={forceLogoutMutation.isPending}
            onClick={() => setShowConfirm(true)}
            style={{ ...styles.dangerButton, padding: "10px 16px" }}
          >
            Force logout all
          </button>
        </div>

        {/* Confirmation dialog */}
        {showConfirm && (
          <div
            style={{
              padding: 16,
              borderRadius: 10,
              border: `1px solid ${webTheme.colors.danger}`,
              background: "#fff5f5",
              display: "grid",
              gap: 12,
            }}
          >
            <strong style={{ color: webTheme.colors.danger }}>
              Confirm force logout
            </strong>
            <p style={{ fontSize: 13, margin: 0 }}>
              This will revoke all active sessions and refresh tokens for{" "}
              <strong>{props.userName}</strong>. They will be signed out
              everywhere immediately.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => forceLogoutMutation.mutate()}
                disabled={forceLogoutMutation.isPending}
                style={{ ...styles.dangerButton, padding: "8px 16px" }}
              >
                {forceLogoutMutation.isPending ? "Revoking…" : "Yes, force logout"}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                style={{ ...styles.secondaryButton, padding: "8px 16px" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {forceLogoutMutation.isSuccess && (
          <Banner
            tone="info"
            message={`Revoked ${forceLogoutMutation.data.revokedCount} active session(s).`}
          />
        )}
        {forceLogoutMutation.isError && (
          <Banner tone="danger" message="Force logout failed. Please retry." />
        )}

        {/* Sessions table */}
        {sessionsQuery.isLoading ? (
          <StateCard message="Loading sessions…" />
        ) : sessionsQuery.isError ? (
          <StateCard message="Failed to load sessions." />
        ) : !data || data.sessions.length === 0 ? (
          <StateCard message="No sessions found." />
        ) : (
          <>
            <div style={{ fontSize: 13, color: webTheme.colors.textMuted }}>
              Showing {data.sessions.length} of {data.totalCount} sessions
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Platform</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>IP Address</th>
                    <th style={styles.th}>Created</th>
                    <th style={styles.th}>Last active</th>
                    <th style={styles.th}>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.map((session: AdminUserSession) => (
                    <tr key={session.id}>
                      <td style={styles.td}>
                        <SessionStatusBadge status={session.status} />
                      </td>
                      <td style={styles.td}>
                        <PlatformBadge platform={session.platform} />
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>
                          {session.activeRole}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                          {session.ipAddress ?? "—"}
                        </span>
                      </td>
                      <td style={styles.td}>{formatDateTime(session.createdAt)}</td>
                      <td style={styles.td}>
                        {formatDateTime(session.lastActivityAt)}
                      </td>
                      <td style={styles.td}>
                        {session.revokedAt
                          ? `Revoked ${formatDateTime(session.revokedAt)}`
                          : formatDateTime(session.expiresAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </WebSectionCard>
  )
}

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  ACTIVE: { bg: "#e8f5e9", border: "#a5d6a7", text: "#2e7d32" },
  REVOKED: { bg: "#ffebee", border: "#ef9a9a", text: "#c62828" },
  EXPIRED: { bg: "#f5f5f5", border: "#e0e0e0", text: "#757575" },
}

function SessionStatusBadge(props: { status: string }) {
  const colors = STATUS_COLORS[props.status] ?? STATUS_COLORS.EXPIRED!
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 6,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.03em",
      }}
    >
      {props.status}
    </span>
  )
}

function PlatformBadge(props: { platform: string }) {
  const isWeb = props.platform === "WEB"
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 6,
        background: isWeb ? "#e3f2fd" : "#f3e5f5",
        border: `1px solid ${isWeb ? "#90caf9" : "#ce93d8"}`,
        color: isWeb ? "#1565c0" : "#7b1fa2",
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {props.platform}
    </span>
  )
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return iso
  }
}
