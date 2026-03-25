"use client"

import type {
  AnnouncementVisibility,
  AttendanceMode,
  AttendanceSessionStatus,
  AttendanceSessionStudentSummary,
  ClassroomDetail,
  ClassroomRosterMemberSummary,
  ClassroomSummary,
  CourseOfferingStatus,
  ExportJobType,
  LectureSummary,
} from "@attendease/contracts"
import {
  buildAttendanceCorrectionSaveMessage,
  buildAttendanceEditChanges,
  createAttendanceEditDraft,
  getAttendanceCorrectionReviewPollInterval,
} from "@attendease/domain"
import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { createWebAuthBootstrap } from "../auth"
import {
  buildTeacherWebClassroomCreateRequest,
  buildTeacherWebClassroomListCards,
  buildTeacherWebClassroomScopeOptions,
  buildTeacherWebClassroomScopeSummary,
  buildTeacherWebClassroomUpdateRequest,
  createTeacherWebClassroomCreateDraft,
  createTeacherWebClassroomEditDraft,
  formatTeacherWebAttendanceModeLabel,
  hasTeacherWebClassroomEditChanges,
} from "../teacher-classroom-management"
import {
  applyTeacherWebQrSessionClassroomSelection,
  buildTeacherWebQrSessionClassroomOptions,
  buildTeacherWebQrSessionStartRequest,
  createTeacherWebQrSessionStartDraft,
  evaluateTeacherWebQrSessionStartReadiness,
} from "../teacher-qr-session-management"
import {
  type TeacherWebReviewTone,
  buildTeacherWebAcademicFilterOptions,
  buildTeacherWebFilterSummary,
  buildTeacherWebHistoryQueryFilters,
  buildTeacherWebReportOverviewModel,
  buildTeacherWebReportQueryFilters,
  buildTeacherWebSessionDetailOverviewModel,
  buildTeacherWebSessionDetailStatusModel,
  buildTeacherWebSessionHistorySummaryModel,
  buildTeacherWebSessionRosterModel,
  createTeacherWebHistoryFilterDraft,
  createTeacherWebReportFilterDraft,
  mapTeacherWebReviewErrorToMessage,
} from "../teacher-review-workflows"
import {
  buildTeacherWebRosterAddRequest,
  buildTeacherWebRosterFilters,
  buildTeacherWebRosterMemberActions,
  buildTeacherWebRosterMemberIdentityText,
  buildTeacherWebRosterResultSummary,
} from "../teacher-roster-management"
import { WebSectionCard } from "../web-shell"
import {
  buildScheduleSavePayload,
  buildTeacherClassroomLinks,
  buildTeacherSemesterVisibilityRows,
  createEmptyScheduleExceptionDraft,
  createEmptyScheduleSlotDraft,
  createScheduleDraftState,
  formatPortalDateTime,
  formatPortalMinutesRange,
  getTeacherSessionHistoryPollInterval,
  parseRosterImportRowsText,
  sortScheduleExceptions,
  sortScheduleSlots,
  teacherWorkflowRoutes,
  webWorkflowQueryKeys,
} from "../web-workflows"

import {
  WorkflowBanner,
  WorkflowField,
  WorkflowSelectField,
  WorkflowStateCard,
  WorkflowStatusCard,
  WorkflowSummaryGrid,
  WorkflowTonePill,
  bootstrap,
  findSelectedFilterLabel,
  getToneStyles,
  toneForSessionState,
  workflowStyles,
} from "./shared"

export function TeacherImportStatusWorkspace(props: {
  accessToken: string | null
  classroomId: string
}) {
  const queryClient = useQueryClient()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [selectedJobId, setSelectedJobId] = useState("")
  const [sourceFileName, setSourceFileName] = useState("roster-import.csv")
  const [importText, setImportText] = useState("")

  const parsedImport = parseRosterImportRowsText(importText)
  const jobsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomImports(props.classroomId),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listRosterImportJobs(props.accessToken ?? "", props.classroomId),
  })
  const detailQuery = useQuery({
    queryKey: selectedJobId
      ? webWorkflowQueryKeys.classroomImportDetail(props.classroomId, selectedJobId)
      : ["web-workflows", "classroom-import-detail", props.classroomId, "none"],
    enabled: Boolean(props.accessToken && selectedJobId),
    queryFn: () =>
      bootstrap.authClient.getRosterImportJob(
        props.accessToken ?? "",
        props.classroomId,
        selectedJobId,
      ),
  })

  useEffect(() => {
    if (!jobsQuery.data || jobsQuery.data.length === 0 || selectedJobId) {
      return
    }

    const firstJob = jobsQuery.data[0]

    if (firstJob) {
      setSelectedJobId(firstJob.id)
    }
  }, [jobsQuery.data, selectedJobId])

  const createImportJob = useMutation({
    mutationFn: async () => {
      if (!props.accessToken) {
        throw new Error("Import creation requires an authenticated teacher or admin session.")
      }

      if (parsedImport.rows.length === 0) {
        throw new Error("Paste at least one valid row before creating a roster import job.")
      }

      return bootstrap.authClient.createRosterImportJob(props.accessToken, props.classroomId, {
        sourceFileName: sourceFileName.trim(),
        rows: parsedImport.rows,
      })
    },
    onSuccess: async (job) => {
      setStatusMessage(`Created import job ${job.sourceFileName} with ${job.totalRows} row(s).`)
      setSelectedJobId(job.id)
      setImportText("")
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classroomImports(props.classroomId),
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.teacherImports(),
        }),
      ])
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to create the import job.")
    },
  })

  const applyImportJob = useMutation({
    mutationFn: async () => {
      if (!props.accessToken || !selectedJobId) {
        throw new Error("Choose a reviewed import job before applying it to the classroom roster.")
      }

      return bootstrap.authClient.applyRosterImportJob(
        props.accessToken,
        props.classroomId,
        selectedJobId,
      )
    },
    onSuccess: async (job) => {
      setStatusMessage(`Applied ${job.appliedRows} row(s) from ${job.sourceFileName}.`)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classroomImports(props.classroomId),
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classroomImportDetail(props.classroomId, job.id),
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classroomRoster(props.classroomId),
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.teacherImports(),
        }),
      ])
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to apply the import job.")
    },
  })

  return (
    <div style={workflowStyles.grid}>
      <Link
        href={teacherWorkflowRoutes.classroomRoster(props.classroomId)}
        className="ui-back-link"
        style={{
          fontSize: 13,
          color: webTheme.colors.textMuted,
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span aria-hidden>←</span> Back to students
      </Link>

      <div style={workflowStyles.twoColumn}>
        <WebSectionCard
          title="Create Roster Import"
          description="Paste normalized rows into the current uploader shell. The later CSV/XLSX adapter can feed the same endpoint without changing this route."
        >
          {!props.accessToken ? (
            <WorkflowStateCard message="No web access token is available for imports yet." />
          ) : (
            <div style={workflowStyles.grid}>
              <WorkflowField
                label="Source file name"
                value={sourceFileName}
                onChange={setSourceFileName}
              />
              <label style={{ display: "grid", gap: 6 }}>
                <span>Roster rows</span>
                <textarea
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                  placeholder="student.one@attendease.dev,Student One,23CS001"
                  style={workflowStyles.textarea}
                />
              </label>
              <WorkflowBanner
                tone="info"
                message={`Parsed ${parsedImport.rows.length} valid row(s); ignored ${parsedImport.ignoredLineCount} line(s).`}
              />
              <button
                type="button"
                onClick={() => createImportJob.mutate()}
                disabled={createImportJob.isPending}
                style={workflowStyles.primaryButton}
              >
                {createImportJob.isPending ? "Creating..." : "Create import job"}
              </button>
            </div>
          )}
        </WebSectionCard>

        <WebSectionCard
          title="Import Job Detail"
          description="Teacher review and apply stays on the same classroom-scoped route."
        >
          {detailQuery.isLoading ? (
            <WorkflowStateCard message="Loading import detail..." />
          ) : detailQuery.isError ? (
            <WorkflowBanner
              tone="danger"
              message={
                detailQuery.error instanceof Error
                  ? detailQuery.error.message
                  : "Failed to load import detail."
              }
            />
          ) : detailQuery.data ? (
            <div style={workflowStyles.grid}>
              <div style={workflowStyles.buttonRow}>
                <span style={workflowStyles.pill}>{detailQuery.data.status}</span>
                <span style={workflowStyles.pill}>
                  {detailQuery.data.appliedRows}/{detailQuery.data.totalRows} applied
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={workflowStyles.table}>
                  <thead>
                    <tr>
                      <th style={workflowStyles.th}>Row</th>
                      <th style={workflowStyles.th}>Student</th>
                      <th style={workflowStyles.th}>Status</th>
                      <th style={workflowStyles.th}>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailQuery.data.rows.slice(0, 12).map((row) => (
                      <tr key={row.id}>
                        <td style={workflowStyles.td}>{row.rowNumber}</td>
                        <td style={workflowStyles.td}>
                          {row.studentEmail ?? row.studentRollNumber ?? "Unknown"}
                        </td>
                        <td style={workflowStyles.td}>{row.status}</td>
                        <td style={workflowStyles.td}>{row.errorMessage ?? "None"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => applyImportJob.mutate()}
                disabled={applyImportJob.isPending || detailQuery.data.status !== "REVIEW_REQUIRED"}
                style={workflowStyles.primaryButton}
              >
                {applyImportJob.isPending ? "Applying..." : "Apply reviewed rows"}
              </button>
            </div>
          ) : (
            <WorkflowStateCard message="Choose an import job to inspect its row-level results." />
          )}
        </WebSectionCard>
      </div>

      <WebSectionCard
        title="Import Jobs"
        description="Import status and review remain tied to the classroom roster workflow."
      >
        {jobsQuery.isLoading ? <WorkflowStateCard message="Loading import jobs..." /> : null}
        {jobsQuery.isError ? (
          <WorkflowBanner
            tone="danger"
            message={
              jobsQuery.error instanceof Error
                ? jobsQuery.error.message
                : "Failed to load import jobs."
            }
          />
        ) : null}
        {jobsQuery.data && jobsQuery.data.length === 0 ? (
          <WorkflowStateCard message="No roster import jobs exist for this classroom yet." />
        ) : null}
        {jobsQuery.data && jobsQuery.data.length > 0 ? (
          <div style={workflowStyles.grid}>
            {jobsQuery.data.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => setSelectedJobId(job.id)}
                style={{
                  ...workflowStyles.rowCard,
                  textAlign: "left",
                  cursor: "pointer",
                  borderColor:
                    selectedJobId === job.id ? webTheme.colors.accent : webTheme.colors.border,
                }}
              >
                <strong>{job.sourceFileName}</strong>
                <div style={{ color: webTheme.colors.textSubtle, marginTop: 6 }}>
                  {job.status} · {job.validRows}/{job.totalRows} valid
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </WebSectionCard>

      {statusMessage ? <WorkflowBanner tone="info" message={statusMessage} /> : null}
    </div>
  )
}
