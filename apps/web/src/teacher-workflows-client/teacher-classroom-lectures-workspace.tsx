"use client"

import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useEffect, useState } from "react"

import { createWebAuthBootstrap } from "../auth"
import { formatPortalDate, teacherWorkflowRoutes, webWorkflowQueryKeys } from "../web-workflows"

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
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: webTheme.colors.text,
              letterSpacing: "-0.02em",
            }}
          >
            Sessions
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: webTheme.colors.textMuted }}>
            {lectures.length} lecture{lectures.length !== 1 ? "s" : ""} created
          </p>
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
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          New lecture
        </button>
      </div>

      {showCreate ? (
        <div
          style={{
            borderRadius: webTheme.radius.card,
            border: `1px solid ${webTheme.colors.accentBorder}`,
            background: webTheme.colors.surfaceRaised,
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
          <WorkflowField
            label="Date & time"
            value={createDate}
            onChange={setCreateDate}
            type="datetime-local"
          />
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
            borderRadius: webTheme.radius.card,
            overflow: "hidden",
            border: `1px solid ${webTheme.colors.border}`,
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: 68, background: webTheme.colors.surfaceRaised }}
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
        <div
          style={{
            borderRadius: webTheme.radius.card,
            overflow: "hidden",
            border: `1px solid ${webTheme.colors.border}`,
          }}
        >
          {lectures.map((lecture, index) => {
            const sessionForLecture = sessions.find((s) => s.lectureId === lecture.id)
            const total =
              sessionForLecture != null
                ? sessionForLecture.presentCount + sessionForLecture.absentCount
                : 0
            const attendancePct =
              total > 0 && sessionForLecture
                ? Math.round((sessionForLecture.presentCount / total) * 100)
                : null
            const detailHref = teacherWorkflowRoutes.lectureSession(props.classroomId, lecture.id)
            const hasSession = attendancePct != null
            const durationMin =
              sessionForLecture?.startedAt && sessionForLecture.endedAt
                ? Math.round(
                    (new Date(sessionForLecture.endedAt).getTime() -
                      new Date(sessionForLecture.startedAt).getTime()) /
                      60_000,
                  )
                : null

            return (
              <Link
                key={lecture.id}
                href={detailHref}
                className="ui-row-link"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px 20px",
                  background: webTheme.colors.surfaceRaised,
                  textDecoration: "none",
                  color: "inherit",
                  borderBottom:
                    index < lectures.length - 1 ? `1px solid ${webTheme.colors.border}` : "none",
                  transition: `background ${webTheme.animation.fast}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: hasSession
                        ? webTheme.colors.successSoft
                        : webTheme.colors.surfaceMuted,
                      border: `1px solid ${hasSession ? webTheme.colors.successBorder : webTheme.colors.border}`,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: hasSession ? webTheme.colors.success : webTheme.colors.textSubtle,
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
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
                      {lecture.title ?? `Lecture ${index + 1}`}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: webTheme.colors.textMuted,
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>{formatPortalDate(lecture.lectureDate)}</span>
                      {hasSession && durationMin != null ? (
                        <>
                          <span style={{ color: webTheme.colors.textSubtle }}>·</span>
                          <span>{durationMin} min</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {hasSession && sessionForLecture ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: webTheme.colors.textMuted }}>
                        {sessionForLecture.presentCount}/{total}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: webTheme.colors.success,
                          padding: "3px 10px",
                          borderRadius: 999,
                          background: webTheme.colors.successSoft,
                          border: `1px solid ${webTheme.colors.successBorder}`,
                        }}
                      >
                        {attendancePct}%
                      </span>
                    </div>
                  ) : (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: webTheme.colors.textSubtle,
                        padding: "3px 10px",
                        borderRadius: 999,
                        background: webTheme.colors.surfaceMuted,
                        border: `1px solid ${webTheme.colors.border}`,
                      }}
                    >
                      Not taken
                    </span>
                  )}
                  {!hasSession ? (
                    confirmDeleteId === lecture.id ? (
                      <fieldset
                        style={{
                          display: "inline-flex",
                          gap: 4,
                          alignItems: "center",
                          border: "none",
                          margin: 0,
                          padding: 0,
                          minWidth: 0,
                        }}
                      >
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
                            padding: "4px 10px",
                            background: webTheme.colors.dangerSoft,
                            color: webTheme.colors.danger,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {deleteLecture.isPending ? "..." : "Yes"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            setConfirmDeleteId(null)
                          }}
                          className="ui-secondary-btn"
                          style={{
                            border: "none",
                            borderRadius: 6,
                            padding: "4px 10px",
                            background: webTheme.colors.surfaceMuted,
                            color: webTheme.colors.textMuted,
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                        >
                          No
                        </button>
                      </fieldset>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          setConfirmDeleteId(lecture.id)
                        }}
                        className="ui-danger-action"
                        aria-label={`Delete ${lecture.title ?? `Lecture ${index + 1}`}`}
                        style={{
                          border: "none",
                          borderRadius: 6,
                          padding: "4px 8px",
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
            )
          })}
        </div>
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
