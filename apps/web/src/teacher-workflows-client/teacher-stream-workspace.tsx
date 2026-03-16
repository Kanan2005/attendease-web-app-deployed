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

export function TeacherStreamWorkspace(props: {
  accessToken: string | null
  classroomId: string
}) {
  const queryClient = useQueryClient()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [visibility, setVisibility] = useState<AnnouncementVisibility>("STUDENT_AND_TEACHER")
  const [shouldNotify, setShouldNotify] = useState(true)

  const announcementsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomStream(props.classroomId, 25),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listClassroomAnnouncements(props.accessToken ?? "", props.classroomId, {
        limit: 25,
      }),
  })

  const createAnnouncement = useMutation({
    mutationFn: async () => {
      if (!props.accessToken) {
        throw new Error("Announcement posting requires an authenticated teacher or admin session.")
      }

      return bootstrap.authClient.createClassroomAnnouncement(
        props.accessToken,
        props.classroomId,
        {
          ...(title.trim() ? { title: title.trim() } : {}),
          body: body.trim(),
          visibility,
          shouldNotify,
        },
      )
    },
    onSuccess: async (announcement) => {
      setStatusMessage(`Posted "${announcement.title ?? "Untitled announcement"}" to the stream.`)
      setTitle("")
      setBody("")
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.classroomStream(props.classroomId, 25),
      })
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to post announcement.")
    },
  })

  return (
    <div style={workflowStyles.grid}>
      <WebSectionCard
        title="Compose Announcement"
        description="Student-visible versus teacher-only visibility and optional notification fan-out are wired to the live API."
      >
        {!props.accessToken ? (
          <WorkflowStateCard message="No web access token is available for stream posting yet." />
        ) : (
          <div style={workflowStyles.grid}>
            <WorkflowField label="Title" value={title} onChange={setTitle} />
            <label style={{ display: "grid", gap: 6 }}>
              <span>Body</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                style={workflowStyles.textarea}
                placeholder="Post an update to the classroom stream"
              />
            </label>
            <div style={workflowStyles.formGrid}>
              <WorkflowSelectField
                label="Visibility"
                value={visibility}
                onChange={(value) => setVisibility(value as AnnouncementVisibility)}
                options={[
                  { value: "STUDENT_AND_TEACHER", label: "Student and teacher" },
                  { value: "TEACHER_ONLY", label: "Teacher only" },
                ]}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 28 }}>
                <input
                  type="checkbox"
                  checked={shouldNotify}
                  onChange={(event) => setShouldNotify(event.target.checked)}
                />
                Notify on post
              </label>
            </div>
            <button
              type="button"
              onClick={() => createAnnouncement.mutate()}
              disabled={createAnnouncement.isPending || !body.trim()}
              style={workflowStyles.primaryButton}
            >
              {createAnnouncement.isPending ? "Posting..." : "Post announcement"}
            </button>
          </div>
        )}
      </WebSectionCard>

      <WebSectionCard
        title="Classroom Stream"
        description="Teacher-visible stream history loads from the current announcement endpoint."
      >
        {announcementsQuery.isLoading ? <WorkflowStateCard message="Loading stream..." /> : null}
        {announcementsQuery.isError ? (
          <WorkflowBanner
            tone="danger"
            message={
              announcementsQuery.error instanceof Error
                ? announcementsQuery.error.message
                : "Failed to load classroom announcements."
            }
          />
        ) : null}
        {announcementsQuery.data && announcementsQuery.data.length === 0 ? (
          <WorkflowStateCard message="No announcements have been posted for this classroom yet." />
        ) : null}
        {announcementsQuery.data && announcementsQuery.data.length > 0 ? (
          <div style={workflowStyles.grid}>
            {announcementsQuery.data.map((announcement) => (
              <div key={announcement.id} style={workflowStyles.rowCard}>
                <div style={workflowStyles.buttonRow}>
                  <span style={workflowStyles.pill}>{announcement.visibility}</span>
                  <span style={workflowStyles.pill}>{announcement.postType}</span>
                </div>
                <h4 style={{ marginBottom: 8 }}>{announcement.title ?? "Untitled announcement"}</h4>
                <p style={{ marginTop: 0, color: "#475569", lineHeight: 1.6 }}>
                  {announcement.body}
                </p>
                <div style={{ color: "#64748b" }}>
                  {announcement.authorDisplayName} · {formatPortalDateTime(announcement.createdAt)}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </WebSectionCard>

      {statusMessage ? <WorkflowBanner tone="info" message={statusMessage} /> : null}
    </div>
  )
}
