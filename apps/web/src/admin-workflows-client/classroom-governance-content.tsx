"use client"

import type {
  AdminClassroomGovernanceDetail,
  AdminClassroomGovernanceSummary,
  SemesterSummary,
} from "@attendease/contracts"

import Link from "next/link"
import { formatAdminSupportLabel } from "../admin-device-support"
import { WebSectionCard } from "../web-shell"
import { adminWorkflowRoutes, formatPortalDateTime } from "../web-workflows"

import { buildAdminClassroomGovernanceListCard } from "../admin-classroom-governance"
import { type AdminClassroomStatusFilter, Banner, Field, StateCard, styles } from "./shared"

type AdminClassroomGovernanceActionReadiness = {
  allowed: boolean
  message: string
}

type ClassroomGovernanceWorkspaceContentProps = {
  accessToken: string | null
  query: string
  statusFilter: AdminClassroomStatusFilter
  semesterId: string
  semesters: SemesterSummary[] | undefined
  onQueryChange: (next: string) => void
  onStatusFilterChange: (next: AdminClassroomStatusFilter) => void
  onSemesterChange: (next: string) => void
  onSearch: () => void
  isSearching: boolean
  classroomsLoading: boolean
  classroomsData: AdminClassroomGovernanceSummary[] | undefined
  classroomsError: unknown
  classroomsErrorExists: boolean
  selectedClassroomId: string
  onSelectClassroom: (classroomId: string) => void
  detailLoading: boolean
  detailData: AdminClassroomGovernanceDetail | null
  detailError: unknown
  detailErrorExists: boolean
  actionReason: string
  onActionReasonChange: (next: string) => void
  highRiskAcknowledged: boolean
  onHighRiskAcknowledgedChange: (next: boolean) => void
  archiveReadiness: AdminClassroomGovernanceActionReadiness | null
  governanceImpact: {
    classroomLabel: string
    courseCodeLabel: string
    archiveEffectLabel: string
    archiveEffectMessage: string
    historyPreservedNote: string
    attendanceTotalsLabel: string
    rosterTotalsLabel: string
  } | null
  onArchive: () => void
  isArchiving: boolean
  statusMessage: string | null
}

function buildFallbackArchiveLabel(detail: AdminClassroomGovernanceDetail | null) {
  if (!detail) {
    return ""
  }

  const label =
    detail.governance.archiveEffectLabel === "Archive classroom" ||
    detail.governance.archiveEffectLabel.length === 0
      ? "Archive impact"
      : detail.governance.archiveEffectLabel

  return label
}

export function ClassroomGovernanceWorkspaceContent(
  props: ClassroomGovernanceWorkspaceContentProps,
) {
  return (
    <div style={styles.grid}>
      <WebSectionCard
        title="Classroom Governance"
        description="Search classrooms, inspect history impact, and archive them safely without deleting attendance truth."
      >
        {!props.accessToken ? (
          <StateCard message="Sign in as an admin to review classroom governance." />
        ) : (
          <div style={styles.grid}>
            <div style={styles.formGrid}>
              <Field label="Search classrooms" value={props.query} onChange={props.onQueryChange} />
              <label style={{ display: "grid", gap: 6 }}>
                <span>Semester</span>
                <select
                  value={props.semesterId}
                  onChange={(event) => props.onSemesterChange(event.target.value)}
                  style={styles.input}
                >
                  <option value="">All semesters</option>
                  {(props.semesters ?? []).map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {semester.title} ({semester.code})
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Classroom status</span>
                <select
                  value={props.statusFilter}
                  onChange={(event) =>
                    props.onStatusFilterChange(event.target.value as AdminClassroomStatusFilter)
                  }
                  style={styles.input}
                >
                  <option value="ALL">All statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </label>
            </div>

            <div style={styles.buttonRow}>
              <button
                type="button"
                onClick={props.onSearch}
                disabled={props.isSearching}
                style={styles.primaryButton}
              >
                {props.isSearching ? "Searching..." : "Review classrooms"}
              </button>
              <Link href={adminWorkflowRoutes.dashboard} style={styles.secondaryButton}>
                Back to dashboard
              </Link>
            </div>

            {props.classroomsLoading ? (
              <StateCard message="Loading classroom governance records..." />
            ) : null}
            {props.classroomsErrorExists ? (
              <Banner
                tone="danger"
                message={
                  props.classroomsError instanceof Error
                    ? props.classroomsError.message
                    : "Failed to load classroom governance records."
                }
              />
            ) : null}

            {props.classroomsData && props.classroomsData.length > 0 ? (
              <div style={{ display: "grid", gap: 12 }}>
                {props.classroomsData.map((classroom) => {
                  const card = buildAdminClassroomGovernanceListCard(classroom)
                  const styleClassroomCard = {
                    ...styles.rowCard,
                    textAlign: "left" as const,
                    cursor: "pointer" as const,
                    background:
                      props.selectedClassroomId === classroom.id
                        ? "rgba(37, 99, 235, 0.08)"
                        : "#ffffff",
                  }

                  return (
                    <button
                      key={classroom.id}
                      type="button"
                      onClick={() => props.onSelectClassroom(classroom.id)}
                      style={styleClassroomCard}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <strong>{card.classroomTitle}</strong>
                          <div style={{ color: "#64748b", marginTop: 4 }}>
                            {card.courseCode} · {card.scopeSummary}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={styles.pill}>{card.statusLabel}</span>
                          <span style={styles.pill}>{card.nextStepLabel}</span>
                        </div>
                      </div>
                      <div style={{ color: "#475569", marginTop: 10, lineHeight: 1.6 }}>
                        {card.historyLabel}
                        <br />
                        Primary teacher: {card.teacherLabel}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : !props.classroomsLoading ? (
              <StateCard message="No classrooms matched the current governance filter." />
            ) : null}
          </div>
        )}
      </WebSectionCard>

      <WebSectionCard
        title="Selected Classroom"
        description="Keep course context, live-session impact, and preserved history visible before you archive anything."
      >
        {props.detailLoading ? (
          <StateCard message="Loading classroom governance detail..." />
        ) : props.detailErrorExists ? (
          <Banner
            tone="danger"
            message={
              props.detailError instanceof Error
                ? props.detailError.message
                : "Failed to load the selected classroom."
            }
          />
        ) : props.detailData ? (
          <div style={styles.grid}>
            <div style={styles.rowCard}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>
                    {props.detailData.classroomTitle ?? props.detailData.displayTitle}
                  </strong>
                  <div style={{ color: "#64748b", marginTop: 4 }}>
                    {props.detailData.courseCode ?? props.detailData.code} ·{" "}
                    {props.detailData.semesterTitle ?? props.detailData.semesterCode ?? "Semester"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={styles.pill}>
                    {formatAdminSupportLabel(props.detailData.status)}
                  </span>
                  <span style={styles.pill}>
                    {formatAdminSupportLabel(props.detailData.defaultAttendanceMode)}
                  </span>
                </div>
              </div>
              <div style={{ color: "#475569", marginTop: 12, lineHeight: 1.7 }}>
                Primary teacher: {props.detailData.primaryTeacherDisplayName ?? "Not assigned"}
                <br />
                Course scope:{" "}
                {[
                  props.detailData.classCode ?? props.detailData.classTitle,
                  props.detailData.sectionCode ?? props.detailData.sectionTitle,
                  props.detailData.subjectCode ?? props.detailData.subjectTitle,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Not available"}
                <br />
                Join code: {props.detailData.activeJoinCode?.code ?? "No active join code"}
                <br />
                Device rule:{" "}
                {props.detailData.requiresTrustedDevice
                  ? "Student device registration required"
                  : "Student device registration not required"}
              </div>
            </div>

            <div style={styles.rowCard}>
              <strong>Attendance and roster impact</strong>
              <div style={{ color: "#475569", marginTop: 10, lineHeight: 1.7 }}>
                Active students: {props.detailData.governance.activeStudentCount}
                <br />
                Pending students: {props.detailData.governance.pendingStudentCount}
                <br />
                Blocked students: {props.detailData.governance.blockedStudentCount}
                <br />
                Dropped students: {props.detailData.governance.droppedStudentCount}
                <br />
                Attendance sessions: {props.detailData.governance.attendanceSessionCount}
                <br />
                Live attendance sessions: {props.detailData.governance.liveAttendanceSessionCount}
                <br />
                Present records: {props.detailData.governance.presentRecordCount}
                <br />
                Absent records: {props.detailData.governance.absentRecordCount}
                <br />
                Latest attendance:{" "}
                {props.detailData.governance.latestAttendanceAt
                  ? formatPortalDateTime(props.detailData.governance.latestAttendanceAt)
                  : "No saved attendance yet"}
              </div>
            </div>

            <div style={styles.rowCard}>
              <strong>{props.governanceImpact?.archiveEffectLabel ?? "Archive impact"} </strong>
              <div style={{ color: "#475569", marginTop: 10, lineHeight: 1.7 }}>
                {props.governanceImpact?.archiveEffectMessage}
                <br />
                {props.governanceImpact?.historyPreservedNote}
              </div>
            </div>
          </div>
        ) : (
          <StateCard message="Select a classroom to review governance impact and archive safety." />
        )}
      </WebSectionCard>

      <WebSectionCard
        title="Archive Classroom Safely"
        description="Delete is not available here. Archive is the audited governance action because it keeps attendance and roster history intact."
      >
        {!props.detailData ? (
          <StateCard message="Select a classroom before you archive it." />
        ) : (
          <div style={styles.grid}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Admin reason</span>
              <textarea
                value={props.actionReason}
                onChange={(event) => props.onActionReasonChange(event.target.value)}
                style={{ ...styles.input, minHeight: 110 }}
              />
            </label>
            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={props.highRiskAcknowledged}
                onChange={(event) => props.onHighRiskAcknowledgedChange(event.target.checked)}
              />
              <span>
                I reviewed the classroom history, live-session state, and archive impact before
                saving this governance action.
              </span>
            </label>
            <div style={styles.rowCard}>
              <strong>
                {props.governanceImpact?.archiveEffectLabel ||
                  buildFallbackArchiveLabel(props.detailData)}
              </strong>
              <div style={{ color: "#475569", marginTop: 6 }}>
                {props.archiveReadiness?.message ?? "Review the classroom before you archive it."}
              </div>
              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  onClick={props.onArchive}
                  disabled={!props.archiveReadiness?.allowed || props.isArchiving}
                  style={styles.dangerButton}
                >
                  {props.isArchiving ? "Archiving..." : "Archive classroom"}
                </button>
              </div>
            </div>
          </div>
        )}
      </WebSectionCard>

      {props.statusMessage ? <Banner tone="info" message={props.statusMessage} /> : null}
    </div>
  )
}
