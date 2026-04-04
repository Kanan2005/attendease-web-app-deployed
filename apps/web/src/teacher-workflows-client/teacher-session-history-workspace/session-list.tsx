"use client"

import type { AttendanceSessionHistoryItem } from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"

import { formatTeacherWebAttendanceModeLabel } from "../../teacher-classroom-management"
import { formatPortalDateTime } from "../../web-workflows"
import { WorkflowTonePill, toneForSessionState, workflowStyles } from "../shared"

export function TeacherSessionHistoryList(props: {
  sessions: AttendanceSessionHistoryItem[]
  selectedSessionId: string
  setSelectedSessionId: (sessionId: string) => void
}) {
  return (
    <div style={workflowStyles.grid}>
      {props.sessions.map((session) => {
        const isSelected = props.selectedSessionId === session.id
        return (
          <button
            key={session.id}
            type="button"
            onClick={() => props.setSelectedSessionId(session.id)}
            style={{
              ...workflowStyles.rowCard,
              textAlign: "left",
              cursor: "pointer",
              borderColor: isSelected ? webTheme.colors.accent : "var(--ae-card-border)",
              background: isSelected ? webTheme.colors.accentSoft : "var(--ae-card-surface)",
            }}
          >
            <div style={workflowStyles.buttonRow}>
              <WorkflowTonePill label={session.status} tone={toneForSessionState(session.status)} />
              <WorkflowTonePill
                label={
                  session.editability.isEditable ? "Corrections open" : session.editability.state
                }
                tone={session.editability.isEditable ? "success" : "warning"}
              />
            </div>
            <strong style={{ display: "block", marginTop: 10, color: webTheme.colors.text }}>
              {session.classroomDisplayTitle}
            </strong>
            <div style={{ color: webTheme.colors.textMuted, marginTop: 6 }}>
              {session.lectureTitle ?? "Attendance session"} ·{" "}
              {session.endedAt || session.startedAt || session.lectureDate
                ? formatPortalDateTime(
                    session.endedAt ?? session.startedAt ?? session.lectureDate ?? "",
                  )
                : "Time not recorded"}
            </div>
            <div style={{ color: webTheme.colors.textSubtle, marginTop: 6 }}>
              {session.classCode} · {session.sectionTitle} · {session.subjectTitle}
            </div>
            <div style={{ color: webTheme.colors.textSubtle, marginTop: 6 }}>
              {session.presentCount} present / {session.absentCount} absent ·{" "}
              {formatTeacherWebAttendanceModeLabel(session.mode)}
            </div>
          </button>
        )
      })}
    </div>
  )
}
