"use client"

import type {
  AttendanceSessionDetail,
  AttendanceSessionStudentSummary,
} from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import type { CSSProperties } from "react"

import { formatTeacherWebAttendanceModeLabel } from "../../teacher-classroom-management"
import type {
  TeacherWebSessionDetailOverviewModel,
  TeacherWebSessionDetailStatusModel,
  TeacherWebSessionRosterModel,
} from "../../teacher-review-workflows"
import { formatPortalDateTime } from "../../web-workflows"
import {
  WorkflowBanner,
  WorkflowStateCard,
  WorkflowSummaryGrid,
  WorkflowTonePill,
  toneForSessionState,
  workflowStyles,
} from "../shared"

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
    return <WorkflowStateCard message="Loading session detail..." />
  }

  if (props.detailError || props.studentsError) {
    return (
      <WorkflowBanner
        tone="danger"
        message={props.statusMessage ?? "AttendEase couldn't load the selected session."}
      />
    )
  }

  if (!props.detail) return null

  return (
    <div style={workflowStyles.grid}>
      <WorkflowSummaryGrid cards={props.detailOverview.summaryCards} />

      <div style={workflowStyles.rowCard}>
        <div style={workflowStyles.buttonRow}>
          <WorkflowTonePill
            label={formatTeacherWebAttendanceModeLabel(props.detail.mode)}
            tone="primary"
          />
          <WorkflowTonePill
            label={props.detail.status}
            tone={toneForSessionState(props.detail.status)}
          />
          <WorkflowTonePill
            label={
              props.detail.editability.isEditable
                ? "Corrections open"
                : props.detail.editability.state
            }
            tone={props.detail.editability.isEditable ? "success" : "warning"}
          />
        </div>
        <div style={{ color: webTheme.colors.textMuted, marginTop: 12, lineHeight: 1.7 }}>
          {props.detail.classroomCode} · {props.detail.classTitle} · {props.detail.sectionTitle} ·{" "}
          {props.detail.subjectTitle}
          <br />
          {props.detail.lectureTitle ?? "Attendance session"} · {props.detail.teacherDisplayName}
          <br />
          {props.detailOverview.rosterSummary} · {props.detailOverview.timingSummary}
        </div>
      </div>

      <div style={workflowStyles.buttonRow}>
        <button
          type="button"
          onClick={props.onSave}
          disabled={!props.canSave || props.savePending}
          style={workflowStyles.primaryButton}
        >
          {props.savePending ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          onClick={props.onReset}
          disabled={props.savePending || props.pendingChangesLength === 0}
          style={workflowStyles.secondaryButton}
        >
          Reset
        </button>
      </div>

      {props.detail.editability.isEditable && props.pendingChangesLength > 0 ? (
        <WorkflowBanner
          tone="info"
          message={`${props.pendingChangesLength} change${props.pendingChangesLength === 1 ? "" : "s"} ready to save.`}
        />
      ) : null}

      <div style={workflowStyles.twoColumn}>
        <TeacherSessionRosterSection
          title="Present"
          summary={props.rosterModel.presentSummary}
          rows={props.rosterModel.presentRows}
          emptyMessage="No students present."
          buttonStyle={workflowStyles.secondaryButton}
          isEditable={props.detail.editability.isEditable}
          onToggleStatus={props.onToggleStatus}
        />

        <TeacherSessionRosterSection
          title="Absent"
          summary={props.rosterModel.absentSummary}
          rows={props.rosterModel.absentRows}
          emptyMessage="No students absent."
          buttonStyle={workflowStyles.primaryButton}
          isEditable={props.detail.editability.isEditable}
          onToggleStatus={props.onToggleStatus}
        />
      </div>
    </div>
  )
}

function TeacherSessionRosterSection(props: {
  title: string
  summary: string
  rows: TeacherWebSessionRosterModel["presentRows"]
  emptyMessage: string
  buttonStyle: CSSProperties
  isEditable: boolean
  onToggleStatus: (
    attendanceRecordId: string,
    nextStatus: AttendanceSessionStudentSummary["status"],
  ) => void
}) {
  return (
    <div style={workflowStyles.grid}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: webTheme.colors.text, margin: 0 }}>
        {props.title}
      </h3>
      <div style={{ color: webTheme.colors.textSubtle, fontSize: 13 }}>{props.summary}</div>
      {props.rows.length === 0 ? (
        <WorkflowStateCard message={props.emptyMessage} />
      ) : (
        props.rows.map((row) => {
          const actionTargetStatus = row.actionTargetStatus

          return (
            <div key={row.attendanceRecordId} style={workflowStyles.rowCard}>
              <strong style={{ color: webTheme.colors.text }}>{row.studentDisplayName}</strong>
              <div style={{ color: webTheme.colors.textSubtle, marginTop: 6 }}>
                {row.identityLabel}
              </div>
              <div style={{ color: webTheme.colors.textMuted, marginTop: 6 }}>
                {row.markedAt ? formatPortalDateTime(row.markedAt) : "Not marked yet"}
              </div>
              {row.pendingChangeLabel ? (
                <div style={{ color: webTheme.colors.accent, marginTop: 8 }}>
                  {row.pendingChangeLabel}
                </div>
              ) : null}
              {actionTargetStatus ? (
                <button
                  type="button"
                  disabled={!props.isEditable}
                  onClick={() => props.onToggleStatus(row.attendanceRecordId, actionTargetStatus)}
                  style={{
                    ...props.buttonStyle,
                    marginTop: 12,
                    ...(props.isEditable ? {} : { cursor: "not-allowed", opacity: 0.6 }),
                  }}
                >
                  {row.actionLabel}
                </button>
              ) : null}
            </div>
          )
        })
      )}
    </div>
  )
}
