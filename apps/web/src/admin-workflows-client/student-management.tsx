"use client"

import type { ClassroomStatus, SemesterSummary, UserStatus } from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { startTransition, useEffect, useState } from "react"

import {
  buildAdminClassroomArchiveReadiness,
  buildAdminClassroomGovernanceImpactModel,
  buildAdminClassroomGovernanceListCard,
  buildAdminClassroomGovernanceSummaryMessage,
} from "../admin-classroom-governance"
import { formatAdminSupportLabel } from "../admin-device-support"
import {
  buildAdminStudentManagementSummaryMessage,
  buildAdminStudentStatusActionLabel,
  buildAdminStudentStatusActionReadiness,
} from "../admin-student-management"
import { createWebAuthBootstrap } from "../auth"
import { WebSectionCard } from "../web-shell"
import {
  adminWorkflowRoutes,
  buildImportMonitorRows,
  formatPortalDateTime,
  webWorkflowQueryKeys,
} from "../web-workflows"

import {
  Banner,
  Field,
  SemesterForm,
  StateCard,
  type AdminStudentStatusFilter,
  bootstrap,
  styles,
} from './shared'

export function AdminStudentManagementWorkspace(props: {
  accessToken: string | null
}) {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const [accountStatus, setAccountStatus] = useState<AdminStudentStatusFilter>("ALL")
  const [submittedFilters, setSubmittedFilters] = useState<{
    query: string
    accountStatus: AdminStudentStatusFilter
  }>({
    query: "",
    accountStatus: "ALL",
  })
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [actionReason, setActionReason] = useState(
    "Support verified the request and reviewed the student's classroom and device context.",
  )
  const [highRiskAcknowledged, setHighRiskAcknowledged] = useState(false)

  const studentsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminStudents({
      query: submittedFilters.query || undefined,
      accountStatus:
        submittedFilters.accountStatus === "ALL" ? undefined : submittedFilters.accountStatus,
    }),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listStudentSupportCases(props.accessToken ?? "", {
        query: submittedFilters.query || undefined,
        accountStatus:
          submittedFilters.accountStatus === "ALL" ? undefined : submittedFilters.accountStatus,
        limit: 12,
      }),
  })

  useEffect(() => {
    if (!studentsQuery.data) {
      return
    }

    setStatusMessage(
      buildAdminStudentManagementSummaryMessage(
        studentsQuery.data.length,
        submittedFilters.query || "all students",
      ),
    )
  }, [studentsQuery.data, submittedFilters])

  useEffect(() => {
    if (!studentsQuery.data) {
      return
    }

    if (studentsQuery.data.length === 0) {
      setSelectedStudentId("")
      return
    }

    if (studentsQuery.data.some((record) => record.student.id === selectedStudentId)) {
      return
    }

    startTransition(() => {
      setSelectedStudentId(studentsQuery.data[0]?.student.id ?? "")
    })
  }, [selectedStudentId, studentsQuery.data])

  const detailQuery = useQuery({
    queryKey: selectedStudentId
      ? webWorkflowQueryKeys.adminStudentDetail(selectedStudentId)
      : ["web-workflows", "admin-student-detail", "none"],
    enabled: Boolean(props.accessToken && selectedStudentId),
    queryFn: () =>
      bootstrap.authClient.getStudentSupportCase(props.accessToken ?? "", selectedStudentId),
  })

  const updateStudentStatus = useMutation({
    mutationFn: async (nextStatus: "ACTIVE" | "BLOCKED" | "ARCHIVED") => {
      if (!props.accessToken || !selectedStudentId) {
        throw new Error("Select a student support case before you change account access.")
      }

      return bootstrap.authClient.updateAdminStudentStatus(props.accessToken, selectedStudentId, {
        nextStatus,
        reason: actionReason.trim(),
      })
    },
    onSuccess: async (result, nextStatus) => {
      setHighRiskAcknowledged(false)
      setStatusMessage(
        `${buildAdminStudentStatusActionLabel(nextStatus)} saved for ${
          result.student.student.displayName
        }. Revoked ${result.revokedSessionCount} active session${
          result.revokedSessionCount === 1 ? "" : "s"
        }.`,
      )
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.adminStudents({
            query: submittedFilters.query || undefined,
            accountStatus:
              submittedFilters.accountStatus === "ALL" ? undefined : submittedFilters.accountStatus,
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.adminStudentDetail(result.student.student.id),
        }),
      ])
    },
    onError: (error) => {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to change the student account state.",
      )
    },
  })

  const detail = detailQuery.data
  const actionOptions = detail
    ? [
        detail.actions.canReactivate ? "ACTIVE" : null,
        detail.actions.canDeactivate ? "BLOCKED" : null,
        detail.actions.canArchive ? "ARCHIVED" : null,
      ].filter((value): value is "ACTIVE" | "BLOCKED" | "ARCHIVED" => value !== null)
    : []

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
              <Field label="Search students" value={query} onChange={setQuery} />
              <label style={{ display: "grid", gap: 6 }}>
                <span>Account status</span>
                <select
                  value={accountStatus}
                  onChange={(event) =>
                    setAccountStatus(event.target.value as AdminStudentStatusFilter)
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
                onClick={() =>
                  setSubmittedFilters({
                    query: query.trim(),
                    accountStatus,
                  })
                }
                disabled={studentsQuery.isFetching}
                style={styles.primaryButton}
              >
                {studentsQuery.isFetching ? "Searching..." : "Search students"}
              </button>
              <Link href={adminWorkflowRoutes.devices} style={styles.secondaryButton}>
                Open device recovery
              </Link>
            </div>

            {studentsQuery.isLoading ? (
              <StateCard message="Loading student support cases..." />
            ) : null}
            {studentsQuery.isError ? (
              <Banner
                tone="danger"
                message={
                  studentsQuery.error instanceof Error
                    ? studentsQuery.error.message
                    : "Failed to load student support cases."
                }
              />
            ) : null}

            {studentsQuery.data && studentsQuery.data.length > 0 ? (
              <div style={{ display: "grid", gap: 12 }}>
                {studentsQuery.data.map((record) => (
                  <button
                    key={record.student.id}
                    type="button"
                    onClick={() => setSelectedStudentId(record.student.id)}
                    style={{
                      ...styles.rowCard,
                      textAlign: "left",
                      cursor: "pointer",
                      background:
                        selectedStudentId === record.student.id
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
            ) : !studentsQuery.isLoading ? (
              <StateCard message="No student accounts matched the current search yet." />
            ) : null}
          </div>
        )}
      </WebSectionCard>

      <WebSectionCard
        title="Selected Student"
        description="Keep account state, classroom context, and device context together before you approve recovery or change access."
      >
        {detailQuery.isLoading ? (
          <StateCard message="Loading student account context..." />
        ) : detailQuery.isError ? (
          <Banner
            tone="danger"
            message={
              detailQuery.error instanceof Error
                ? detailQuery.error.message
                : "Failed to load the selected student account."
            }
          />
        ) : detail ? (
          <div style={styles.grid}>
            <div style={styles.rowCard}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>{detail.student.displayName}</strong>
                  <div style={{ color: "#64748b", marginTop: 4 }}>
                    {detail.student.email}
                    {detail.student.rollNumber ? ` · ${detail.student.rollNumber}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={styles.pill}>{formatAdminSupportLabel(detail.student.status)}</span>
                  <span style={styles.pill}>
                    {formatAdminSupportLabel(detail.attendanceDeviceState)}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: 12, color: "#475569", lineHeight: 1.7 }}>
                Last login:{" "}
                {detail.student.lastLoginAt
                  ? formatPortalDateTime(detail.student.lastLoginAt)
                  : "No recorded sign-in yet"}
                <br />
                Student record created: {formatPortalDateTime(detail.student.createdAt)}
                <br />
                Program: {detail.student.programName ?? "Not provided"}
                <br />
                Current semester: {detail.student.currentSemester ?? "Not provided"}
                <br />
                Attendance device enforcement:{" "}
                {detail.student.attendanceDisabled ? "Attendance disabled" : "Attendance enabled"}
              </div>
            </div>

            <div style={styles.rowCard}>
              <strong>Attendance phone context</strong>
              <div style={{ color: "#475569", marginTop: 10, lineHeight: 1.7 }}>
                Active phone: {detail.activeBinding?.device.installId ?? "None"}
                <br />
                Pending replacement: {detail.pendingBinding?.device.installId ?? "None"}
                <br />
                Active classrooms: {detail.enrollmentCounts.activeCount}
                <br />
                Pending classrooms: {detail.enrollmentCounts.pendingCount}
              </div>
              <div style={{ marginTop: 12 }}>
                <Link href={adminWorkflowRoutes.devices} style={styles.secondaryButton}>
                  Open device recovery desk
                </Link>
              </div>
            </div>

            <div style={styles.rowCard}>
              <strong>Recent classrooms</strong>
              {detail.recentClassrooms.length > 0 ? (
                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  {detail.recentClassrooms.map((classroom) => (
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
                  {detail.securityEvents.slice(0, 3).length > 0 ? (
                    detail.securityEvents.slice(0, 3).map((event) => (
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
                  {detail.adminActions.slice(0, 3).length > 0 ? (
                    detail.adminActions.slice(0, 3).map((action) => (
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
        {!detail ? (
          <StateCard message="Select a student before you change account access." />
        ) : (
          <div style={styles.grid}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Admin reason</span>
              <textarea
                value={actionReason}
                onChange={(event) => setActionReason(event.target.value)}
                style={{ ...styles.input, minHeight: 110 }}
              />
            </label>
            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={highRiskAcknowledged}
                onChange={(event) => setHighRiskAcknowledged(event.target.checked)}
              />
              <span>
                I verified the student request and reviewed account, classroom, and device context.
              </span>
            </label>
            <div style={{ display: "grid", gap: 12 }}>
              {actionOptions.map((nextStatus) => {
                const readiness = buildAdminStudentStatusActionReadiness({
                  currentStatus: detail.student.status,
                  nextStatus,
                  reason: actionReason,
                  acknowledged: highRiskAcknowledged,
                })

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
                        onClick={() => updateStudentStatus.mutate(nextStatus)}
                        disabled={!readiness.allowed || updateStudentStatus.isPending}
                        style={
                          nextStatus === "ARCHIVED" || nextStatus === "BLOCKED"
                            ? styles.dangerButton
                            : styles.primaryButton
                        }
                      >
                        {updateStudentStatus.isPending
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

      {statusMessage ? <Banner tone="info" message={statusMessage} /> : null}
    </div>
  )
}
