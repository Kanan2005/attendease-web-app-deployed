"use client"

import type {
  AttendanceSessionDetail,
  AttendanceSessionStudentSummary,
} from "@attendease/contracts"
import type { CSSProperties } from "react"

import { formatTeacherWebAttendanceModeLabel } from "../../teacher-classroom-management"
import type {
  TeacherWebSessionDetailOverviewModel,
  TeacherWebSessionDetailStatusModel,
  TeacherWebSessionRosterModel,
} from "../../teacher-review-workflows"
import { WebSectionCard } from "../../web-shell"
import { formatPortalDateTime } from "../../web-workflows"
import {
  WorkflowBanner,
  WorkflowStateCard,
  WorkflowStatusCard,
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
  return (
    <WebSectionCard
      title={
        props.detail ? `${props.detail.classroomDisplayTitle} session detail` : "Session detail"
      }
      description="Present and absent lists stay visible together so teachers can correct the saved attendance truth quickly."
    >
      {!props.selectedSessionId ? (
        <WorkflowStateCard message="Select a session to load detail and student rows." />
      ) : props.detailLoading || props.studentsLoading ? (
        <WorkflowStateCard message="Loading session detail..." />
      ) : props.detailError || props.studentsError ? (
        <WorkflowBanner
          tone="danger"
          message={props.statusMessage ?? "AttendEase couldn't load the selected session."}
        />
      ) : props.detail ? (
        <div style={workflowStyles.grid}>
          <WorkflowStatusCard
            tone={props.detailStatus.tone}
            title={props.detailStatus.title}
            message={props.detailStatus.message}
          />

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
            <div style={{ color: "#475569", marginTop: 12, lineHeight: 1.7 }}>
              {props.detail.classroomCode} · {props.detail.classTitle} · {props.detail.sectionTitle}{" "}
              · {props.detail.subjectTitle}
              <br />
              {props.detail.lectureTitle ?? "Attendance session"} · Teacher:{" "}
              {props.detail.teacherDisplayName}
              <br />
              {props.detailOverview.rosterSummary}
              <br />
              {props.detailOverview.timingSummary}
            </div>
            <div style={{ color: "#64748b", marginTop: 10, lineHeight: 1.7 }}>
              {props.detailOverview.correctionSummary}
              {props.detailOverview.securitySummary ? (
                <>
                  <br />
                  {props.detailOverview.securitySummary}
                </>
              ) : null}
            </div>
          </div>

          <div style={workflowStyles.buttonRow}>
            <button
              type="button"
              onClick={props.onSave}
              disabled={!props.canSave || props.savePending}
              style={workflowStyles.primaryButton}
            >
              {props.savePending ? "Saving..." : "Save Attendance Changes"}
            </button>
            <button
              type="button"
              onClick={props.onReset}
              disabled={props.savePending || props.pendingChangesLength === 0}
              style={workflowStyles.secondaryButton}
            >
              Reset corrections
            </button>
          </div>

          {props.detail.editability.isEditable && props.pendingChangesLength > 0 ? (
            <WorkflowBanner
              tone="info"
              message={`${props.pendingChangesLength} attendance change${props.pendingChangesLength === 1 ? "" : "s"} are ready to save.`}
            />
          ) : null}

          <div style={workflowStyles.twoColumn}>
            <TeacherSessionRosterSection
              title="Present students"
              description={props.detailOverview.presentSectionSubtitle}
              summary={props.rosterModel.presentSummary}
              rows={props.rosterModel.presentRows}
              emptyMessage="No students are currently in the present list."
              buttonStyle={workflowStyles.secondaryButton}
              isEditable={props.detail.editability.isEditable}
              onToggleStatus={props.onToggleStatus}
            />

            <TeacherSessionRosterSection
              title="Absent students"
              description={props.detailOverview.absentSectionSubtitle}
              summary={props.rosterModel.absentSummary}
              rows={props.rosterModel.absentRows}
              emptyMessage="No students are currently in the absent list."
              buttonStyle={workflowStyles.primaryButton}
              isEditable={props.detail.editability.isEditable}
              onToggleStatus={props.onToggleStatus}
            />
          </div>
        </div>
      ) : null}
    </WebSectionCard>
  )
}

function TeacherSessionRosterSection(props: {
  title: string
  description: string
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
    <WebSectionCard title={props.title} description={props.description}>
      <div style={workflowStyles.grid}>
        <div style={{ color: "#64748b" }}>{props.summary}</div>
        {props.rows.length === 0 ? (
          <WorkflowStateCard message={props.emptyMessage} />
        ) : (
          props.rows.map((row) => {
            const actionTargetStatus = row.actionTargetStatus

            return (
              <div key={row.attendanceRecordId} style={workflowStyles.rowCard}>
                <strong>{row.studentDisplayName}</strong>
                <div style={{ color: "#64748b", marginTop: 6 }}>{row.identityLabel}</div>
                <div style={{ color: "#475569", marginTop: 6 }}>
                  Last marked:{" "}
                  {row.markedAt ? formatPortalDateTime(row.markedAt) : "Not marked yet"}
                </div>
                {row.pendingChangeLabel ? (
                  <div style={{ color: "#1d4ed8", marginTop: 8 }}>{row.pendingChangeLabel}</div>
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
    </WebSectionCard>
  )
}
