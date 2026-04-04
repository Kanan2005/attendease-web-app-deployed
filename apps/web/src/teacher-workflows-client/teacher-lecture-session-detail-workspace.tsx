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
  buildTeacherWebQrSessionClassroomOptions,
  buildTeacherWebQrSessionStartRequest,
  createTeacherWebQrSessionStartDraft,
  evaluateTeacherWebQrSessionStartReadiness,
} from "../teacher-qr-session-management"
import {
  buildTeacherWebSessionDetailOverviewModel,
  buildTeacherWebSessionDetailStatusModel,
  buildTeacherWebSessionRosterModel,
  mapTeacherWebReviewErrorToMessage,
} from "../teacher-review-workflows"
import {
  formatPortalDate,
  formatPortalDateTime,
  teacherWorkflowRoutes,
  webWorkflowQueryKeys,
} from "../web-workflows"

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
  const [statusMessage, setStatusMessage] = useState<{
    tone: "info" | "danger"
    text: string
  } | null>(null)
  const [startingPhase, setStartingPhase] = useState<"idle" | "locating" | "starting">("idle")
  const [draft, setDraft] = useState<ReturnType<typeof createTeacherWebQrSessionStartDraft>>(null)
  const [correctionDraft, setCorrectionDraft] = useState<
    Record<string, AttendanceSessionStudentSummary["status"]>
  >({})

  const classroomQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomDetail(props.classroomId),
    enabled: Boolean(props.accessToken && props.classroomId),
    queryFn: () => bootstrap.authClient.getClassroom(props.accessToken ?? "", props.classroomId),
  })

  const classroomsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classrooms({}),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listClassrooms(props.accessToken ?? "", {}),
  })

  const lecturesQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomLectures(props.classroomId),
    enabled: Boolean(props.accessToken && props.classroomId),
    queryFn: () =>
      bootstrap.authClient.listClassroomLectures(props.accessToken ?? "", props.classroomId),
  })

  const sessionsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.sessionHistory({ classroomId: props.classroomId }),
    enabled: Boolean(props.accessToken && props.classroomId),
    queryFn: () =>
      bootstrap.authClient.listAttendanceSessions(props.accessToken ?? "", {
        classroomId: props.classroomId,
      }),
    refetchInterval: 5_000,
  })

  const classroom = classroomQuery.data ?? null
  const classroomOptions = classroomsQuery.data
    ? buildTeacherWebQrSessionClassroomOptions(classroomsQuery.data)
    : []
  const lectures = lecturesQuery.data ?? []
  const lecture = lectures.find((l) => l.id === props.lectureId) ?? null
  const sessions = sessionsQuery.data ?? []
  const sessionForLecture = sessions.find((s) => s.lectureId === props.lectureId) ?? null
  const activeClassroomSession =
    sessionForLecture?.status === "ACTIVE"
      ? sessionForLecture
      : (sessions.find((s) => s.status === "ACTIVE") ?? null)

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

  const selectedClassroom = draft
    ? (classroomOptions.find((c) => c.classroomId === draft.classroomId) ?? null)
    : null

  function captureLocationCoords(): Promise<{ lat: string; lng: string } | null> {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatusMessage({
        tone: "danger",
        text: "Browser location is unavailable. Allow geolocation and try again.",
      })
      return Promise.resolve(null)
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6),
          })
        },
        () => {
          setStatusMessage({
            tone: "danger",
            text: "Location request was denied. Allow location access and try again.",
          })
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
      )
    })
  }

  const createQrSession = useMutation({
    mutationFn: async (draftToUse: NonNullable<typeof draft>) => {
      if (!props.accessToken) {
        throw new Error("Teacher web access is required before starting QR attendance.")
      }
      const r = evaluateTeacherWebQrSessionStartReadiness(draftToUse, classroomOptions)
      if (!r.canStart) {
        throw new Error(r.blockingMessage ?? "QR attendance setup is incomplete.")
      }
      return bootstrap.authClient.createQrAttendanceSession(
        props.accessToken,
        buildTeacherWebQrSessionStartRequest(draftToUse),
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
      setStartingPhase("idle")
      setStatusMessage({ tone: "danger", text })
    },
  })

  async function handleStartAttendance() {
    if (!draft) return
    setStatusMessage(null)

    let finalDraft = draft
    if (!draft.anchorLatitude || !draft.anchorLongitude) {
      setStartingPhase("locating")
      const coords = await captureLocationCoords()
      if (!coords) {
        setStartingPhase("idle")
        return
      }
      finalDraft = { ...draft, anchorLatitude: coords.lat, anchorLongitude: coords.lng }
      setDraft(finalDraft)
    }

    setStartingPhase("starting")
    createQrSession.mutate(finalDraft)
  }

  const canInitiateStart = Boolean(
    draft &&
      draft.sessionDurationMinutes &&
      Number(draft.sessionDurationMinutes) > 0 &&
      draft.gpsRadiusMeters &&
      Number(draft.gpsRadiusMeters) > 0,
  )

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

  if (sessionForLecture && sessionForLecture.status !== "ACTIVE") {
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
        <h2
          style={{
            margin: "0 0 4px",
            fontSize: 22,
            fontWeight: 700,
            color: webTheme.colors.text,
            letterSpacing: "-0.02em",
          }}
        >
          {lecture.title ?? "Lecture"}
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: webTheme.colors.textMuted }}>
          {formatPortalDate(lecture.lectureDate)}
          {lecture.createdAt ? (
            <span style={{ marginLeft: 12, opacity: 0.7 }}>
              Created {formatPortalDateTime(lecture.createdAt)}
            </span>
          ) : null}
        </p>
      </div>

      {sessionForLecture?.status === "ACTIVE" && sessionForLecture.mode === "QR_GPS" ? (
        <Link
          href={teacherWorkflowRoutes.activeSession(sessionForLecture.id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 20px",
            borderRadius: webTheme.radius.card,
            background: webTheme.colors.accentSoft,
            border: `1px solid ${webTheme.colors.accentBorder}`,
            textDecoration: "none",
            color: webTheme.colors.text,
            transition: "all 0.2s ease",
          }}
          className="ui-card-link"
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: webTheme.gradients.accentButton,
              display: "grid",
              placeItems: "center",
              fontSize: 14,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            📡
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: webTheme.colors.text }}>
              Attendance session is live
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: webTheme.colors.textMuted }}>
              Tap to open the QR session view
            </p>
          </div>
          <span
            style={{
              fontSize: 18,
              color: webTheme.colors.accent,
              flexShrink: 0,
            }}
            aria-hidden
          >
            →
          </span>
        </Link>
      ) : sessionForLecture?.status === "ACTIVE" ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 20px",
            borderRadius: webTheme.radius.card,
            background: webTheme.colors.accentSoft,
            border: `1px solid ${webTheme.colors.accentBorder}`,
            color: webTheme.colors.text,
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: webTheme.gradients.accentButton,
              display: "grid",
              placeItems: "center",
              fontSize: 14,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {sessionForLecture.mode === "BLUETOOTH" ? "📶" : "📡"}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: webTheme.colors.text }}>
              {sessionForLecture.mode === "BLUETOOTH" ? "Bluetooth" : "Attendance"} session is live
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: webTheme.colors.textMuted }}>
              {sessionForLecture.mode === "BLUETOOTH"
                ? "This session was started from the mobile app. Manage it from there."
                : "An attendance session is active for this lecture."}
            </p>
          </div>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: 999,
              background: webTheme.colors.success,
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            LIVE
          </span>
        </div>
      ) : null}

      {activeClassroomSession && !sessionForLecture ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 20px",
            borderRadius: webTheme.radius.card,
            background: webTheme.colors.warningSoft,
            border: `1px solid ${webTheme.colors.warningBorder}`,
            color: webTheme.colors.text,
          }}
        >
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: webTheme.colors.text }}>
              Another session is already active in this classroom
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: webTheme.colors.textMuted }}>
              {activeClassroomSession.mode === "BLUETOOTH"
                ? "A Bluetooth session is running from the mobile app."
                : "A QR+GPS session is active for another lecture."}{" "}
              End it first before starting a new one.
            </p>
          </div>
        </div>
      ) : null}

      {!activeClassroomSession ? (
        draft && selectedClassroom ? (
          <div
            style={{
              borderRadius: 16,
              border: "1px solid var(--ae-card-border)",
              background: "var(--ae-card-surface)",
              boxShadow: "var(--ae-card-shadow)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background: "var(--ae-card-glow)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid var(--ae-card-border)",
                position: "relative",
                zIndex: 1,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: webTheme.colors.accentSoft,
                  border: `1px solid ${webTheme.colors.accentBorder}`,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                📡
              </div>
              <div>
                <h3
                  style={{
                    margin: "0 0 2px",
                    fontSize: 15,
                    fontWeight: 600,
                    color: webTheme.colors.text,
                  }}
                >
                  Start attendance session
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: webTheme.colors.textMuted }}>
                  Configure GPS radius and duration. Your location is captured when you start.
                </p>
              </div>
            </div>

            <div style={{ padding: "20px 24px", display: "grid", gap: 20, position: "relative", zIndex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
                <div>
                  <WorkflowField
                    label="GPS radius (meters)"
                    value={draft.gpsRadiusMeters}
                    onChange={(value) =>
                      setDraft((current) =>
                        current ? { ...current, gpsRadiusMeters: value } : current,
                      )
                    }
                    type="number"
                  />
                  <p style={{ margin: "6px 0 0", fontSize: 11, color: webTheme.colors.textSubtle }}>
                    Default: 100m. Students outside this radius will be rejected.
                  </p>
                </div>
                <div>
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
                  <p style={{ margin: "6px 0 0", fontSize: 11, color: webTheme.colors.textSubtle }}>
                    How long the QR code stays active for check-ins.
                  </p>
                </div>
              </div>

              {hasLocation ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: webTheme.colors.successSoft,
                    border: `1px solid ${webTheme.colors.successBorder}`,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: webTheme.colors.success,
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </span>
                  <span style={{ fontSize: 13, color: webTheme.colors.success, fontWeight: 500 }}>
                    Location locked — {draft.anchorLatitude}, {draft.anchorLongitude}
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: webTheme.colors.surfaceMuted,
                    border: `1px solid ${webTheme.colors.border}`,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: webTheme.colors.surfaceTint,
                      color: webTheme.colors.textSubtle,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    📍
                  </span>
                  <span style={{ fontSize: 13, color: webTheme.colors.textMuted }}>
                    Your location is captured automatically when you start.
                  </span>
                </div>
              )}

              {statusMessage ? (
                <WorkflowBanner tone={statusMessage.tone} message={statusMessage.text} />
              ) : null}

              <button
                type="button"
                className="ui-primary-btn"
                onClick={() => void handleStartAttendance()}
                disabled={startingPhase !== "idle" || !canInitiateStart}
                style={{
                  ...workflowStyles.primaryButton,
                  padding: "13px 28px",
                  fontSize: 14,
                  width: "100%",
                }}
              >
                {startingPhase === "locating"
                  ? "Capturing location..."
                  : startingPhase === "starting"
                    ? "Starting session..."
                    : "Start attendance"}
              </button>
            </div>
          </div>
        ) : (
          <WorkflowStateCard message="Loading session form..." />
        )
      ) : null}
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
      bootstrap.authClient.getAttendanceSessionDetail(props.accessToken ?? "", props.sessionId),
    refetchInterval: (query) => getAttendanceCorrectionReviewPollInterval(query.state.data ?? null),
  })

  const studentsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.attendanceSessionStudents(props.sessionId),
    enabled: Boolean(props.accessToken && props.sessionId),
    queryFn: () =>
      bootstrap.authClient.listAttendanceSessionStudents(props.accessToken ?? "", props.sessionId),
    refetchInterval: getAttendanceCorrectionReviewPollInterval(detailQuery.data ?? null),
  })

  useEffect(() => {
    if (studentsQuery.data) {
      props.setCorrectionDraft(createAttendanceEditDraft(studentsQuery.data))
    }
  }, [studentsQuery.data, props.setCorrectionDraft])

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
        <h2
          style={{
            margin: "0 0 4px",
            fontSize: 22,
            fontWeight: 700,
            color: webTheme.colors.text,
            letterSpacing: "-0.02em",
          }}
        >
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
