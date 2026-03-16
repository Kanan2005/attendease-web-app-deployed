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

export function TeacherExportsWorkspace(props: {
  accessToken: string | null
}) {
  const [selectedJobType, setSelectedJobType] = useState<ExportJobType>("SESSION_PDF")
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [selectedClassroomId, setSelectedClassroomId] = useState("")

  const classroomsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classrooms(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listClassrooms(props.accessToken ?? ""),
  })

  const sessionsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.sessionHistory(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listAttendanceSessions(props.accessToken ?? "", {}),
    refetchInterval: (query) => getTeacherSessionHistoryPollInterval(query.state.data ?? null),
  })

  const exportJobsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.exportJobs(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listExportJobs(props.accessToken ?? ""),
    refetchInterval: (query) => {
      const jobs = query.state.data ?? []

      return jobs.some((job) => job.status === "QUEUED" || job.status === "PROCESSING")
        ? 5000
        : false
    },
  })

  const createExportJobMutation = useMutation({
    mutationFn: async () => {
      if (!props.accessToken) {
        throw new Error("Teacher exports require a web access token.")
      }

      if (
        (selectedJobType === "SESSION_PDF" || selectedJobType === "SESSION_CSV") &&
        !selectedSessionId
      ) {
        throw new Error("Select a completed session before requesting a session export.")
      }

      return bootstrap.authClient.createExportJob(
        props.accessToken,
        selectedJobType === "SESSION_PDF" || selectedJobType === "SESSION_CSV"
          ? {
              jobType: selectedJobType,
              sessionId: selectedSessionId,
            }
          : {
              jobType: selectedJobType,
              filters: selectedClassroomId ? { classroomId: selectedClassroomId } : {},
            },
      )
    },
    onSuccess: async () => {
      await Promise.all([
        exportJobsQuery.refetch(),
        sessionsQuery.refetch(),
        classroomsQuery.refetch(),
      ])
    },
  })

  const sessionOptions =
    sessionsQuery.data
      ?.filter((session) => session.status !== "ACTIVE")
      ?.map((session) => ({
        value: session.id,
        label: `${session.classroomDisplayTitle} · ${session.status}`,
      })) ?? []

  const classroomOptions =
    classroomsQuery.data?.map((classroom) => ({
      value: classroom.id,
      label: `${classroom.displayTitle} · ${classroom.code}`,
    })) ?? []

  useEffect(() => {
    if (!selectedSessionId && sessionOptions[0]?.value) {
      setSelectedSessionId(sessionOptions[0].value)
    }
  }, [selectedSessionId, sessionOptions])

  useEffect(() => {
    if (!selectedClassroomId && classroomOptions[0]?.value) {
      setSelectedClassroomId(classroomOptions[0].value)
    }
  }, [classroomOptions, selectedClassroomId])

  const requiresSession = selectedJobType === "SESSION_PDF" || selectedJobType === "SESSION_CSV"

  return (
    <div style={workflowStyles.grid}>
      <WebSectionCard
        title="Export Requests"
        description="Queue worker-backed PDF or CSV exports from the same attendance truth used by history and reports."
      >
        {!props.accessToken ? (
          <WorkflowStateCard message="No web access token is available for export requests yet." />
        ) : (
          <div style={workflowStyles.grid}>
            <div style={workflowStyles.formGrid}>
              <WorkflowSelectField
                label="Export type"
                value={selectedJobType}
                onChange={(value) => setSelectedJobType(value as ExportJobType)}
                options={[
                  { value: "SESSION_PDF", label: "Session PDF" },
                  { value: "SESSION_CSV", label: "Session CSV" },
                  { value: "STUDENT_PERCENT_CSV", label: "Student Percentage CSV" },
                  { value: "COMPREHENSIVE_CSV", label: "Comprehensive CSV" },
                ]}
              />

              {requiresSession ? (
                <WorkflowSelectField
                  label="Session"
                  value={selectedSessionId}
                  onChange={setSelectedSessionId}
                  options={
                    sessionOptions.length
                      ? sessionOptions
                      : [{ value: "", label: "No completed sessions available" }]
                  }
                />
              ) : (
                <WorkflowSelectField
                  label="Classroom filter"
                  value={selectedClassroomId}
                  onChange={setSelectedClassroomId}
                  options={[{ value: "", label: "All classroom scope" }, ...classroomOptions]}
                />
              )}
            </div>

            {createExportJobMutation.isError ? (
              <WorkflowBanner
                tone="danger"
                message={
                  createExportJobMutation.error instanceof Error
                    ? createExportJobMutation.error.message
                    : "Failed to create export job."
                }
              />
            ) : null}

            <div style={workflowStyles.buttonRow}>
              <button
                type="button"
                style={workflowStyles.primaryButton}
                disabled={
                  createExportJobMutation.isPending || (requiresSession && !selectedSessionId)
                }
                onClick={() => {
                  void createExportJobMutation.mutateAsync()
                }}
              >
                {createExportJobMutation.isPending ? "Queueing Export..." : "Queue Export"}
              </button>
              <Link href="/teacher/reports" style={workflowStyles.secondaryButton}>
                Back To Reports
              </Link>
            </div>
          </div>
        )}
      </WebSectionCard>

      <WebSectionCard
        title="Export Job Status"
        description="Completed jobs expose signed download URLs. Processing jobs auto-refresh until the worker finishes."
      >
        {!props.accessToken ? (
          <WorkflowStateCard message="No token is available for export job status yet." />
        ) : exportJobsQuery.isLoading ? (
          <WorkflowStateCard message="Loading export jobs..." />
        ) : exportJobsQuery.isError ? (
          <WorkflowBanner
            tone="danger"
            message={
              exportJobsQuery.error instanceof Error
                ? exportJobsQuery.error.message
                : "Failed to load export jobs."
            }
          />
        ) : exportJobsQuery.data && exportJobsQuery.data.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={workflowStyles.table}>
              <thead>
                <tr>
                  <th style={workflowStyles.th}>Job</th>
                  <th style={workflowStyles.th}>Scope</th>
                  <th style={workflowStyles.th}>Status</th>
                  <th style={workflowStyles.th}>Files</th>
                  <th style={workflowStyles.th}>Download</th>
                </tr>
              </thead>
              <tbody>
                {exportJobsQuery.data.map((job) => (
                  <tr key={job.id}>
                    <td style={workflowStyles.td}>
                      <strong>{job.jobType}</strong>
                      <div style={{ color: "#64748b", marginTop: 4 }}>{job.id}</div>
                    </td>
                    <td style={workflowStyles.td}>
                      {job.courseOfferingDisplayTitle ?? job.sessionId ?? "All classroom scope"}
                    </td>
                    <td style={workflowStyles.td}>{job.status}</td>
                    <td style={workflowStyles.td}>
                      {job.readyFileCount}/{job.totalFileCount} ready
                    </td>
                    <td style={workflowStyles.td}>
                      {job.latestReadyDownloadUrl ? (
                        <a href={job.latestReadyDownloadUrl} style={workflowStyles.secondaryButton}>
                          Download
                        </a>
                      ) : (
                        <span style={{ color: "#64748b" }}>Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <WorkflowStateCard message="No export jobs have been queued yet." />
        )}
      </WebSectionCard>
    </div>
  )
}
