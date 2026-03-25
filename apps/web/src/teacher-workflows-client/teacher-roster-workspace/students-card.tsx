"use client"

import type { ClassroomRosterMemberSummary } from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"

import { buildTeacherWebRosterMemberIdentityText } from "../../teacher-roster-management"

import { WorkflowBanner, WorkflowStateCard, workflowStyles } from "../shared"

export function TeacherRosterStudentsCard(props: {
  members: ClassroomRosterMemberSummary[] | undefined
  loading: boolean
  error: unknown
  removePending: boolean
  onRemove: (enrollmentId: string) => void
  hasSearchFilter?: boolean
}) {
  if (props.loading) {
    return (
      <div
        style={{
          borderRadius: webTheme.radius.card,
          overflow: "hidden",
          border: `1px solid ${webTheme.colors.border}`,
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="skeleton"
            style={{
              height: 48,
              background: webTheme.colors.surfaceRaised,
              borderBottom: `1px solid ${webTheme.colors.border}`,
            }}
          />
        ))}
      </div>
    )
  }

  if (props.error) {
    return (
      <WorkflowBanner
        tone="danger"
        message={props.error instanceof Error ? props.error.message : "Failed to load students."}
      />
    )
  }

  if (!props.members || props.members.length === 0) {
    const isFiltered = props.hasSearchFilter
    return (
      <div style={{ textAlign: "center", padding: "56px 24px", color: webTheme.colors.textMuted }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: webTheme.colors.accentSoft,
            display: "inline-grid",
            placeItems: "center",
            fontSize: 20,
            marginBottom: 14,
          }}
        >
          {isFiltered ? "🔍" : "👥"}
        </div>
        <p
          style={{ fontSize: 16, fontWeight: 600, color: webTheme.colors.text, margin: "0 0 4px" }}
        >
          {isFiltered ? "No students match your search" : "No students enrolled"}
        </p>
        <p style={{ margin: 0, fontSize: 14 }}>
          {isFiltered
            ? "Try a different search term."
            : "Add students using their email address above."}
        </p>
      </div>
    )
  }

  return (
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
            <th style={{ ...workflowStyles.th, width: 48 }}>#</th>
            <th style={workflowStyles.th}>Name</th>
            <th style={workflowStyles.th}>Email / ID</th>
            <th style={{ ...workflowStyles.th, width: 90, textAlign: "right" as const }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {props.members.map((member, index) => (
            <tr key={member.id}>
              <td style={{ ...workflowStyles.td, color: webTheme.colors.textSubtle, fontSize: 13 }}>
                {index + 1}
              </td>
              <td style={workflowStyles.td}>
                <span style={{ fontWeight: 500 }}>
                  {member.studentName ?? member.studentDisplayName}
                </span>
              </td>
              <td style={{ ...workflowStyles.td, color: webTheme.colors.textMuted, fontSize: 13 }}>
                {buildTeacherWebRosterMemberIdentityText(member)}
              </td>
              <td style={{ ...workflowStyles.td, textAlign: "right" as const }}>
                <button
                  type="button"
                  onClick={() => props.onRemove(member.id)}
                  disabled={props.removePending}
                  aria-label={`Remove ${member.studentName ?? member.studentDisplayName}`}
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
                  {props.removePending ? "..." : "Remove"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
