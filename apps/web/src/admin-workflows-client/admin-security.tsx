"use client"

import type {
  AdminActionAuditEvent,
  AdminSecurityAuditEvent,
} from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { WebSectionCard } from "../web-shell"
import { webWorkflowQueryKeys } from "../web-workflows"
import { StateCard, bootstrap, styles } from "./shared"

type Tab = "events" | "actions"

const EVENT_TYPE_OPTIONS = [
  "",
  "DEVICE_BOUND",
  "DEVICE_REVOKED",
  "ATTENDANCE_BLOCKED_UNTRUSTED_DEVICE",
  "ATTENDANCE_LOCATION_VALIDATION_FAILED",
  "ATTENDANCE_BLUETOOTH_VALIDATION_FAILED",
  "MULTI_ACCOUNT_SAME_DEVICE_ATTEMPT",
  "SECOND_DEVICE_FOR_STUDENT_ATTEMPT",
  "REVOKED_DEVICE_USED",
  "LOGIN_RISK_DETECTED",
] as const

const SEVERITY_OPTIONS = ["", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const

const ACTION_TYPE_OPTIONS = [
  "",
  "DEVICE_REVOKE",
  "DEVICE_APPROVE_REPLACEMENT",
  "USER_STATUS_CHANGE",
  "ENROLLMENT_OVERRIDE",
  "JOIN_CODE_RESET",
  "ROSTER_IMPORT_APPLY",
  "SESSION_OVERRIDE",
  "SEMESTER_ARCHIVE",
  "CLASSROOM_ARCHIVE",
  "CLASSROOM_STUDENT_REMOVE",
  "COURSE_OFFERING_ARCHIVE",
  "COURSE_OFFERING_UNARCHIVE",
  "STUDENT_ATTENDANCE_DISABLE",
  "STUDENT_ATTENDANCE_ENABLE",
  "ADMIN_INVITE",
  "ADMIN_ROLE_REVOKE",
  "SYSTEM_SETTING_UPDATE",
] as const

export function AdminSecurityWorkspace(props: { accessToken: string | null }) {
  const [tab, setTab] = useState<Tab>("events")

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div
        role="tablist"
        aria-label="Security audit tabs"
        style={{
          display: "flex",
          gap: 8,
          borderBottom: `1px solid ${webTheme.colors.border}`,
        }}
      >
        <TabButton active={tab === "events"} onClick={() => setTab("events")}>
          Security Events
        </TabButton>
        <TabButton active={tab === "actions"} onClick={() => setTab("actions")}>
          Admin Actions
        </TabButton>
      </div>

      {tab === "events" ? (
        <SecurityEventsPanel accessToken={props.accessToken} />
      ) : (
        <AdminActionsPanel accessToken={props.accessToken} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Security Events Panel
// ---------------------------------------------------------------------------

function SecurityEventsPanel(props: { accessToken: string | null }) {
  const [eventType, setEventType] = useState("")
  const [severity, setSeverity] = useState("")
  const [cursor, setCursor] = useState<string | undefined>(undefined)

  const filters: Record<string, string | undefined> = {
    eventType: eventType || undefined,
    severity: severity || undefined,
    cursor,
  }

  const query = useQuery({
    queryKey: webWorkflowQueryKeys.adminSecurityEvents(filters),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listAdminSecurityEvents(props.accessToken ?? "", {
        eventType: (eventType || undefined) as never,
        severity: (severity || undefined) as never,
        cursor,
        limit: 25,
      }),
    staleTime: 30_000,
  })

  const data = query.data

  return (
    <WebSectionCard title="Security Events" description="System-generated security events">
      <div style={{ display: "grid", gap: 16 }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <FilterSelect
            label="Event Type"
            value={eventType}
            options={EVENT_TYPE_OPTIONS}
            onChange={(v) => { setEventType(v); setCursor(undefined) }}
          />
          <FilterSelect
            label="Severity"
            value={severity}
            options={SEVERITY_OPTIONS}
            onChange={(v) => { setSeverity(v); setCursor(undefined) }}
          />
        </div>

        {query.isLoading ? (
          <StateCard message="Loading security events…" />
        ) : query.isError ? (
          <StateCard message="Failed to load security events." />
        ) : !data || data.events.length === 0 ? (
          <StateCard message="No security events match the current filters." />
        ) : (
          <>
            <div style={{ fontSize: 13, color: webTheme.colors.textMuted }}>
              Showing {data.events.length} of {data.totalCount} events
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Time</th>
                    <th style={styles.th}>Event</th>
                    <th style={styles.th}>Severity</th>
                    <th style={styles.th}>User</th>
                    <th style={styles.th}>Actor</th>
                    <th style={styles.th}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((ev: AdminSecurityAuditEvent) => (
                    <tr key={ev.id}>
                      <td style={styles.td}>{formatDateTime(ev.createdAt)}</td>
                      <td style={styles.td}>
                        <EventBadge label={ev.eventType} />
                      </td>
                      <td style={styles.td}>
                        <SeverityBadge severity={ev.severity} />
                      </td>
                      <td style={styles.td}>
                        {ev.userDisplayName ?? ev.userEmail ?? ev.userId ?? "—"}
                      </td>
                      <td style={styles.td}>
                        {ev.actorDisplayName ?? ev.actorEmail ?? ev.actorUserId ?? "—"}
                      </td>
                      <td style={styles.td}>{ev.description ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", gap: 12 }}>
              {cursor && (
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setCursor(undefined)}
                >
                  ← First page
                </button>
              )}
              {data.nextCursor && (
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() => setCursor(data.nextCursor ?? undefined)}
                >
                  Next page →
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </WebSectionCard>
  )
}

// ---------------------------------------------------------------------------
// Admin Actions Panel
// ---------------------------------------------------------------------------

function AdminActionsPanel(props: { accessToken: string | null }) {
  const [actionType, setActionType] = useState("")
  const [cursor, setCursor] = useState<string | undefined>(undefined)

  const filters: Record<string, string | undefined> = {
    actionType: actionType || undefined,
    cursor,
  }

  const query = useQuery({
    queryKey: webWorkflowQueryKeys.adminSecurityActions(filters),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listAdminActions(props.accessToken ?? "", {
        actionType: (actionType || undefined) as never,
        cursor,
        limit: 25,
      }),
    staleTime: 30_000,
  })

  const data = query.data

  return (
    <WebSectionCard title="Admin Actions" description="Actions performed by admins">
      <div style={{ display: "grid", gap: 16 }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <FilterSelect
            label="Action Type"
            value={actionType}
            options={ACTION_TYPE_OPTIONS}
            onChange={(v) => { setActionType(v); setCursor(undefined) }}
          />
        </div>

        {query.isLoading ? (
          <StateCard message="Loading admin actions…" />
        ) : query.isError ? (
          <StateCard message="Failed to load admin actions." />
        ) : !data || data.actions.length === 0 ? (
          <StateCard message="No admin actions match the current filters." />
        ) : (
          <>
            <div style={{ fontSize: 13, color: webTheme.colors.textMuted }}>
              Showing {data.actions.length} of {data.totalCount} actions
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Time</th>
                    <th style={styles.th}>Action</th>
                    <th style={styles.th}>Admin</th>
                    <th style={styles.th}>Target User</th>
                  </tr>
                </thead>
                <tbody>
                  {data.actions.map((action: AdminActionAuditEvent) => (
                    <tr key={action.id}>
                      <td style={styles.td}>{formatDateTime(action.createdAt)}</td>
                      <td style={styles.td}>
                        <EventBadge label={action.actionType} />
                      </td>
                      <td style={styles.td}>
                        {action.adminDisplayName ?? action.adminEmail}
                      </td>
                      <td style={styles.td}>
                        {action.targetDisplayName ?? action.targetEmail ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", gap: 12 }}>
              {cursor && (
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setCursor(undefined)}
                >
                  ← First page
                </button>
              )}
              {data.nextCursor && (
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() => setCursor(data.nextCursor ?? undefined)}
                >
                  Next page →
                </button>
              )}
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

function TabButton(props: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={props.active}
      onClick={props.onClick}
      style={{
        padding: "10px 18px",
        borderRadius: "10px 10px 0 0",
        border: "none",
        borderBottom: props.active ? `2px solid ${webTheme.colors.accent}` : "2px solid transparent",
        background: props.active ? webTheme.colors.surfaceHero : "transparent",
        color: props.active ? webTheme.colors.accent : webTheme.colors.textMuted,
        fontWeight: props.active ? 700 : 500,
        fontSize: 14,
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {props.children}
    </button>
  )
}

function FilterSelect(props: {
  label: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
}) {
  return (
    <label style={{ display: "grid", gap: 4, fontSize: 12, color: webTheme.colors.textMuted }}>
      {props.label}
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        style={{
          ...styles.input,
          minWidth: 180,
          padding: "8px 12px",
        }}
      >
        {props.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt || "All"}
          </option>
        ))}
      </select>
    </label>
  )
}

function EventBadge(props: { label: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 6,
        background: webTheme.colors.surfaceMuted,
        border: `1px solid ${webTheme.colors.border}`,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "monospace",
        letterSpacing: "0.03em",
      }}
    >
      {props.label.replaceAll("_", " ")}
    </span>
  )
}

const SEVERITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  LOW: { bg: "#e8f5e9", border: "#a5d6a7", text: "#2e7d32" },
  MEDIUM: { bg: "#fff8e1", border: "#ffe082", text: "#f9a825" },
  HIGH: { bg: "#fff3e0", border: "#ffcc80", text: "#e65100" },
  CRITICAL: { bg: "#ffebee", border: "#ef9a9a", text: "#c62828" },
}

function SeverityBadge(props: { severity: string }) {
  const colors = SEVERITY_COLORS[props.severity] ?? SEVERITY_COLORS.MEDIUM!
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 6,
        background: colors?.bg ?? "#fff8e1",
        border: `1px solid ${colors?.border ?? "#ffe082"}`,
        color: colors?.text ?? "#f9a825",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.03em",
      }}
    >
      {props.severity}
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
