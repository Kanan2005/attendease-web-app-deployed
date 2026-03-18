"use client"

import type { AttendanceSessionStudentSummary } from "@attendease/contracts"
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

import { AuthApiClientError } from "@attendease/auth"
import {
  buildTeacherWebQrSessionStartRequest,
  buildTeacherWebQrSessionClassroomOptions,
  createTeacherWebQrSessionStartDraft,
  evaluateTeacherWebQrSessionStartReadiness,
} from "../teacher-qr-session-management"
import {
  buildTeacherWebSessionDetailOverviewModel,
  buildTeacherWebSessionDetailStatusModel,
  buildTeacherWebSessionRosterModel,
  mapTeacherWebReviewErrorToMessage,
} from "../teacher-review-workflows"
import { formatPortalDate, teacherWorkflowRoutes, webWorkflowQueryKeys } from "../web-workflows"

import {
  WorkflowBanner,
  WorkflowField,
  WorkflowStateCard,
  bootstrap,
  workflowStyles,
} from "./shared"
import { TeacherSessionHistoryDetail } from "./teacher-session-history-workspace/session-detail"

const LECTURE_SESSION_RADIUS_DEFAULT = 100

export function TeacherLectureSessionDetailWorkspace(props: {
  accessToken: string | null
  classroomId: string
  lectureId: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [statusMessage, setStatusMessage] = useState<{ tone: "info" | "danger"; text: string } | null>(null)
  const [locationMessage, setLocationMessage] = useState<string | null>(null)
  const [isResolvingBrowserLocation, setIsResolvingBrowserLocation] = useState(false)
  const [draft, setDraft] = useState<ReturnType<typeof createTeacherWebQrSessionStartDraft>>(null)
  const [correctionDraft, setCorrectionDraft] = useState<
    Record<string, AttendanceSessionStudentSummary["status"]>
  >({})

  const classroomQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomDetail(props.classroomId),
    enabled: Boolean(props.accessToken && props.classroomId),
    queryFn: () =>
      bootstrap.authClient.getClassroom(props.accessToken ?? "", props.classroomId),
  })

  const classroomsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classrooms({}),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listClassrooms(props.accessToken ?? "", {}),
  })

  const lecturesQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomLectures(props.classroomId),
    enabled: Boolean(props.accessToken && props.classroomId),
    queryFn: () =>
      bootstrap.authClient.listClassroomLectures(
        props.accessToken ?? "",
        props.classroomId,
      ),
  })

  const sessionsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.sessionHistory({ classroomId: props.classroomId }),
    enabled: Boolean(props.accessToken && props.classroomId),
    queryFn: () =>
      bootstrap.authClient.listAttendanceSessions(props.accessToken ?? "", {
        classroomId: props.classroomId,
      }),
  })

  const classroom = classroomQuery.data ?? null
  const classroomOptions = classroomsQuery.data
    ? buildTeacherWebQrSessionClassroomOptions(classroomsQuery.data)
    : []
  const lectures = lecturesQuery.data ?? []
  const lecture = lectures.find((l) => l.id === props.lectureId) ?? null
  const sessions = sessionsQuery.data ?? []
  const sessionForLecture = sessions.find((s) => s.lectureId === props.lectureId) ?? null

  useEffect(() => {
    if (!classroom || !classroomOptions.length || draft) return
    const nextDraft = createTeacherWebQrSessionStartDraft(
      classroomOptions,
      props.classroomId,
      props.lectureId,
    )
    if (nextDraft) {
      setDraft({
        ...nextDraft,
        gpsRadiusMeters: String(LECTURE_SESSION_RADIUS_DEFAULT),
      })
    }
  }, [classroom, classroomOptions, props.classroomId, props.lectureId, draft])

  useEffect(() => {
    if (sessionForLecture?.status === "ACTIVE") {
      router.replace(teacherWorkflowRoutes.activeSession(sessionForLecture.id))
    }
  }, [sessionForLecture?.id, sessionForLecture?.status, router])

  const selectedClassroom = draft
    ? classroomOptions.find((c) => c.classroomId === draft.classroomId) ?? null
    : null
  const readiness = evaluateTeacherWebQrSessionStartReadiness(draft, classroomOptions)

  async function useBrowserLocationAnchor() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatusMessage({
        tone: "danger",
        text: "Browser location is unavailable. Allow geolocation and try again.",
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
          setLocationMessage("Teacher location confirmed.")
          setIsResolvingBrowserLocation(false)
          resolve()
        },
        () => {
          setStatusMessage({
            tone: "danger",
            text: "Location request was denied. Allow location access and try again.",
          })
          setIsResolvingBrowserLocation(false)
          resolve()
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
      )
    })
  }

  const createQrSession = useMutation({
    mutationFn: async () => {
      if (!props.accessToken || !draft) {
        throw new Error("Teacher web access is required before starting QR attendance.")
      }
      const r = evaluateTeacherWebQrSessionStartReadiness(draft, classroomOptions)
      if (!r.canStart) {
        throw new Error(r.blockingMessage ?? "QR attendance setup is incomplete.")
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
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classroomLectures(props.classroomId),
        }),
      ])
      router.push(teacherWorkflowRoutes.activeSession(session.id))
    },
    onError: (error) => {
      let text = "Failed to start the attendance session."
      if (error instanceof AuthApiClientError) {
        const details = error.details as Record<string, unknown> | undefined
        text = typeof details?.message === "string" ? details.message : error.message
      } else if (error instanceof Error) {
        text = error.message
      }
      setStatusMessage({ tone: "danger", text })
    },
  })

  if (!props.accessToken) {
    return <WorkflowStateCard message="Sign in to view this lecture session." />
  }

  if (lecturesQuery.isLoading || (lecture && sessionsQuery.isLoading)) {
    return <WorkflowStateCard message="Loading lecture and sessions..." />
  }

  if (lecturesQuery.isError || sessionsQuery.isError) {
    return (
      <WorkflowBanner
        tone="danger"
        message={mapTeacherWebReviewErrorToMessage(
          lecturesQuery.error ?? sessionsQuery.error,
          "Could not load lecture or sessions.",
        )}
      />
    )
  }

  if (!lecture) {
    return (
      <WorkflowStateCard message="Lecture not found. It may have been removed or you may not have access." />
    )
  }

  if (sessionForLecture?.status === "ACTIVE") {
    return <WorkflowStateCard message="Redirecting to live session..." />
  }

  if (sessionForLecture) {
    return (
      <LectureSessionEndedView
        accessToken={props.accessToken}
        sessionId={sessionForLecture.id}
        classroomId={props.classroomId}
        lectureTitle={lecture.title ?? "Lecture"}
        onBackHref={teacherWorkflowRoutes.classroomLectures(props.classroomId)}
        correctionDraft={correctionDraft}
        setCorrectionDraft={setCorrectionDraft}
      />
    )
  }

  const hasLocation = Boolean(draft?.anchorLatitude && draft?.anchorLongitude)

  return (
    <div style={workflowStyles.grid}>
      <div>
        <Link
          href={teacherWorkflowRoutes.classroomLectures(props.classroomId)}
          aria-label="Back to Sessions"
          style={{
            fontSize: 14,
            color: webTheme.colors.textMuted,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            transition: `color ${webTheme.animation.fast}`,
          }}
          className="ui-back-link"
        >
          <span aria-hidden>←</span> Back to Sessions
        </Link>
      </div>

      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: webTheme.colors.text, letterSpacing: "-0.02em" }}>
          {lecture.title ?? "Lecture"}
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: webTheme.colors.textMuted }}>
          {formatPortalDate(lecture.lectureDate)}
        </p>
      </div>

      {draft && selectedClassroom ? (
        <div
          style={{
            borderRadius: webTheme.radius.card,
            border: `1px solid ${webTheme.colors.border}`,
            background: webTheme.colors.surfaceRaised,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "18px 24px", borderBottom: `1px solid ${webTheme.colors.border}`, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: webTheme.colors.accentSoft,
              border: `1px solid ${webTheme.colors.accentBorder}`,
              display: "grid",
              placeItems: "center",
              fontSize: 16,
              flexShrink: 0,
            }}>
              📡
            </div>
            <div>
              <h3 style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 600, color: webTheme.colors.text }}>
                Start attendance session
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: webTheme.colors.textMuted }}>
                Set the GPS radius and capture your location. Students must be within range to mark attendance.
              </p>
            </div>
          </div>

          <div style={{ padding: "20px 24px", display: "grid", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <WorkflowField
                  label="GPS radius (meters)"
                  value={draft.gpsRadiusMeters}
                  onChange={(value) =>
                    setDraft((current) => (current ? { ...current, gpsRadiusMeters: value } : current))
                  }
                  type="number"
                />
                <p style={{ margin: "4px 0 0", fontSize: 11, color: webTheme.colors.textSubtle }}>
                  Default: 100m. Students outside this radius will be rejected.
                </p>
              </div>
              <WorkflowField
                label="Duration (minutes)"
                value={draft.sessionDurationMinutes}
                onChange={(value) =>
                  setDraft((current) =>
                    current ? { ...current, sessionDurationMinutes: value } : current,
                  )
                }
                type="number"
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: 10,
                background: hasLocation ? webTheme.colors.successSoft : webTheme.colors.surfaceMuted,
                border: `1px solid ${hasLocation ? webTheme.colors.successBorder : webTheme.colors.border}`,
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: hasLocation ? webTheme.colors.success : webTheme.colors.surfaceTint,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 13,
                  color: hasLocation ? "#fff" : webTheme.colors.textSubtle,
                  flexShrink: 0,
                  fontWeight: 700,
                  transition: "all 0.2s ease",
                }}
              >
                {hasLocation ? "✓" : "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {hasLocation ? (
                  <span style={{ fontSize: 13, color: webTheme.colors.success, fontWeight: 500 }}>
                    Location locked — {draft.anchorLatitude}, {draft.anchorLongitude}
                  </span>
                ) : (
                  <span style={{ fontSize: 13, color: webTheme.colors.textMuted }}>
                    Capture your location so students check in nearby.
                  </span>
                )}
              </div>
              <button
                type="button"
                className="ui-secondary-btn"
                onClick={() => void useBrowserLocationAnchor()}
                disabled={isResolvingBrowserLocation}
                style={{
                  ...workflowStyles.secondaryButton,
                  padding: "7px 14px",
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {isResolvingBrowserLocation ? "Capturing..." : hasLocation ? "Re-capture" : "Capture location"}
              </button>
            </div>

            {locationMessage && !statusMessage ? (
              <div style={{ fontSize: 13, color: webTheme.colors.success, fontWeight: 500 }}>
                {locationMessage}
              </div>
            ) : null}

            {statusMessage ? (
              <WorkflowBanner tone={statusMessage.tone} message={statusMessage.text} />
            ) : null}
          </div>

          <div
            style={{
              padding: "14px 24px",
              borderTop: `1px solid ${webTheme.colors.border}`,
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              background: webTheme.colors.surfaceMuted,
            }}
          >
            <button
              type="button"
              className="ui-primary-btn"
              onClick={() => createQrSession.mutate()}
              disabled={createQrSession.isPending || !readiness.canStart}
              style={{
                ...workflowStyles.primaryButton,
                padding: "11px 28px",
                fontSize: 14,
              }}
            >
              {createQrSession.isPending ? "Starting session..." : "Start attendance"}
            </button>
          </div>
        </div>
      ) : (
        <WorkflowStateCard message="Loading session form..." />
      )}
    </div>
  )
}

function LectureSessionEndedView(props: {
  accessToken: string | null
  sessionId: string
  classroomId: string
  lectureTitle: string
  onBackHref: string
  correctionDraft: Record<string, AttendanceSessionStudentSummary["status"]>
  setCorrectionDraft: React.Dispatch<
    React.SetStateAction<Record<string, AttendanceSessionStudentSummary["status"]>>
  >
}) {
  const queryClient = useQueryClient()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const detailQuery = useQuery({
    queryKey: webWorkflowQueryKeys.attendanceSession(props.sessionId),
    enabled: Boolean(props.accessToken && props.sessionId),
    queryFn: () =>
      bootstrap.authClient.getAttendanceSessionDetail(
        props.accessToken ?? "",
        props.sessionId,
      ),
    refetchInterval: (query) =>
      getAttendanceCorrectionReviewPollInterval(query.state.data ?? null),
  })

  const studentsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.attendanceSessionStudents(props.sessionId),
    enabled: Boolean(props.accessToken && props.sessionId),
    queryFn: () =>
      bootstrap.authClient.listAttendanceSessionStudents(
        props.accessToken ?? "",
        props.sessionId,
      ),
    refetchInterval: getAttendanceCorrectionReviewPollInterval(detailQuery.data ?? null),
  })

  useEffect(() => {
    if (studentsQuery.data) {
      props.setCorrectionDraft(createAttendanceEditDraft(studentsQuery.data))
    }
  }, [studentsQuery.data])

  const saveManualEdits = useMutation({
    mutationFn: async () => {
      if (!props.accessToken || !props.sessionId || !studentsQuery.data) {
        throw new Error("Session and student data are required to save corrections.")
      }
      const changes = buildAttendanceEditChanges(studentsQuery.data, props.correctionDraft)
      if (changes.length === 0) throw new Error("No changes to save.")
      return bootstrap.authClient.updateAttendanceSessionAttendance(
        props.accessToken,
        props.sessionId,
        { changes },
      )
    },
    onSuccess: async (result) => {
      setStatusMessage(buildAttendanceCorrectionSaveMessage(result.appliedChangeCount))
      props.setCorrectionDraft(createAttendanceEditDraft(result.students))
      queryClient.setQueryData(
        webWorkflowQueryKeys.attendanceSession(props.sessionId),
        result.session,
      )
      queryClient.setQueryData(
        webWorkflowQueryKeys.attendanceSessionStudents(props.sessionId),
        result.students,
      )
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.sessionHistory(),
      })
    },
    onError: (error) => {
      setStatusMessage(
        mapTeacherWebReviewErrorToMessage(
          error,
          "AttendEase couldn't save the attendance changes.",
        ),
      )
    },
  })

  const detail = detailQuery.data ?? null
  const students = studentsQuery.data ?? []
  const pendingChanges = buildAttendanceEditChanges(students, props.correctionDraft)
  const rosterModel = buildTeacherWebSessionRosterModel({
    students,
    draft: props.correctionDraft,
    isEditable: Boolean(detail?.editability.isEditable),
  })
  const detailOverview = buildTeacherWebSessionDetailOverviewModel({
    session: detail ?? null,
    roster: rosterModel,
    pendingChangeCount: pendingChanges.length,
  })
  const detailStatus = buildTeacherWebSessionDetailStatusModel({
    session: detail ?? null,
    pendingChangeCount: pendingChanges.length,
  })

  return (
    <div style={workflowStyles.grid}>
      <div>
        <Link
          href={props.onBackHref}
          style={{
            fontSize: 14,
            color: webTheme.colors.textMuted,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            transition: `color ${webTheme.animation.fast}`,
          }}
          className="ui-back-link"
        >
          <span aria-hidden>←</span> Back to Sessions
        </Link>
      </div>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: webTheme.colors.text, letterSpacing: "-0.02em" }}>
          {props.lectureTitle}
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: webTheme.colors.textMuted }}>
          Session completed — review attendance and make corrections below.
        </p>
      </div>

      <TeacherSessionHistoryDetail
        selectedSessionId={props.sessionId}
        detailLoading={detailQuery.isLoading}
        studentsLoading={studentsQuery.isLoading}
        detailError={detailQuery.error}
        studentsError={studentsQuery.error}
        detail={detail}
        rosterModel={rosterModel}
        detailOverview={detailOverview}
        detailStatus={detailStatus}
        pendingChangesLength={pendingChanges.length}
        savePending={saveManualEdits.isPending}
        canSave={Boolean(detail?.editability.isEditable) && pendingChanges.length > 0}
        statusMessage={mapTeacherWebReviewErrorToMessage(
          detailQuery.error ?? studentsQuery.error,
          "Could not load session detail.",
        )}
        onSave={() => saveManualEdits.mutate()}
        onReset={() => props.setCorrectionDraft(createAttendanceEditDraft(students))}
        onToggleStatus={(attendanceRecordId, nextStatus) =>
          props.setCorrectionDraft((current) => ({
            ...current,
            [attendanceRecordId]: nextStatus,
          }))
        }
      />

      {statusMessage ? <WorkflowBanner tone="info" message={statusMessage} /> : null}
    </div>
  )
}
