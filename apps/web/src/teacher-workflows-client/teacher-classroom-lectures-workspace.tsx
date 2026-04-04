"use client"

import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import React, { useEffect, useState } from "react"

import { createWebAuthBootstrap } from "../auth"
// v2.0: Imported to display attendance mode (QR+GPS / Bluetooth / Manual) per lecture session row
import { formatTeacherWebAttendanceModeLabel } from "../teacher-classroom-management"
import {
  formatPortalDateTime,
  teacherWorkflowRoutes,
  webWorkflowQueryKeys,
} from "../web-workflows"

import { WorkflowBanner, WorkflowField, WorkflowStateCard, workflowStyles } from "./shared"

const bootstrap = createWebAuthBootstrap()

function toLocalDateTimeString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const h = String(date.getHours()).padStart(2, "0")
  const min = String(date.getMinutes()).padStart(2, "0")
  return `${y}-${m}-${d}T${h}:${min}`
}

export function TeacherClassroomLecturesWorkspace(props: {
  accessToken: string | null
  classroomId: string
}) {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [createTitle, setCreateTitle] = useState("")
  const [titleSeeded, setTitleSeeded] = useState(false)
  const [createDate, setCreateDate] = useState(() => toLocalDateTimeString(new Date()))

  const lecturesQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomLectures(props.classroomId),
    enabled: Boolean(props.accessToken),
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

  const lectures = lecturesQuery.data ?? []
  const sessions = sessionsQuery.data ?? []
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const deleteLecture = useMutation({
    mutationFn: (lectureId: string) => {
      if (!props.accessToken) throw new Error("Sign in to delete lectures.")
      return bootstrap.authClient.deleteClassroomLecture(
        props.accessToken,
        props.classroomId,
        lectureId,
      )
    },
    onSuccess: async () => {
      setConfirmDeleteId(null)
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.classroomLectures(props.classroomId),
      })
    },
  })

  const createLecture = useMutation({
    mutationFn: async () => {
      if (!props.accessToken) {
        throw new Error("Sign in to create a lecture.")
      }
      const title = createTitle.trim() || `Lecture ${lectures.length + 1}`
      return bootstrap.authClient.createClassroomLecture(props.accessToken, props.classroomId, {
        title,
        lectureDate: `${createDate.split("T")[0] ?? createDate}T00:00:00.000Z`,
      })
    },
    onSuccess: async () => {
      setShowCreate(false)
      setCreateTitle("")
      setTitleSeeded(false)
      setCreateDate(toLocalDateTimeString(new Date()))
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.classroomLectures(props.classroomId),
      })
    },
  })

  if (!props.accessToken) {
    return <WorkflowStateCard message="Sign in to view and create lectures." />
  }

  const isLoading = lecturesQuery.isLoading
  const error = lecturesQuery.error

  return (
    <div style={workflowStyles.grid}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: webTheme.colors.text,
              letterSpacing: "-0.02em",
            }}
          >
            Sessions
          </h2>
          <span style={{ fontSize: 13, color: webTheme.colors.textSubtle }}>
            {lectures.length}
          </span>
        </div>
        <button
          type="button"
          className="ui-primary-btn"
          onClick={() => {
            const next = !showCreate
            setShowCreate(next)
            if (next) {
              setCreateDate(toLocalDateTimeString(new Date()))
              if (!titleSeeded) {
                setCreateTitle(`Lecture ${lectures.length + 1}`)
                setTitleSeeded(true)
              }
            }
          }}
          style={{
            ...workflowStyles.primaryButton,
            padding: "8px 18px",
            fontSize: 13,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
          New lecture
        </button>
      </div>

      {showCreate ? (
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 16,
            border: "1px solid var(--ae-card-border)",
            background: "var(--ae-card-surface)",
            boxShadow: "var(--ae-card-shadow)",
            padding: "20px 24px",
            display: "grid",
            gap: 16,
            gridTemplateColumns: "1fr 1fr",
            alignItems: "end",
          }}
        >
          <WorkflowField
            label="Lecture title"
            value={createTitle}
            onChange={setCreateTitle}
            placeholder="e.g. Week 3 – Introduction"
          />
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: webTheme.colors.textMuted,
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Date &amp; time
            </div>
            <div
              style={{
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid var(--ae-card-border)",
                background: "var(--ae-surface-muted, rgba(0,0,0,0.03))",
                fontSize: 14,
                color: webTheme.colors.textMuted,
              }}
            >
              {formatPortalDateTime(new Date().toISOString())}
            </div>
          </div>
          <div
            style={{ gridColumn: "1 / -1", display: "flex", gap: 10, justifyContent: "flex-end" }}
          >
            <button
              type="button"
              className="ui-secondary-btn"
              onClick={() => setShowCreate(false)}
              style={workflowStyles.secondaryButton}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ui-primary-btn"
              onClick={() => createLecture.mutate()}
              disabled={createLecture.isPending}
              style={workflowStyles.primaryButton}
            >
              {createLecture.isPending ? "Creating..." : "Create lecture"}
            </button>
          </div>
          {createLecture.isError ? (
            <p
              style={{
                gridColumn: "1 / -1",
                margin: 0,
                fontSize: 13,
                color: webTheme.colors.danger,
              }}
            >
              {createLecture.error instanceof Error
                ? createLecture.error.message
                : "Failed to create lecture."}
            </p>
          ) : null}
        </div>
      ) : null}

      <LectureSuccessBanner show={createLecture.isSuccess && !showCreate} />

      {error ? (
        <WorkflowBanner
          tone="danger"
          message={error instanceof Error ? error.message : "Failed to load lectures."}
        />
      ) : null}

      {isLoading ? (
        <div
          style={{
            display: "grid",
            gap: 1,
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid var(--ae-card-border)",
            boxShadow: "var(--ae-card-shadow)",
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: 68, background: "var(--ae-card-surface)" }}
            />
          ))}
        </div>
      ) : lectures.length === 0 ? (
        <div
          style={{ textAlign: "center", padding: "56px 24px", color: webTheme.colors.textMuted }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: webTheme.colors.accentSoft,
              display: "inline-grid",
              placeItems: "center",
              fontSize: 20,
              marginBottom: 14,
            }}
          >
            📋
          </div>
          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: webTheme.colors.text,
              margin: "0 0 4px",
            }}
          >
            No lectures yet
          </p>
          <p style={{ margin: 0, fontSize: 14 }}>Create your first lecture to start.</p>
        </div>
      ) : (
        <>
        <style>{`@keyframes ae-live-pulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.5)}70%{box-shadow:0 0 0 7px rgba(34,197,94,0)}}`}</style>
        <div
          style={{
            position: "relative",
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid var(--ae-card-border)",
            boxShadow: "var(--ae-card-shadow)",
          }}
        >
          {/* Glow overlay */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--ae-card-glow)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          {lectures.map((lecture, index) => {
            const sessionForLecture = sessions.find((s) => s.lectureId === lecture.id)
            const isLive = sessionForLecture?.status === "ACTIVE"
            const isEnded = sessionForLecture?.status === "ENDED"
            const total =
              sessionForLecture != null
                ? sessionForLecture.presentCount + sessionForLecture.absentCount
                : 0
            const attendancePct =
              total > 0 && sessionForLecture
                ? Math.round((sessionForLecture.presentCount / total) * 100)
                : null
            const detailHref = teacherWorkflowRoutes.lectureSession(props.classroomId, lecture.id)
            const hasSession = isLive || isEnded || attendancePct != null
            const lectureNumber = lectures.length - index

            return (
              <React.Fragment key={lecture.id}>
              <Link
                href={detailHref}
                className="ui-row-link"
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px 20px",
                  background: "var(--ae-card-surface)",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "background 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: isLive
                        ? webTheme.colors.successSoft
                        : hasSession
                          ? webTheme.colors.successSoft
                          : "rgba(167, 139, 250, 0.06)",
                      border: `1px solid ${hasSession ? webTheme.colors.successBorder : "var(--ae-card-border)"}`,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: hasSession ? webTheme.colors.success : webTheme.colors.accent,
                      flexShrink: 0,
                      opacity: hasSession ? 1 : 0.6,
                      ...(isLive ? { animation: "ae-live-pulse 2s ease-in-out infinite" } : {}),
                    }}
                  >
                    {lectureNumber}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: webTheme.colors.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {lecture.title ?? `Lecture ${lectureNumber}`}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: webTheme.colors.textMuted,
                        marginTop: 2,
                      }}
                    >
                      {sessionForLecture?.startedAt
                        ? formatPortalDateTime(sessionForLecture.startedAt)
                        : `Created at ${formatPortalDateTime(lecture.createdAt)}`}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {isLive ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          color: "#fff",
                          background: webTheme.colors.success,
                          borderRadius: 999,
                          padding: "3px 10px",
                          textTransform: "uppercase",
                        }}
                      >
                        Live
                      </span>
                      {sessionForLecture ? (
                        <>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              color: webTheme.colors.textMuted,
                              background: "rgba(167, 139, 250, 0.08)",
                              border: "1px solid rgba(167, 139, 250, 0.15)",
                              borderRadius: 999,
                              padding: "2px 9px",
                              backdropFilter: "blur(6px)",
                            }}
                          >
                            {formatTeacherWebAttendanceModeLabel(sessionForLecture.mode)}
                          </span>
                          <span style={{ fontSize: 12, color: webTheme.colors.textMuted }}>
                            {sessionForLecture.presentCount}/{total}
                          </span>
                        </>
                      ) : null}
                    </div>
                  ) : hasSession && sessionForLecture ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: webTheme.colors.textMuted,
                          background: "rgba(167, 139, 250, 0.08)",
                          border: "1px solid rgba(167, 139, 250, 0.15)",
                          borderRadius: 999,
                          padding: "2px 9px",
                          backdropFilter: "blur(6px)",
                        }}
                      >
                        {formatTeacherWebAttendanceModeLabel(sessionForLecture.mode)}
                      </span>
                      {total > 0 ? (
                        <>
                          <span style={{ fontSize: 12, color: webTheme.colors.textMuted }}>
                            {sessionForLecture.presentCount}/{total}
                          </span>
                          {attendancePct != null ? (
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color:
                                  attendancePct >= 75
                                    ? webTheme.colors.success
                                    : attendancePct >= 50
                                      ? webTheme.colors.warning
                                      : webTheme.colors.danger,
                                padding: "3px 10px",
                                borderRadius: 999,
                                background:
                                  attendancePct >= 75
                                    ? webTheme.colors.successSoft
                                    : attendancePct >= 50
                                      ? webTheme.colors.warningSoft
                                      : webTheme.colors.dangerSoft,
                                border: `1px solid ${
                                  attendancePct >= 75
                                    ? webTheme.colors.successBorder
                                    : attendancePct >= 50
                                      ? webTheme.colors.warningBorder
                                      : webTheme.colors.dangerBorder
                                }`,
                              }}
                            >
                              {attendancePct}%
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: "0.03em",
                            color: webTheme.colors.textMuted,
                            padding: "3px 10px",
                            borderRadius: 999,
                            background: webTheme.colors.surfaceMuted,
                            border: `1px solid ${webTheme.colors.border}`,
                          }}
                        >
                          Completed
                        </span>
                      )}
                    </div>
                  ) : (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: webTheme.colors.textSubtle,
                        padding: "3px 10px",
                        borderRadius: 999,
                        background: "rgba(167, 139, 250, 0.05)",
                        border: "1px solid var(--ae-card-border)",
                      }}
                    >
                      Not taken
                    </span>
                  )}
                  {!hasSession ? (
                    confirmDeleteId === lecture.id ? (
                      <div
                        onClick={(e) => e.preventDefault()}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 6px 4px 10px",
                          borderRadius: 8,
                          background: webTheme.colors.dangerSoft,
                          border: `1px solid ${webTheme.colors.dangerBorder}`,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: webTheme.colors.danger,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Delete?
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            deleteLecture.mutate(lecture.id)
                          }}
                          className="ui-danger-action"
                          style={{
                            border: "none",
                            borderRadius: 6,
                            padding: "3px 10px",
                            background: webTheme.colors.danger,
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {deleteLecture.isPending ? "..." : "Confirm"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            setConfirmDeleteId(null)
                          }}
                          className="ui-secondary-btn"
                          style={{
                            border: `1px solid var(--ae-card-border)`,
                            borderRadius: 6,
                            padding: "3px 10px",
                            background: "var(--ae-card-surface)",
                            color: webTheme.colors.textMuted,
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          setConfirmDeleteId(lecture.id)
                        }}
                        className="ui-danger-action"
                        aria-label={`Delete ${lecture.title ?? `Lecture ${lectureNumber}`}`}
                        style={{
                          width: 30,
                          height: 30,
                          display: "grid",
                          placeItems: "center",
                          border: `1px solid var(--ae-card-border)`,
                          borderRadius: 8,
                          padding: 0,
                          background: "transparent",
                          color: webTheme.colors.textSubtle,
                          fontSize: 14,
                          cursor: "pointer",
                          transition: `all ${webTheme.animation.fast}`,
                        }}
                      >
                        🗑
                      </button>
                    )
                  ) : null}
                  <span style={{ fontSize: 14, color: webTheme.colors.textSubtle }}>›</span>
                </div>
              </Link>
              {index < lectures.length - 1 ? (
                <div
                  aria-hidden
                  style={{
                    height: 1,
                    background: "var(--ae-divider-gradient)",
                    marginRight: 20,
                    marginLeft: 20,
                    position: "relative",
                    zIndex: 1,
                  }}
                />
              ) : null}
            </React.Fragment>
          )
          })}
        </div>
        </>
      )}
    </div>
  )
}

function LectureSuccessBanner(props: { show: boolean }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (props.show) {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 3000)
      return () => clearTimeout(timer)
    }
    setVisible(false)
  }, [props.show])

  if (!visible) return null
  return <WorkflowBanner tone="info" message="Lecture created successfully." />
}
