"use client"

import type {
  AttendanceSessionDetail,
  AttendanceSessionStudentSummary,
} from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import { type CSSProperties, useState } from "react"

import { formatTeacherWebAttendanceModeLabel } from "../../teacher-classroom-management"
import type {
  TeacherWebSessionDetailOverviewModel,
  TeacherWebSessionDetailStatusModel,
  TeacherWebSessionRosterModel,
} from "../../teacher-review-workflows"
import { formatPortalDateTime } from "../../web-workflows"
import { WorkflowBanner, WorkflowStateCard, workflowStyles } from "../shared"

export function TeacherSessionHistoryDetail(props: {
  selectedSessionId: string
  detailLoading: boolean
  studentsLoading: boolean
  detailError: unknown
  studentsError: unknown
  detail: AttendanceSessionDetail | null
  rosterModel: TeacherWebSessionRosterModel
  detailOverview: TeacherWebSessionDetailOverviewModel
  detailStatus: TeacherWebSessionDetailStatusModel
  pendingChangesLength: number
  savePending: boolean
  canSave: boolean
  statusMessage: string | null
  onSave: () => void
  onReset: () => void
  onToggleStatus: (
    attendanceRecordId: string,
    nextStatus: AttendanceSessionStudentSummary["status"],
  ) => void
}) {
  if (!props.selectedSessionId) {
    return <WorkflowStateCard message="Select a session to view details." />
  }
  if (props.detailLoading || props.studentsLoading) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 48, borderRadius: 10 }} />
        ))}
      </div>
    )
  }
  if (props.detailError || props.studentsError) {
    return (
      <WorkflowBanner tone="danger" message={props.statusMessage ?? "Could not load session."} />
    )
  }
  if (!props.detail) return null

  const d = props.detail
  const totalStudents = props.rosterModel.presentRows.length + props.rosterModel.absentRows.length
  const presentPct =
    totalStudents > 0 ? Math.round((props.rosterModel.presentRows.length / totalStudents) * 100) : 0
  const [searchQuery, setSearchQuery] = useState("")
  const lowerSearch = searchQuery.toLowerCase()
  const filteredPresent = lowerSearch
    ? props.rosterModel.presentRows.filter(
        (r) =>
          r.studentDisplayName.toLowerCase().includes(lowerSearch) ||
          r.identityLabel.toLowerCase().includes(lowerSearch),
      )
    : props.rosterModel.presentRows
  const filteredAbsent = lowerSearch
    ? props.rosterModel.absentRows.filter(
        (r) =>
          r.studentDisplayName.toLowerCase().includes(lowerSearch) ||
          r.identityLabel.toLowerCase().includes(lowerSearch),
      )
    : props.rosterModel.absentRows
  const sessionStartMs = d.startedAt ? new Date(d.startedAt).getTime() : null

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Summary row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        <MetricCard
          label="Present"
          value={String(props.rosterModel.presentRows.length)}
          color={webTheme.colors.success}
        />
        <MetricCard
          label="Absent"
          value={String(props.rosterModel.absentRows.length)}
          color={webTheme.colors.danger}
        />
        <MetricCard label="Attendance" value={`${presentPct}%`} color={webTheme.colors.accent} />
        <MetricCard
          label="Duration"
          value={d.durationSeconds ? `${Math.round(d.durationSeconds / 60)} min` : "—"}
          color={webTheme.colors.textMuted}
        />
      </div>

      {/* Session info strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          padding: "12px 16px",
          borderRadius: 10,
          background: webTheme.colors.surfaceMuted,
          border: `1px solid ${webTheme.colors.border}`,
          fontSize: 13,
          color: webTheme.colors.textMuted,
          lineHeight: 1.6,
        }}
      >
        <StatusPill
          label={formatTeacherWebAttendanceModeLabel(d.mode)}
          color={webTheme.colors.accent}
        />
        <StatusPill
          label={d.status}
          color={d.status === "ENDED" ? webTheme.colors.success : webTheme.colors.warning}
        />
        <StatusPill
          label={d.editability.isEditable ? "Editable" : d.editability.state}
          color={d.editability.isEditable ? webTheme.colors.success : webTheme.colors.textSubtle}
        />
        <span style={{ margin: "0 4px", color: webTheme.colors.textSubtle }}>·</span>
        <span>{d.startedAt ? formatPortalDateTime(d.startedAt) : "—"}</span>
        {d.endedAt ? (
          <>
            <span style={{ color: webTheme.colors.textSubtle }}>→</span>
            <span>{formatPortalDateTime(d.endedAt)}</span>
          </>
        ) : null}
      </div>

      {/* Save/Reset bar — only when editable and changes pending */}
      {d.editability.isEditable ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            borderRadius: 10,
            background:
              props.pendingChangesLength > 0
                ? webTheme.colors.accentSoft
                : webTheme.colors.surfaceMuted,
            border: `1px solid ${props.pendingChangesLength > 0 ? webTheme.colors.accentBorder : webTheme.colors.border}`,
            transition: "all 0.2s ease",
          }}
        >
          <span style={{ flex: 1, fontSize: 13, color: webTheme.colors.textMuted }}>
            {props.pendingChangesLength > 0
              ? `${props.pendingChangesLength} unsaved change${props.pendingChangesLength === 1 ? "" : "s"}`
              : "Toggle students between present/absent, then save."}
          </span>
          <button
            type="button"
            className="ui-secondary-btn"
            onClick={props.onReset}
            disabled={props.savePending || props.pendingChangesLength === 0}
            style={{ ...workflowStyles.secondaryButton, padding: "7px 14px", fontSize: 13 }}
          >
            Reset
          </button>
          <button
            type="button"
            className="ui-primary-btn"
            onClick={props.onSave}
            disabled={!props.canSave || props.savePending}
            style={{ ...workflowStyles.primaryButton, padding: "7px 16px", fontSize: 13 }}
          >
            {props.savePending ? "Saving..." : "Save changes"}
          </button>
        </div>
      ) : null}

      {/* Search filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="text"
          placeholder="Search students by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            ...workflowStyles.input,
            maxWidth: 340,
          }}
        />
        {searchQuery ? (
          <span style={{ fontSize: 12, color: webTheme.colors.textMuted }}>
            {filteredPresent.length + filteredAbsent.length} of {totalStudents} students
          </span>
        ) : null}
      </div>

      {/* Combined roster table */}
      <div
        style={{
          borderRadius: webTheme.radius.card,
          border: `1px solid ${webTheme.colors.border}`,
          overflow: "hidden",
        }}
      >
        <table style={workflowStyles.table}>
          <thead>
            <tr>
              <th style={{ ...workflowStyles.th, width: 44 }}>#</th>
              <th style={workflowStyles.th}>Student</th>
              <th style={workflowStyles.th}>ID</th>
              <th style={workflowStyles.th}>Status</th>
              <th style={workflowStyles.th}>Marked at</th>
              {d.editability.isEditable ? (
                <th style={{ ...workflowStyles.th, width: 100, textAlign: "right" as const }}>
                  Action
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {filteredPresent.length > 0 ? (
              <>
                {filteredPresent.map((row, idx) => {
                  const markedAtMs = row.markedAt ? new Date(row.markedAt).getTime() : null
                  const relativeLabel =
                    markedAtMs && sessionStartMs
                      ? `+${Math.max(0, Math.round((markedAtMs - sessionStartMs) / 60_000))} min`
                      : null
                  return (
                    <tr key={row.attendanceRecordId}>
                      <td
                        style={{
                          ...workflowStyles.td,
                          color: webTheme.colors.textSubtle,
                          fontSize: 13,
                        }}
                      >
                        {idx + 1}
                      </td>
                      <td style={workflowStyles.td}>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>
                          {row.studentDisplayName}
                        </span>
                      </td>
                      <td
                        style={{
                          ...workflowStyles.td,
                          color: webTheme.colors.textMuted,
                          fontSize: 13,
                        }}
                      >
                        {row.identityLabel}
                      </td>
                      <td style={workflowStyles.td}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 600,
                            background: webTheme.colors.successSoft,
                            color: webTheme.colors.success,
                            border: `1px solid ${webTheme.colors.successBorder}`,
                          }}
                        >
                          Present
                        </span>
                        {row.pendingChangeLabel ? (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 11,
                              color: webTheme.colors.accent,
                              fontWeight: 600,
                            }}
                          >
                            {row.pendingChangeLabel}
                          </span>
                        ) : null}
                      </td>
                      <td
                        style={{
                          ...workflowStyles.td,
                          color: webTheme.colors.textMuted,
                          fontSize: 13,
                        }}
                      >
                        <div>{row.markedAt ? formatPortalDateTime(row.markedAt) : "—"}</div>
                        {relativeLabel ? (
                          <div
                            style={{
                              fontSize: 11,
                              color: webTheme.colors.textSubtle,
                              marginTop: 1,
                            }}
                          >
                            {relativeLabel} after start
                          </div>
                        ) : null}
                      </td>
                      {d.editability.isEditable && row.actionTargetStatus ? (
                        <td style={{ ...workflowStyles.td, textAlign: "right" as const }}>
                          <button
                            type="button"
                            onClick={() => {
                              const target = row.actionTargetStatus
                              if (target) {
                                props.onToggleStatus(row.attendanceRecordId, target)
                              }
                            }}
                            disabled={!d.editability.isEditable}
                            className="ui-danger-action"
                            style={{
                              border: "none",
                              background: "transparent",
                              color: webTheme.colors.danger,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: "pointer",
                              padding: "4px 10px",
                              borderRadius: 6,
                            }}
                          >
                            {row.actionLabel}
                          </button>
                        </td>
                      ) : d.editability.isEditable ? (
                        <td style={workflowStyles.td} />
                      ) : null}
                    </tr>
                  )
                })}
              </>
            ) : null}

            {/* Visual separator between present and absent */}
            {filteredPresent.length > 0 && filteredAbsent.length > 0 ? (
              <tr>
                <td
                  colSpan={d.editability.isEditable ? 6 : 5}
                  style={{
                    padding: "6px 16px",
                    background: webTheme.colors.surfaceMuted,
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    color: webTheme.colors.textSubtle,
                    borderBottom: `1px solid ${webTheme.colors.border}`,
                  }}
                >
                  Absent ({filteredAbsent.length})
                </td>
              </tr>
            ) : null}

            {filteredAbsent.map((row, idx) => (
              <tr key={row.attendanceRecordId}>
                <td
                  style={{ ...workflowStyles.td, color: webTheme.colors.textSubtle, fontSize: 13 }}
                >
                  {filteredPresent.length + idx + 1}
                </td>
                <td style={workflowStyles.td}>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{row.studentDisplayName}</span>
                </td>
                <td
                  style={{ ...workflowStyles.td, color: webTheme.colors.textMuted, fontSize: 13 }}
                >
                  {row.identityLabel}
                </td>
                <td style={workflowStyles.td}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      background: webTheme.colors.dangerSoft,
                      color: webTheme.colors.danger,
                      border: `1px solid ${webTheme.colors.dangerBorder}`,
                    }}
                  >
                    Absent
                  </span>
                  {row.pendingChangeLabel ? (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        color: webTheme.colors.accent,
                        fontWeight: 600,
                      }}
                    >
                      {row.pendingChangeLabel}
                    </span>
                  ) : null}
                </td>
                <td
                  style={{ ...workflowStyles.td, color: webTheme.colors.textMuted, fontSize: 13 }}
                >
                  —
                </td>
                {d.editability.isEditable && row.actionTargetStatus ? (
                  <td style={{ ...workflowStyles.td, textAlign: "right" as const }}>
                    <button
                      type="button"
                      onClick={() => {
                        const target = row.actionTargetStatus
                        if (target) {
                          props.onToggleStatus(row.attendanceRecordId, target)
                        }
                      }}
                      disabled={!d.editability.isEditable}
                      className="ui-success-action"
                      style={{
                        border: "none",
                        background: "transparent",
                        color: webTheme.colors.success,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: "4px 10px",
                        borderRadius: 6,
                      }}
                    >
                      {row.actionLabel}
                    </button>
                  </td>
                ) : d.editability.isEditable ? (
                  <td style={workflowStyles.td} />
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MetricCard(props: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 12,
        background: webTheme.colors.surfaceRaised,
        border: `1px solid ${webTheme.colors.border}`,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: webTheme.colors.textSubtle,
        }}
      >
        {props.label}
      </p>
      <p
        style={{
          margin: "6px 0 0",
          fontSize: 24,
          fontWeight: 700,
          color: props.color,
          letterSpacing: "-0.02em",
        }}
      >
        {props.value}
      </p>
    </div>
  )
}

function StatusPill(props: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: `${props.color}15`,
        color: props.color,
        border: `1px solid ${props.color}30`,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {props.label}
    </span>
  )
}
