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

export function TeacherSessionStartWorkspace(props: {
  accessToken: string | null
  initialClassroomId?: string | null
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<ReturnType<typeof createTeacherWebQrSessionStartDraft>>(null)
  const [statusMessage, setStatusMessage] = useState<{
    tone: "info" | "danger"
    text: string
  } | null>(null)
  const [locationMessage, setLocationMessage] = useState<string | null>(null)
  const [isResolvingBrowserLocation, setIsResolvingBrowserLocation] = useState(false)

  const classroomsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classrooms({ status: "ACTIVE" }),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listClassrooms(props.accessToken ?? "", { status: "ACTIVE" }),
  })

  const classroomOptions = classroomsQuery.data
    ? buildTeacherWebQrSessionClassroomOptions(classroomsQuery.data)
    : []

  useEffect(() => {
    if (!classroomsQuery.data) {
      return
    }

    const nextOptions = buildTeacherWebQrSessionClassroomOptions(classroomsQuery.data)

    setDraft((current) => {
      if (nextOptions.length === 0) {
        return null
      }

      if (current && nextOptions.some((entry) => entry.classroomId === current.classroomId)) {
        return current
      }

      return createTeacherWebQrSessionStartDraft(nextOptions, props.initialClassroomId ?? undefined)
    })

    if (
      props.initialClassroomId &&
      !nextOptions.some((entry) => entry.classroomId === props.initialClassroomId)
    ) {
      setStatusMessage({
        tone: "info",
        text: "That classroom is not ready for QR + GPS launch on web. Choose an active QR + GPS classroom instead.",
      })
    }
  }, [classroomsQuery.data, props.initialClassroomId])

  const selectedClassroom = draft
    ? (classroomOptions.find((entry) => entry.classroomId === draft.classroomId) ?? null)
    : null
  const readiness = evaluateTeacherWebQrSessionStartReadiness(draft, classroomOptions)

  const createQrSession = useMutation({
    mutationFn: async () => {
      if (!props.accessToken || !draft) {
        throw new Error("Teacher web access is required before starting QR attendance.")
      }

      const readiness = evaluateTeacherWebQrSessionStartReadiness(draft, classroomOptions)

      if (!readiness.canStart) {
        throw new Error(readiness.blockingMessage ?? "QR attendance setup is incomplete.")
      }

      return bootstrap.authClient.createQrAttendanceSession(
        props.accessToken,
        buildTeacherWebQrSessionStartRequest(draft),
      )
    },
    onSuccess: async (session) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.sessionHistory(),
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.attendanceSession(session.id),
        }),
      ])
      router.push(teacherWorkflowRoutes.activeSession(session.id))
    },
    onError: (error) => {
      setStatusMessage({
        tone: "danger",
        text: error instanceof Error ? error.message : "Failed to start the QR attendance session.",
      })
    },
  })

  async function useBrowserLocationAnchor() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatusMessage({
        tone: "danger",
        text: "Browser location is unavailable here. Allow geolocation in a supported browser before starting the session.",
      })
      return
    }

    setIsResolvingBrowserLocation(true)
    setStatusMessage(null)
    setLocationMessage(null)

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDraft((current) =>
            current
              ? {
                  ...current,
                  anchorLatitude: position.coords.latitude.toFixed(6),
                  anchorLongitude: position.coords.longitude.toFixed(6),
                }
              : current,
          )
          setLocationMessage("Teacher location confirmed for this live session.")
          setIsResolvingBrowserLocation(false)
          resolve()
        },
        (error) => {
          setStatusMessage({
            tone: "danger",
            text:
              error.message ||
              "The browser location request was denied. Allow location access and try again.",
          })
          setIsResolvingBrowserLocation(false)
          resolve()
        },
        {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 0,
        },
      )
    })
  }

  if (!props.accessToken) {
    return <WorkflowStateCard message="Sign in to start QR attendance." />
  }

  if (classroomsQuery.isLoading && !draft) {
    return <WorkflowStateCard message="Loading QR-ready classrooms..." />
  }

  if (classroomsQuery.isError) {
    return (
      <WorkflowBanner
        tone="danger"
        message={
          classroomsQuery.error instanceof Error
            ? classroomsQuery.error.message
            : "Failed to load QR-ready classrooms."
        }
      />
    )
  }

  if (!draft || classroomOptions.length === 0) {
    return (
      <WorkflowStateCard message="No active QR + GPS classrooms are ready yet. Update a classroom to QR + GPS first." />
    )
  }

  return (
    <div style={workflowStyles.grid}>
      <WebSectionCard
        title="Start QR + GPS attendance"
        description="Choose the classroom, set time and distance, confirm browser location, and open the live teacher controls."
      >
        <div style={workflowStyles.grid}>
          {selectedClassroom ? (
            <div style={workflowStyles.rowCard}>
              <span style={workflowStyles.pill}>Selected classroom</span>
              <h3 style={{ margin: "12px 0 6px" }}>
                {selectedClassroom.classroomTitle} ({selectedClassroom.courseCode})
              </h3>
              <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
                {selectedClassroom.scopeSummary}
              </p>
              <p style={{ margin: "10px 0 0", color: "#475569", lineHeight: 1.6 }}>
                {selectedClassroom.attendanceModeLabel} · {selectedClassroom.deviceRuleLabel}
              </p>
            </div>
          ) : null}

          <div style={workflowStyles.formGrid}>
            <WorkflowSelectField
              label="Classroom"
              value={draft.classroomId}
              onChange={(value) => {
                setDraft(applyTeacherWebQrSessionClassroomSelection(classroomOptions, value))
                setLocationMessage(null)
                setStatusMessage(null)
              }}
              options={classroomOptions.map((classroom) => ({
                value: classroom.classroomId,
                label: `${classroom.classroomTitle} (${classroom.courseCode})`,
              }))}
            />
            <WorkflowField
              label="Session duration (minutes)"
              value={draft.sessionDurationMinutes}
              onChange={(value) =>
                setDraft((current) =>
                  current ? { ...current, sessionDurationMinutes: value } : current,
                )
              }
              type="number"
            />
            <WorkflowField
              label="Allowed distance (meters)"
              value={draft.gpsRadiusMeters}
              onChange={(value) =>
                setDraft((current) => (current ? { ...current, gpsRadiusMeters: value } : current))
              }
              type="number"
            />
          </div>

          <div style={workflowStyles.rowCard}>
            <strong style={{ display: "block", marginBottom: 8 }}>Teacher location</strong>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
              Use the current browser location before you start the session. Students will be
              checked against this location and the allowed distance above.
            </p>
            <p style={{ margin: "12px 0 0", color: "#0f172a", lineHeight: 1.6 }}>
              {draft.anchorLatitude && draft.anchorLongitude
                ? `Locked at ${draft.anchorLatitude}, ${draft.anchorLongitude}`
                : "Location not captured yet."}
            </p>
            {locationMessage ? (
              <p style={{ margin: "10px 0 0", color: "#1d4ed8", lineHeight: 1.6 }}>
                {locationMessage}
              </p>
            ) : null}
          </div>

          <div style={workflowStyles.buttonRow}>
            <button
              type="button"
              onClick={() => void useBrowserLocationAnchor()}
              disabled={isResolvingBrowserLocation}
              style={workflowStyles.secondaryButton}
            >
              {isResolvingBrowserLocation ? "Capturing location..." : "Use browser location"}
            </button>
            <button
              type="button"
              onClick={() => createQrSession.mutate()}
              disabled={createQrSession.isPending || !readiness.canStart}
              style={workflowStyles.primaryButton}
            >
              {createQrSession.isPending ? "Starting session..." : "Start QR session"}
            </button>
            <Link
              href={teacherWorkflowRoutes.sessionHistory}
              style={workflowStyles.secondaryButton}
            >
              Open session history
            </Link>
          </div>

          {!readiness.canStart && readiness.blockingMessage ? (
            <WorkflowBanner tone="info" message={readiness.blockingMessage} />
          ) : null}
          {statusMessage ? (
            <WorkflowBanner tone={statusMessage.tone} message={statusMessage.text} />
          ) : null}
        </div>
      </WebSectionCard>
    </div>
  )
}
