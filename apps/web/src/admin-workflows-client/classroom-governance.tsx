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
  type AdminClassroomStatusFilter,
  bootstrap,
  styles,
} from './shared'

export function AdminClassroomGovernanceWorkspace(props: {
  accessToken: string | null
}) {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminClassroomStatusFilter>("ALL")
  const [semesterId, setSemesterId] = useState("")
  const [submittedFilters, setSubmittedFilters] = useState<{
    query: string
    status: AdminClassroomStatusFilter
    semesterId: string
  }>({
    query: "",
    status: "ALL",
    semesterId: "",
  })
  const [selectedClassroomId, setSelectedClassroomId] = useState("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [actionReason, setActionReason] = useState(
    "Registrar reviewed classroom history, teacher ownership, and attendance impact before archiving.",
  )
  const [highRiskAcknowledged, setHighRiskAcknowledged] = useState(false)

  const semestersQuery = useQuery({
    queryKey: webWorkflowQueryKeys.semesters(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listSemesters(props.accessToken ?? ""),
  })

  const classroomsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminClassrooms({
      query: submittedFilters.query || undefined,
      status: submittedFilters.status === "ALL" ? undefined : submittedFilters.status,
      semesterId: submittedFilters.semesterId || undefined,
    }),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listAdminClassrooms(props.accessToken ?? "", {
        query: submittedFilters.query || undefined,
        status: submittedFilters.status === "ALL" ? undefined : submittedFilters.status,
        semesterId: submittedFilters.semesterId || undefined,
        limit: 12,
      }),
  })

  useEffect(() => {
    if (!classroomsQuery.data) {
      return
    }

    setStatusMessage(
      buildAdminClassroomGovernanceSummaryMessage(
        classroomsQuery.data.length,
        submittedFilters.query || "all classrooms",
      ),
    )
  }, [classroomsQuery.data, submittedFilters])

  useEffect(() => {
    if (!classroomsQuery.data) {
      return
    }

    if (classroomsQuery.data.length === 0) {
      setSelectedClassroomId("")
      return
    }

    if (classroomsQuery.data.some((classroom) => classroom.id === selectedClassroomId)) {
      return
    }

    startTransition(() => {
      setSelectedClassroomId(classroomsQuery.data[0]?.id ?? "")
    })
  }, [classroomsQuery.data, selectedClassroomId])

  const detailQuery = useQuery({
    queryKey: selectedClassroomId
      ? webWorkflowQueryKeys.adminClassroomDetail(selectedClassroomId)
      : ["web-workflows", "admin-classroom-detail", "none"],
    enabled: Boolean(props.accessToken && selectedClassroomId),
    queryFn: () =>
      bootstrap.authClient.getAdminClassroom(props.accessToken ?? "", selectedClassroomId),
  })

  const archiveClassroom = useMutation({
    mutationFn: async () => {
      if (!props.accessToken || !selectedClassroomId) {
        throw new Error("Select a classroom before you archive it.")
      }

      return bootstrap.authClient.archiveAdminClassroom(props.accessToken, selectedClassroomId, {
        reason: actionReason.trim(),
      })
    },
    onSuccess: async (archived) => {
      setHighRiskAcknowledged(false)
      setStatusMessage(`Archived ${archived.classroomTitle ?? archived.displayTitle}.`)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.adminClassrooms({
            query: submittedFilters.query || undefined,
            status: submittedFilters.status === "ALL" ? undefined : submittedFilters.status,
            semesterId: submittedFilters.semesterId || undefined,
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.adminClassroomDetail(archived.id),
        }),
      ])
    },
    onError: (error) => {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to archive the classroom safely.",
      )
    },
  })

  const archiveReadiness = detailQuery.data
    ? buildAdminClassroomArchiveReadiness({
        classroomStatus: detailQuery.data.status,
        liveAttendanceSessionCount: detailQuery.data.governance.liveAttendanceSessionCount,
        reason: actionReason,
        acknowledged: highRiskAcknowledged,
      })
    : null
  const governanceImpact = detailQuery.data
    ? buildAdminClassroomGovernanceImpactModel(detailQuery.data)
    : null

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
              <Field label="Search classrooms" value={query} onChange={setQuery} />
              <label style={{ display: "grid", gap: 6 }}>
                <span>Semester</span>
                <select
                  value={semesterId}
                  onChange={(event) => setSemesterId(event.target.value)}
                  style={styles.input}
                >
                  <option value="">All semesters</option>
                  {(semestersQuery.data ?? []).map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {semester.title} ({semester.code})
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Classroom status</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as AdminClassroomStatusFilter)
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
                onClick={() =>
                  setSubmittedFilters({
                    query: query.trim(),
                    status: statusFilter,
                    semesterId,
                  })
                }
                disabled={classroomsQuery.isFetching}
                style={styles.primaryButton}
              >
                {classroomsQuery.isFetching ? "Searching..." : "Review classrooms"}
              </button>
              <Link href={adminWorkflowRoutes.dashboard} style={styles.secondaryButton}>
                Back to dashboard
              </Link>
            </div>

            {classroomsQuery.isLoading ? (
              <StateCard message="Loading classroom governance records..." />
            ) : null}
            {classroomsQuery.isError ? (
              <Banner
                tone="danger"
                message={
                  classroomsQuery.error instanceof Error
                    ? classroomsQuery.error.message
                    : "Failed to load classroom governance records."
                }
              />
            ) : null}

            {classroomsQuery.data && classroomsQuery.data.length > 0 ? (
              <div style={{ display: "grid", gap: 12 }}>
                {classroomsQuery.data.map((classroom) => {
                  const card = buildAdminClassroomGovernanceListCard(classroom)

                  return (
                    <button
                      key={classroom.id}
                      type="button"
                      onClick={() => setSelectedClassroomId(classroom.id)}
                      style={{
                        ...styles.rowCard,
                        textAlign: "left",
                        cursor: "pointer",
                        background:
                          selectedClassroomId === classroom.id
                            ? "rgba(37, 99, 235, 0.08)"
                            : "#ffffff",
                      }}
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
            ) : !classroomsQuery.isLoading ? (
              <StateCard message="No classrooms matched the current governance filter." />
            ) : null}
          </div>
        )}
      </WebSectionCard>

      <WebSectionCard
        title="Selected Classroom"
        description="Keep course context, live-session impact, and preserved history visible before you archive anything."
      >
        {detailQuery.isLoading ? (
          <StateCard message="Loading classroom governance detail..." />
        ) : detailQuery.isError ? (
          <Banner
            tone="danger"
            message={
              detailQuery.error instanceof Error
                ? detailQuery.error.message
                : "Failed to load the selected classroom."
            }
          />
        ) : detailQuery.data ? (
          <div style={styles.grid}>
            <div style={styles.rowCard}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>
                    {detailQuery.data.classroomTitle ?? detailQuery.data.displayTitle}
                  </strong>
                  <div style={{ color: "#64748b", marginTop: 4 }}>
                    {detailQuery.data.courseCode ?? detailQuery.data.code} ·{" "}
                    {detailQuery.data.semesterTitle ?? detailQuery.data.semesterCode ?? "Semester"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={styles.pill}>
                    {formatAdminSupportLabel(detailQuery.data.status)}
                  </span>
                  <span style={styles.pill}>
                    {formatAdminSupportLabel(detailQuery.data.defaultAttendanceMode)}
                  </span>
                </div>
              </div>
              <div style={{ color: "#475569", marginTop: 12, lineHeight: 1.7 }}>
                Primary teacher: {detailQuery.data.primaryTeacherDisplayName ?? "Not assigned"}
                <br />
                Course scope:{" "}
                {[
                  detailQuery.data.classCode ?? detailQuery.data.classTitle,
                  detailQuery.data.sectionCode ?? detailQuery.data.sectionTitle,
                  detailQuery.data.subjectCode ?? detailQuery.data.subjectTitle,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Not available"}
                <br />
                Join code: {detailQuery.data.activeJoinCode?.code ?? "No active join code"}
                <br />
                Device rule:{" "}
                {detailQuery.data.requiresTrustedDevice
                  ? "Student device registration required"
                  : "Student device registration not required"}
              </div>
            </div>

            <div style={styles.rowCard}>
              <strong>Attendance and roster impact</strong>
              <div style={{ color: "#475569", marginTop: 10, lineHeight: 1.7 }}>
                Active students: {detailQuery.data.governance.activeStudentCount}
                <br />
                Pending students: {detailQuery.data.governance.pendingStudentCount}
                <br />
                Blocked students: {detailQuery.data.governance.blockedStudentCount}
                <br />
                Dropped students: {detailQuery.data.governance.droppedStudentCount}
                <br />
                Attendance sessions: {detailQuery.data.governance.attendanceSessionCount}
                <br />
                Live attendance sessions: {detailQuery.data.governance.liveAttendanceSessionCount}
                <br />
                Present records: {detailQuery.data.governance.presentRecordCount}
                <br />
                Absent records: {detailQuery.data.governance.absentRecordCount}
                <br />
                Latest attendance:{" "}
                {detailQuery.data.governance.latestAttendanceAt
                  ? formatPortalDateTime(detailQuery.data.governance.latestAttendanceAt)
                  : "No saved attendance yet"}
              </div>
            </div>

            <div style={styles.rowCard}>
              <strong>{governanceImpact?.archiveEffectLabel}</strong>
              <div style={{ color: "#475569", marginTop: 10, lineHeight: 1.7 }}>
                {governanceImpact?.archiveEffectMessage}
                <br />
                {governanceImpact?.historyPreservedNote}
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
        {!detailQuery.data ? (
          <StateCard message="Select a classroom before you archive it." />
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
                I reviewed the classroom history, live-session state, and archive impact before
                saving this governance action.
              </span>
            </label>
            <div style={styles.rowCard}>
              <strong>{detailQuery.data.governance.archiveEffectLabel}</strong>
              <div style={{ color: "#475569", marginTop: 6 }}>
                {archiveReadiness?.message ?? "Review the classroom before you archive it."}
              </div>
              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => archiveClassroom.mutate()}
                  disabled={!archiveReadiness?.allowed || archiveClassroom.isPending}
                  style={styles.dangerButton}
                >
                  {archiveClassroom.isPending ? "Archiving..." : "Archive classroom"}
                </button>
              </div>
            </div>
          </div>
        )}
      </WebSectionCard>

      {statusMessage ? <Banner tone="info" message={statusMessage} /> : null}
    </div>
  )
}
