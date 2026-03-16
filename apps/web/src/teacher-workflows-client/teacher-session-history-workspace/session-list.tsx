"use client"

import type { AttendanceSessionHistoryItem } from "@attendease/contracts"

import { formatTeacherWebAttendanceModeLabel } from "../../teacher-classroom-management"
import { WebSectionCard } from "../../web-shell"
import { formatPortalDateTime } from "../../web-workflows"
import { WorkflowTonePill, toneForSessionState, workflowStyles } from "../shared"

export function TeacherSessionHistoryList(props: {
  sessions: AttendanceSessionHistoryItem[]
  selectedSessionId: string
  setSelectedSessionId: (sessionId: string) => void
}) {
  return (
    <WebSectionCard
      title="Sessions in view"
      description="Pick the saved session you want to review. Each card keeps the teaching context, final counts, and correction state together."
    >
      <div style={workflowStyles.grid}>
        {props.sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            onClick={() => props.setSelectedSessionId(session.id)}
            style={{
              ...workflowStyles.rowCard,
              textAlign: "left",
              cursor: "pointer",
              borderColor:
                props.selectedSessionId === session.id ? "#2563eb" : workflowStyles.rowCard.border,
              background: props.selectedSessionId === session.id ? "#eff6ff" : "#ffffff",
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
            <strong style={{ display: "block", marginTop: 10 }}>
              {session.classroomDisplayTitle}
            </strong>
            <div style={{ color: "#475569", marginTop: 6 }}>
              {session.lectureTitle ?? "Attendance session"} ·{" "}
              {session.endedAt || session.startedAt || session.lectureDate
                ? formatPortalDateTime(
                    session.endedAt ?? session.startedAt ?? session.lectureDate ?? "",
                  )
                : "Time not recorded"}
            </div>
            <div style={{ color: "#64748b", marginTop: 6 }}>
              {session.classCode} · {session.sectionTitle} · {session.subjectTitle}
            </div>
            <div style={{ color: "#64748b", marginTop: 6 }}>
              {session.presentCount} present / {session.absentCount} absent ·{" "}
              {formatTeacherWebAttendanceModeLabel(session.mode)}
            </div>
            <div style={{ color: "#64748b", marginTop: 6 }}>
              {session.editability.isEditable
                ? `Editable until ${
                    session.editability.editableUntil
                      ? formatPortalDateTime(session.editability.editableUntil)
                      : "the window closes"
                  }`
                : "Read-only result"}
            </div>
          </button>
        ))}
      </div>
    </WebSectionCard>
  )
}
