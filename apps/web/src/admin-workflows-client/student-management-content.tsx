"use client"

import { webTheme } from "@attendease/ui-web"
import Link from "next/link"
import { useState } from "react"

import type {
  AdminStudentClassroomContext,
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
      {/* ── Search & Student List ── */}
      <WebSectionCard
        title="Students"
        description="Search by name, roll number, email, or device ID."
      >
        {!props.accessToken ? (
          <StateCard message="Sign in as an admin to manage students." />
        ) : (
          <div style={styles.grid}>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                props.onSearch()
              }}
              style={styles.formGrid}
            >
              <Field
                label="Search by name or ID"
                value={props.query}
                onChange={props.onQueryChange}
              />
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: webTheme.colors.textMuted, fontSize: 13, fontWeight: 500 }}>
                  Status
                </span>
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
                  <option value="ALL">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="ARCHIVED">Archived</option>
                  <option value="PENDING">Pending</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </label>
            </form>

            <button
              type="button"
              onClick={props.onSearch}
              disabled={props.isSearching}
              style={{ ...styles.primaryButton, width: "100%" }}
            >
              {props.isSearching ? "Searching..." : "Search"}
            </button>

            {props.studentsLoading ? (
              <StateCard message="Loading students..." />
            ) : null}
            {props.studentsErrorExists ? (
              <Banner
                tone="danger"
                message={
                  props.studentsError instanceof Error
                    ? props.studentsError.message
                    : "Failed to load students."
                }
              />
            ) : null}

            {props.studentsData && props.studentsData.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {props.studentsData.map((record) => {
                  const isSelected = props.selectedStudentId === record.student.id
                  return (
                    <button
                      key={record.student.id}
                      type="button"
                      onClick={() => props.onSelectStudent(record.student.id)}
                      style={{
                        ...styles.rowCard,
                        textAlign: "left",
                        cursor: "pointer",
                        borderColor: isSelected
                          ? webTheme.colors.accent
                          : webTheme.colors.border,
                        background: isSelected
                          ? webTheme.colors.accentSoft
                          : webTheme.colors.surfaceRaised,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: webTheme.colors.text,
                              fontSize: 14,
                            }}
                          >
                            {record.student.displayName}
                          </div>
                          <div
                            style={{
                              color: webTheme.colors.textMuted,
                              fontSize: 13,
                              marginTop: 2,
                            }}
                          >
                            {record.student.rollNumber ?? record.student.email}
                          </div>
                        </div>
                        <span
                          style={{
                            ...styles.pill,
                            fontSize: 12,
                            padding: "4px 10px",
                            flexShrink: 0,
                          }}
                        >
                          {formatAdminSupportLabel(record.student.status)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : !props.studentsLoading ? (
              <StateCard message="No students matched the search." />
            ) : null}
          </div>
        )}
      </WebSectionCard>

      {/* ── Student Detail ── */}
      <WebSectionCard title="Student Details" description="">
        {props.detailLoading ? (
          <StateCard message="Loading student details..." />
        ) : props.detailErrorExists ? (
          <Banner
            tone="danger"
            message={
              props.detailError instanceof Error
                ? props.detailError.message
                : "Failed to load student."
            }
          />
        ) : props.detailData ? (
          <StudentDetailView
            detail={props.detailData}
            actionReason={props.actionReason}
            onReasonChange={props.onReasonChange}
            highRiskAcknowledged={props.highRiskAcknowledged}
            onHighRiskAcknowledgedChange={props.onHighRiskAcknowledgedChange}
            actionOptions={props.actionOptions}
            actionReadinessByStatus={props.actionReadinessByStatus}
            onApplyStatus={props.onApplyStatus}
            isApplyingStatus={props.isApplyingStatus}
          />
        ) : (
          <StateCard message="Select a student from the list to view their details." />
        )}
      </WebSectionCard>

      {props.statusMessage ? <Banner tone="info" message={props.statusMessage} /> : null}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────
   Student Detail View
   ──────────────────────────────────────────────────────────────── */

function StudentDetailView(props: {
  detail: StudentSupportCaseDetail
  actionReason: string
  onReasonChange: (v: string) => void
  highRiskAcknowledged: boolean
  onHighRiskAcknowledgedChange: (v: boolean) => void
  actionOptions: readonly AdminStudentNextStatus[]
  actionReadinessByStatus: Partial<Record<AdminStudentNextStatus, StudentSupportStatusReadiness>>
  onApplyStatus: (s: AdminStudentNextStatus) => void
  isApplyingStatus: boolean
}) {
  const [classroomsOpen, setClassroomsOpen] = useState(false)
  const d = props.detail
  const classrooms = d.recentClassrooms

  return (
    <div style={styles.grid}>
      {/* ── Registration Info ── */}
      <div style={styles.rowCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: webTheme.colors.text }}>
              {d.student.displayName}
            </div>
            <div style={{ color: webTheme.colors.textMuted, fontSize: 14, marginTop: 4 }}>
              {d.student.email}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <StatusBadge label={formatAdminSupportLabel(d.student.status)} tone={d.student.status === "ACTIVE" ? "success" : d.student.status === "BLOCKED" ? "danger" : "neutral"} />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginTop: 16,
            padding: 16,
            borderRadius: 16,
            background: webTheme.colors.surfaceMuted,
          }}
        >
          <InfoField label="Roll Number" value={d.student.rollNumber ?? "—"} />
          <InfoField label="Program" value={d.student.programName ?? "—"} />
          <InfoField label="Semester" value={d.student.currentSemester != null ? String(d.student.currentSemester) : "—"} />
          <InfoField label="Registered" value={formatPortalDateTime(d.student.createdAt)} />
          <InfoField
            label="Last Login"
            value={d.student.lastLoginAt ? formatPortalDateTime(d.student.lastLoginAt) : "Never"}
          />
          <InfoField
            label="Last Attendance"
            value={
              d.student.lastActiveSessionAt
                ? formatPortalDateTime(d.student.lastActiveSessionAt)
                : "No attendance yet"
            }
          />
        </div>
      </div>

      {/* ── Classrooms Joined (collapsible) ── */}
      <div style={styles.rowCard}>
        <button
          type="button"
          onClick={() => setClassroomsOpen((v) => !v)}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 15, color: webTheme.colors.text }}>
            Classrooms Joined ({classrooms.length})
          </span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={webTheme.colors.textMuted}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: classroomsOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {classroomsOpen ? (
          classrooms.length > 0 ? (
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              {classrooms.map((c) => (
                <ClassroomCard key={c.enrollmentId} classroom={c} />
              ))}
            </div>
          ) : (
            <div style={{ color: webTheme.colors.textMuted, marginTop: 12, fontSize: 14 }}>
              Not enrolled in any classrooms yet.
            </div>
          )
        ) : null}
      </div>

      {/* ── Pending Device Requests ── */}
      <div style={styles.rowCard}>
        <div style={{ fontWeight: 700, fontSize: 15, color: webTheme.colors.text, marginBottom: 12 }}>
          Pending Device Requests
        </div>
        {d.pendingBinding ? (
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              border: `1px solid ${webTheme.colors.warningBorder}`,
              background: webTheme.colors.warningSoft,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600, color: webTheme.colors.text, fontSize: 14 }}>
                  Device replacement request
                </div>
                <div style={{ color: webTheme.colors.textMuted, fontSize: 13, marginTop: 4 }}>
                  {d.pendingBinding.device.platform} · {d.pendingBinding.device.deviceModel ?? "Unknown model"} · {d.pendingBinding.device.installId}
                </div>
                <div style={{ color: webTheme.colors.textMuted, fontSize: 12, marginTop: 4 }}>
                  Requested {formatPortalDateTime(d.pendingBinding.binding.boundAt)}
                </div>
              </div>
              <Link href={adminWorkflowRoutes.devices} style={{ ...styles.primaryButton, fontSize: 13, padding: "8px 14px" }}>
                Review
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ color: webTheme.colors.textMuted, fontSize: 14 }}>
            No pending device change requests.
          </div>
        )}
        {d.activeBinding ? (
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              border: `1px solid ${webTheme.colors.border}`,
              background: webTheme.colors.surfaceMuted,
              marginTop: 10,
            }}
          >
            <div style={{ fontWeight: 600, color: webTheme.colors.text, fontSize: 13 }}>
              Current device
            </div>
            <div style={{ color: webTheme.colors.textMuted, fontSize: 13, marginTop: 4 }}>
              {d.activeBinding.device.platform} · {d.activeBinding.device.deviceModel ?? "Unknown model"} · {d.activeBinding.device.installId}
            </div>
            <div style={{ color: webTheme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
              Active since {formatPortalDateTime(d.activeBinding.binding.activatedAt ?? d.activeBinding.binding.boundAt)}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Governance Actions ── */}
      <div style={styles.rowCard}>
        <div style={{ fontWeight: 700, fontSize: 15, color: webTheme.colors.text, marginBottom: 12 }}>
          Account Actions
        </div>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: webTheme.colors.textMuted, fontSize: 13, fontWeight: 500 }}>
            Reason
          </span>
          <textarea
            value={props.actionReason}
            onChange={(e) => props.onReasonChange(e.target.value)}
            style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
          />
        </label>
        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginTop: 12,
            fontSize: 13,
            color: webTheme.colors.textMuted,
          }}
        >
          <input
            type="checkbox"
            checked={props.highRiskAcknowledged}
            onChange={(e) => props.onHighRiskAcknowledgedChange(e.target.checked)}
          />
          <span>I have reviewed account, classroom, and device context.</span>
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          {props.actionOptions.map((nextStatus) => {
            const readiness = props.actionReadinessByStatus[nextStatus] ?? {
              allowed: false,
              message: "",
            }
            const isDanger = nextStatus === "ARCHIVED" || nextStatus === "BLOCKED"
            return (
              <button
                key={nextStatus}
                type="button"
                onClick={() => props.onApplyStatus(nextStatus)}
                disabled={!readiness.allowed || props.isApplyingStatus}
                title={readiness.message}
                style={{
                  ...(isDanger ? styles.dangerButton : styles.primaryButton),
                  fontSize: 13,
                  padding: "9px 16px",
                  opacity: readiness.allowed && !props.isApplyingStatus ? 1 : 0.5,
                }}
              >
                {props.isApplyingStatus
                  ? "Saving..."
                  : buildAdminStudentStatusActionLabel(nextStatus)}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────
   Classroom Card — shown inside the collapsible dropdown
   ──────────────────────────────────────────────────────────────── */

function ClassroomCard(props: { classroom: AdminStudentClassroomContext }) {
  const c = props.classroom
  const pct = c.attendancePercentage

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        border: `1px solid ${webTheme.colors.border}`,
        background: webTheme.colors.surfaceMuted,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: webTheme.colors.text, fontSize: 14 }}>
            {c.classroomTitle}
          </div>
          <div style={{ color: webTheme.colors.textMuted, fontSize: 13, marginTop: 2 }}>
            {c.courseCode} · {c.semesterTitle}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
          <StatusBadge
            label={formatAdminSupportLabel(c.membershipStatus)}
            tone={c.membershipStatus === "ACTIVE" ? "success" : c.membershipStatus === "DROPPED" ? "danger" : "neutral"}
          />
        </div>
      </div>

      {/* Attendance bar */}
      <div style={{ marginTop: 10 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 13, color: webTheme.colors.textMuted }}>
            Attendance: {c.attendedSessions}/{c.totalSessions} sessions
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color:
                pct == null
                  ? webTheme.colors.textMuted
                  : pct >= 75
                    ? webTheme.colors.success
                    : pct >= 50
                      ? webTheme.colors.warning
                      : webTheme.colors.danger,
            }}
          >
            {pct != null ? `${pct}%` : "—"}
          </span>
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 3,
            background: webTheme.colors.surfaceHero,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: pct != null ? `${Math.min(pct, 100)}%` : "0%",
              borderRadius: 3,
              background:
                pct == null
                  ? webTheme.colors.textMuted
                  : pct >= 75
                    ? webTheme.colors.success
                    : pct >= 50
                      ? webTheme.colors.warning
                      : webTheme.colors.danger,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────
   Small helpers
   ──────────────────────────────────────────────────────────────── */

function StatusBadge(props: { label: string; tone: "success" | "danger" | "neutral" }) {
  const bg =
    props.tone === "success"
      ? webTheme.colors.successSoft
      : props.tone === "danger"
        ? webTheme.colors.dangerSoft
        : webTheme.colors.surfaceHero
  const fg =
    props.tone === "success"
      ? webTheme.colors.success
      : props.tone === "danger"
        ? webTheme.colors.danger
        : webTheme.colors.textMuted
  const border =
    props.tone === "success"
      ? webTheme.colors.successBorder
      : props.tone === "danger"
        ? webTheme.colors.dangerBorder
        : webTheme.colors.borderStrong

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "4px 10px",
        background: bg,
        color: fg,
        border: `1px solid ${border}`,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {props.label}
    </span>
  )
}

function InfoField(props: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 500, color: webTheme.colors.textMuted, marginBottom: 2 }}>
        {props.label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: webTheme.colors.text }}>
        {props.value}
      </div>
    </div>
  )
}
