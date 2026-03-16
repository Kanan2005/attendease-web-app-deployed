"use client"

import Link from "next/link"

import type {
  AdminUpdateStudentStatusRequest,
  StudentSupportCaseDetail,
  StudentSupportCaseSummary,
} from "@attendease/contracts"

import { formatAdminSupportLabel } from "../admin-device-support"
import { WebSectionCard } from "../web-shell"
import { adminWorkflowRoutes } from "../web-workflows"

import {
  buildAdminStudentStatusActionLabel,
  type buildAdminStudentStatusActionReadiness,
} from "../admin-student-management"
import { formatPortalDateTime } from "../web-workflows"
import { Banner, Field, StateCard, styles } from "./shared"

type AdminStudentNextStatus = AdminUpdateStudentStatusRequest["nextStatus"]

type StudentSupportStatusReadiness = ReturnType<typeof buildAdminStudentStatusActionReadiness>

type StudentManagementWorkspaceContentProps = {
  accessToken: string | null
  query: string
  accountStatus: "ALL" | "ACTIVE" | "BLOCKED" | "ARCHIVED" | "PENDING" | "SUSPENDED"
  onQueryChange: (next: string) => void
  onAccountStatusChange: (
    next: "ALL" | "ACTIVE" | "BLOCKED" | "ARCHIVED" | "PENDING" | "SUSPENDED",
  ) => void
  onSearch: () => void
  isSearching: boolean
  studentsLoading: boolean
  studentsData: StudentSupportCaseSummary[] | undefined
  studentsError: unknown
  studentsErrorExists: boolean
  selectedStudentId: string
  onSelectStudent: (studentId: string) => void
  detailLoading: boolean
  detailData: StudentSupportCaseDetail | null
  detailError: unknown
  detailErrorExists: boolean
  actionReason: string
  onReasonChange: (next: string) => void
  highRiskAcknowledged: boolean
  onHighRiskAcknowledgedChange: (next: boolean) => void
  actionOptions: readonly AdminStudentNextStatus[]
  actionReadinessByStatus: Partial<Record<AdminStudentNextStatus, StudentSupportStatusReadiness>>
  onApplyStatus: (next: AdminStudentNextStatus) => void
  isApplyingStatus: boolean
  statusMessage: string | null
}

export function StudentManagementWorkspaceContent(props: StudentManagementWorkspaceContentProps) {
  return (
    <div style={styles.grid}>
      <WebSectionCard
        title="Student Support"
        description="Search students, inspect account and attendance-phone state, and decide whether recovery or governance action is needed."
      >
        {!props.accessToken ? (
          <StateCard message="Sign in as an admin to open student support and account governance." />
        ) : (
          <div style={styles.grid}>
            <div style={styles.formGrid}>
              <Field label="Search students" value={props.query} onChange={props.onQueryChange} />
              <label style={{ display: "grid", gap: 6 }}>
                <span>Account status</span>
                <select
                  value={props.accountStatus}
                  onChange={(event) =>
                    props.onAccountStatusChange(
                      event.target.value as
                        | "ALL"
                        | "ACTIVE"
                        | "BLOCKED"
                        | "ARCHIVED"
                        | "PENDING"
                        | "SUSPENDED",
                    )
                  }
                  style={styles.input}
                >
                  <option value="ALL">All accounts</option>
                  <option value="ACTIVE">Active</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="ARCHIVED">Archived</option>
                  <option value="PENDING">Pending</option>
                  <option value="SUSPENDED">Suspended</option>
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
                {props.isSearching ? "Searching..." : "Search students"}
              </button>
              <Link href={adminWorkflowRoutes.devices} style={styles.secondaryButton}>
                Open device recovery
              </Link>
            </div>

            {props.studentsLoading ? (
              <StateCard message="Loading student support cases..." />
            ) : null}
            {props.studentsErrorExists ? (
              <Banner
                tone="danger"
                message={
                  props.studentsError instanceof Error
                    ? props.studentsError.message
                    : "Failed to load student support cases."
                }
              />
            ) : null}

            {props.studentsData && props.studentsData.length > 0 ? (
              <div style={{ display: "grid", gap: 12 }}>
                {props.studentsData.map((record) => (
                  <button
                    key={record.student.id}
                    type="button"
                    onClick={() => props.onSelectStudent(record.student.id)}
                    style={{
                      ...styles.rowCard,
                      textAlign: "left",
                      cursor: "pointer",
                      background:
                        props.selectedStudentId === record.student.id
                          ? "rgba(37, 99, 235, 0.08)"
                          : "#ffffff",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <strong>{record.student.displayName}</strong>
                        <div style={{ color: "#64748b", marginTop: 4 }}>
                          {record.student.email}
                          {record.student.rollNumber ? ` · ${record.student.rollNumber}` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={styles.pill}>
                          {formatAdminSupportLabel(record.student.status)}
                        </span>
                        <span style={styles.pill}>
                          {formatAdminSupportLabel(record.attendanceDeviceState)}
                        </span>
                      </div>
                    </div>
                    <div style={{ color: "#475569", marginTop: 10, lineHeight: 1.6 }}>
                      {record.enrollmentCounts.activeCount} active classroom
                      {record.enrollmentCounts.activeCount === 1 ? "" : "s"} ·{" "}
                      {record.enrollmentCounts.pendingCount} pending ·{" "}
                      {record.enrollmentCounts.blockedCount} blocked ·{" "}
                      {record.enrollmentCounts.droppedCount} dropped
                    </div>
                    {record.latestAdminAction ? (
                      <div style={{ color: "#475569", marginTop: 8 }}>
                        Latest admin action:{" "}
                        {formatAdminSupportLabel(record.latestAdminAction.actionType)}
                      </div>
                    ) : null}
                    {record.latestSecurityEvent ? (
                      <div style={{ color: "#475569", marginTop: 4 }}>
                        Latest risk event:{" "}
                        {formatAdminSupportLabel(record.latestSecurityEvent.eventType)}
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : !props.studentsLoading ? (
              <StateCard message="No student accounts matched the current search yet." />
            ) : null}
          </div>
        )}
      </WebSectionCard>

      <WebSectionCard
        title="Selected Student"
        description="Keep account state, classroom context, and device context together before you approve recovery or change access."
      >
        {props.detailLoading ? (
          <StateCard message="Loading student account context..." />
        ) : props.detailErrorExists ? (
          <Banner
            tone="danger"
            message={
              props.detailError instanceof Error
                ? props.detailError.message
                : "Failed to load the selected student account."
            }
          />
        ) : props.detailData ? (
          <div style={styles.grid}>
            <div style={styles.rowCard}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>{props.detailData.student.displayName}</strong>
                  <div style={{ color: "#64748b", marginTop: 4 }}>
                    {props.detailData.student.email}
                    {props.detailData.student.rollNumber
                      ? ` · ${props.detailData.student.rollNumber}`
                      : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={styles.pill}>
                    {formatAdminSupportLabel(props.detailData.student.status)}
                  </span>
                  <span style={styles.pill}>
                    {formatAdminSupportLabel(props.detailData.attendanceDeviceState)}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: 12, color: "#475569", lineHeight: 1.7 }}>
                Last login:{" "}
                {props.detailData.student.lastLoginAt
                  ? formatPortalDateTime(props.detailData.student.lastLoginAt)
                  : "No recorded sign-in yet"}
                <br />
                Student record created: {formatPortalDateTime(props.detailData.student.createdAt)}
                <br />
                Program: {props.detailData.student.programName ?? "Not provided"}
                <br />
                Current semester: {props.detailData.student.currentSemester ?? "Not provided"}
                <br />
                Attendance device enforcement:{" "}
                {props.detailData.student.attendanceDisabled
                  ? "Attendance disabled"
                  : "Attendance enabled"}
              </div>
            </div>

            <div style={styles.rowCard}>
              <strong>Attendance phone context</strong>
              <div style={{ color: "#475569", marginTop: 10, lineHeight: 1.7 }}>
                Active phone: {props.detailData.activeBinding?.device.installId ?? "None"}
                <br />
                Pending replacement: {props.detailData.pendingBinding?.device.installId ?? "None"}
                <br />
                Active classrooms: {props.detailData.enrollmentCounts.activeCount}
                <br />
                Pending classrooms: {props.detailData.enrollmentCounts.pendingCount}
              </div>
              <div style={{ marginTop: 12 }}>
                <Link href={adminWorkflowRoutes.devices} style={styles.secondaryButton}>
                  Open device recovery desk
                </Link>
              </div>
            </div>

            <div style={styles.rowCard}>
              <strong>Recent classrooms</strong>
              {props.detailData.recentClassrooms.length > 0 ? (
                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  {props.detailData.recentClassrooms.map((classroom) => (
                    <div
                      key={classroom.enrollmentId}
                      style={{ borderTop: "1px solid #eef2f7", paddingTop: 10 }}
                    >
                      <strong>{classroom.classroomTitle}</strong>
                      <div style={{ color: "#64748b", marginTop: 4 }}>
                        {classroom.courseCode} ·{" "}
                        {formatAdminSupportLabel(classroom.membershipStatus)} ·{" "}
                        {classroom.semesterTitle}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#64748b", marginTop: 10 }}>
                  No classroom memberships recorded yet.
                </div>
              )}
            </div>

            <div style={styles.rowCard}>
              <strong>Recent risk and admin history</strong>
              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Security events</div>
                  {props.detailData.securityEvents.slice(0, 3).length > 0 ? (
                    props.detailData.securityEvents.slice(0, 3).map((event) => (
                      <div key={event.id} style={{ color: "#475569", lineHeight: 1.6 }}>
                        {formatAdminSupportLabel(event.eventType)} ·{" "}
                        {formatPortalDateTime(event.createdAt)}
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#64748b" }}>No recent security events.</div>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Admin actions</div>
                  {props.detailData.adminActions.slice(0, 3).length > 0 ? (
                    props.detailData.adminActions.slice(0, 3).map((action) => (
                      <div key={action.id} style={{ color: "#475569", lineHeight: 1.6 }}>
                        {formatAdminSupportLabel(action.actionType)} ·{" "}
                        {formatPortalDateTime(action.createdAt)}
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#64748b" }}>No recent admin actions.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <StateCard message="Select a student support case to inspect account state and device context." />
        )}
      </WebSectionCard>

      <WebSectionCard
        title="Student Governance Actions"
        description="Use safe reasons and explicit acknowledgement before you deactivate, reactivate, or archive a student account."
      >
        {!props.detailData ? (
          <StateCard message="Select a student before you change account access." />
        ) : (
          <div style={styles.grid}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Admin reason</span>
              <textarea
                value={props.actionReason}
                onChange={(event) => props.onReasonChange(event.target.value)}
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
                I verified the student request and reviewed account, classroom, and device context.
              </span>
            </label>
            <div style={{ display: "grid", gap: 12 }}>
              {props.actionOptions.map((nextStatus) => {
                const readiness = props.actionReadinessByStatus[nextStatus] ?? {
                  allowed: false,
                  message: "Reload the selected student before applying an action.",
                }

                return (
                  <div key={nextStatus} style={styles.rowCard}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong>{buildAdminStudentStatusActionLabel(nextStatus)}</strong>
                        <div style={{ color: "#475569", marginTop: 4 }}>{readiness.message}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => props.onApplyStatus(nextStatus)}
                        disabled={!readiness.allowed || props.isApplyingStatus}
                        style={
                          nextStatus === "ARCHIVED" || nextStatus === "BLOCKED"
                            ? styles.dangerButton
                            : styles.primaryButton
                        }
                      >
                        {props.isApplyingStatus
                          ? "Saving..."
                          : buildAdminStudentStatusActionLabel(nextStatus)}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </WebSectionCard>

      {props.statusMessage ? <Banner tone="info" message={props.statusMessage} /> : null}
    </div>
  )
}
