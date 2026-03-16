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

export function TeacherClassroomDetailWorkspace(props: {
  accessToken: string | null
  classroomId: string
}) {
  const queryClient = useQueryClient()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [form, setForm] = useState<ReturnType<typeof createTeacherWebClassroomEditDraft> | null>(
    null,
  )

  const detailQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomDetail(props.classroomId),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.getClassroom(props.accessToken ?? "", props.classroomId),
  })
  const joinCodeQuery = useQuery({
    queryKey: ["web-workflows", "classroom-join-code", props.classroomId],
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.getClassroomJoinCode(props.accessToken ?? "", props.classroomId),
  })
  const lecturesQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomLectures(props.classroomId),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listClassroomLectures(props.accessToken ?? "", props.classroomId),
  })

  useEffect(() => {
    if (!detailQuery.data) {
      return
    }

    setForm((current) => current ?? createTeacherWebClassroomEditDraft(detailQuery.data))
  }, [detailQuery.data])

  const updateClassroom = useMutation({
    mutationFn: async () => {
      const currentClassroom = detailQuery.data

      if (!props.accessToken || !form || !currentClassroom) {
        throw new Error("Classroom update requires a loaded web session and classroom detail.")
      }

      if (!hasTeacherWebClassroomEditChanges(currentClassroom, form)) {
        throw new Error("No course changes are waiting to be saved.")
      }

      return bootstrap.authClient.updateClassroom(
        props.accessToken,
        props.classroomId,
        buildTeacherWebClassroomUpdateRequest(currentClassroom, form),
      )
    },
    onSuccess: async (updated) => {
      setStatusMessage(`Saved changes for ${updated.classroomTitle ?? updated.displayTitle}.`)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classroomDetail(props.classroomId),
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classrooms(),
        }),
      ])
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to update the classroom.")
    },
  })

  const resetJoinCode = useMutation({
    mutationFn: async () => {
      if (!props.accessToken) {
        throw new Error("Join-code reset requires an authenticated teacher or admin session.")
      }

      return bootstrap.authClient.resetClassroomJoinCode(props.accessToken, props.classroomId)
    },
    onSuccess: async (joinCode) => {
      setStatusMessage(`Rotated join code to ${joinCode.code}.`)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["web-workflows", "classroom-join-code", props.classroomId],
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classrooms(),
        }),
      ])
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to rotate the join code.")
    },
  })

  const archiveClassroom = useMutation({
    mutationFn: async () => {
      if (!props.accessToken) {
        throw new Error("Archiving a classroom requires an authenticated teacher or admin session.")
      }

      return bootstrap.authClient.archiveClassroom(props.accessToken, props.classroomId)
    },
    onSuccess: async (archived) => {
      setStatusMessage(`Archived ${archived.classroomTitle ?? archived.displayTitle}.`)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classroomDetail(props.classroomId),
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classrooms(),
        }),
      ])
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to archive the classroom.")
    },
  })

  if (!props.accessToken) {
    return <WorkflowStateCard message="Sign in to open this classroom." />
  }

  if (detailQuery.isLoading || !form) {
    return <WorkflowStateCard message="Loading classroom detail..." />
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <WorkflowBanner
        tone="danger"
        message={
          detailQuery.error instanceof Error
            ? detailQuery.error.message
            : "Failed to load the classroom detail."
        }
      />
    )
  }

  const classroom = detailQuery.data
  const courseTitle = classroom.classroomTitle ?? classroom.displayTitle
  const courseCode = classroom.courseCode ?? classroom.code
  const scopeSummary = buildTeacherWebClassroomScopeSummary(classroom)
  const canEditCourseInfo =
    classroom.permissions?.canEditCourseInfo ?? classroom.permissions?.canEdit ?? true
  const canArchive = classroom.permissions?.canArchive ?? false

  return (
    <div style={workflowStyles.grid}>
      <WebSectionCard
        title={`${courseTitle} (${courseCode})`}
        description="Keep course details, classroom status, join code, QR launch, and the next classroom tools together."
      >
        <div style={workflowStyles.summaryGrid}>
          <div style={workflowStyles.summaryMetric}>
            <div style={{ color: "#475569", fontSize: 13 }}>Teaching scope</div>
            <strong style={{ display: "block", marginTop: 6 }}>{scopeSummary}</strong>
          </div>
          <div style={workflowStyles.summaryMetric}>
            <div style={{ color: "#475569", fontSize: 13 }}>Join code</div>
            <strong style={{ display: "block", marginTop: 6 }}>
              {joinCodeQuery.data?.code ?? "Not loaded yet"}
            </strong>
          </div>
          <div style={workflowStyles.summaryMetric}>
            <div style={{ color: "#475569", fontSize: 13 }}>Attendance mode</div>
            <strong style={{ display: "block", marginTop: 6 }}>
              {formatTeacherWebAttendanceModeLabel(classroom.defaultAttendanceMode)}
            </strong>
          </div>
        </div>
      </WebSectionCard>

      <div style={workflowStyles.twoColumn}>
        <WebSectionCard
          title="Course settings"
          description="Update the classroom title, course code, and attendance defaults without touching academic scope assignments."
        >
          <div style={workflowStyles.formGrid}>
            <WorkflowField
              label="Classroom title"
              value={form.classroomTitle}
              onChange={(value) =>
                setForm((current) => (current ? { ...current, classroomTitle: value } : current))
              }
            />
            <WorkflowField
              label="Course code"
              value={form.courseCode}
              onChange={(value) =>
                setForm((current) => (current ? { ...current, courseCode: value } : current))
              }
            />
            <WorkflowSelectField
              label="Attendance mode"
              value={form.defaultAttendanceMode}
              onChange={(value) =>
                setForm((current) =>
                  current
                    ? { ...current, defaultAttendanceMode: value as AttendanceMode }
                    : current,
                )
              }
              options={[
                { value: "QR_GPS", label: "QR + GPS" },
                { value: "BLUETOOTH", label: "Bluetooth" },
                { value: "MANUAL", label: "Manual" },
              ]}
            />
            <WorkflowField
              label="GPS radius (meters)"
              value={form.defaultGpsRadiusMeters}
              onChange={(value) =>
                setForm((current) =>
                  current ? { ...current, defaultGpsRadiusMeters: value } : current,
                )
              }
              type="number"
            />
            <WorkflowField
              label="Session duration (minutes)"
              value={form.defaultSessionDurationMinutes}
              onChange={(value) =>
                setForm((current) =>
                  current ? { ...current, defaultSessionDurationMinutes: value } : current,
                )
              }
              type="number"
            />
            <WorkflowField
              label="Timezone"
              value={form.timezone}
              onChange={(value) =>
                setForm((current) => (current ? { ...current, timezone: value } : current))
              }
            />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
            <input
              type="checkbox"
              checked={form.requiresTrustedDevice}
              onChange={(event) =>
                setForm((current) =>
                  current ? { ...current, requiresTrustedDevice: event.target.checked } : current,
                )
              }
            />
            Require device registration for student attendance
          </label>

          <div style={{ ...workflowStyles.buttonRow, marginTop: 16 }}>
            <button
              type="button"
              onClick={() => updateClassroom.mutate()}
              disabled={
                updateClassroom.isPending ||
                !canEditCourseInfo ||
                !hasTeacherWebClassroomEditChanges(classroom, form)
              }
              style={workflowStyles.primaryButton}
            >
              {updateClassroom.isPending ? "Saving..." : "Save course settings"}
            </button>
            <button
              type="button"
              onClick={() => resetJoinCode.mutate()}
              disabled={resetJoinCode.isPending}
              style={workflowStyles.secondaryButton}
            >
              {resetJoinCode.isPending ? "Rotating..." : "Reset join code"}
            </button>
            <button
              type="button"
              onClick={() => archiveClassroom.mutate()}
              disabled={archiveClassroom.isPending || !canArchive}
              style={workflowStyles.dangerButton}
            >
              {archiveClassroom.isPending ? "Archiving..." : "Archive classroom"}
            </button>
          </div>
        </WebSectionCard>

        <div style={workflowStyles.grid}>
          <WebSectionCard
            title="Next classroom tools"
            description="Keep the main classroom routes close to course management instead of sending teachers back through the main dashboard."
          >
            <div style={workflowStyles.cardGrid}>
              {buildTeacherClassroomLinks(props.classroomId).map((link) => (
                <Link key={link.href} href={link.href} style={workflowStyles.linkCard}>
                  <strong style={{ display: "block", marginBottom: 6 }}>{link.label}</strong>
                  <span style={{ color: "#64748b", lineHeight: 1.5 }}>
                    {link.label === "Course"
                      ? "Review course settings, join code, and QR launch."
                      : link.label === "Roster"
                        ? "Manage students and membership state."
                        : link.label === "Schedule"
                          ? "Plan recurring slots and class exceptions."
                          : link.label === "Updates"
                            ? "Post announcements and review classroom activity."
                            : link.label === "Class Sessions"
                              ? "Review class-session rows linked to attendance."
                              : "Review classroom import status."}
                  </span>
                </Link>
              ))}
            </div>
          </WebSectionCard>

          <WebSectionCard
            title="QR + GPS attendance"
            description="Open the short QR setup flow with this classroom preselected, then move straight into the live teacher controls."
          >
            <div style={workflowStyles.grid}>
              <div style={workflowStyles.summaryGrid}>
                <div style={workflowStyles.summaryMetric}>
                  <div style={{ color: "#475569", fontSize: 13 }}>Default duration</div>
                  <strong style={{ display: "block", marginTop: 6 }}>
                    {classroom.defaultSessionDurationMinutes} minutes
                  </strong>
                </div>
                <div style={workflowStyles.summaryMetric}>
                  <div style={{ color: "#475569", fontSize: 13 }}>Allowed distance</div>
                  <strong style={{ display: "block", marginTop: 6 }}>
                    {classroom.defaultGpsRadiusMeters} meters
                  </strong>
                </div>
                <div style={workflowStyles.summaryMetric}>
                  <div style={{ color: "#475569", fontSize: 13 }}>Location requirement</div>
                  <strong style={{ display: "block", marginTop: 6 }}>
                    Browser location required
                  </strong>
                </div>
              </div>

              <div style={workflowStyles.buttonRow}>
                <Link
                  href={`${teacherWorkflowRoutes.sessionStart}?classroomId=${props.classroomId}`}
                  style={workflowStyles.primaryButton}
                >
                  Open QR setup
                </Link>
                <Link
                  href={teacherWorkflowRoutes.sessionHistory}
                  style={workflowStyles.secondaryButton}
                >
                  Open session history
                </Link>
              </div>

              {classroom.defaultAttendanceMode !== "QR_GPS" ? (
                <WorkflowBanner
                  tone="info"
                  message="This classroom is not set to QR + GPS. Update the attendance mode first if this class should launch from teacher web."
                />
              ) : null}
            </div>
          </WebSectionCard>

          <WebSectionCard
            title="Recent class sessions"
            description="Recent class sessions stay nearby so QR launch does not feel disconnected from the classroom schedule."
          >
            {lecturesQuery.isLoading ? (
              <WorkflowStateCard message="Loading class sessions..." />
            ) : lecturesQuery.isError ? (
              <WorkflowBanner
                tone="danger"
                message={
                  lecturesQuery.error instanceof Error
                    ? lecturesQuery.error.message
                    : "Failed to load class sessions."
                }
              />
            ) : lecturesQuery.data && lecturesQuery.data.length > 0 ? (
              <div style={workflowStyles.grid}>
                {lecturesQuery.data.slice(0, 5).map((lecture) => (
                  <div key={lecture.id} style={workflowStyles.rowCard}>
                    <strong>{lecture.title ?? "Untitled class session"}</strong>
                    <div style={{ color: "#64748b", marginTop: 4 }}>
                      {formatPortalDateTime(lecture.lectureDate)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <WorkflowStateCard message="No class sessions exist yet for this classroom." />
            )}
          </WebSectionCard>
        </div>
      </div>

      {statusMessage ? <WorkflowBanner tone="info" message={statusMessage} /> : null}
    </div>
  )
}
