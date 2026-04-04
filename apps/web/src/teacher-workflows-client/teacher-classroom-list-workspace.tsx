"use client"

import type { CourseOfferingStatus } from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import { useState } from "react"

import { buildTeacherWebClassroomListCards } from "../teacher-classroom-management"
import { teacherWorkflowRoutes, webWorkflowQueryKeys } from "../web-workflows"

import { WorkflowBanner, WorkflowStateCard, bootstrap, useAuthRedirect, workflowStyles } from "./shared"

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.06,
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
}

const cardHover = {
  y: -6,
  scale: 1.02,
  transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
}

export function TeacherClassroomListWorkspace(props: {
  accessToken: string | null
}) {
  useAuthRedirect(props.accessToken)

  const [statusFilter, setStatusFilter] = useState<CourseOfferingStatus | "ALL">("ALL")
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const classroomsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classrooms(
      statusFilter === "ALL" ? {} : { status: statusFilter },
    ),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listClassrooms(
        props.accessToken ?? "",
        statusFilter === "ALL" ? {} : { status: statusFilter },
      ),
  })

  const archiveMutation = useMutation({
    mutationFn: (classroomId: string) =>
      bootstrap.authClient.archiveClassroom(props.accessToken ?? "", classroomId),
    onSuccess: async () => {
      setConfirmDeleteId(null)
      await queryClient.invalidateQueries({ queryKey: webWorkflowQueryKeys.classrooms({}) })
    },
  })

  const classroomCards = classroomsQuery.data
    ? buildTeacherWebClassroomListCards(classroomsQuery.data.filter((c) => c.status !== "ARCHIVED"))
    : []

  return (
    <div style={{ display: "grid", gap: 28 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              color: webTheme.colors.text,
              letterSpacing: "-0.025em",
            }}
          >
            Classrooms
          </h1>
          {!classroomsQuery.isLoading ? (
            <span style={{ fontSize: 13, color: webTheme.colors.textSubtle }}>
              {classroomCards.length}
            </span>
          ) : null}
        </div>

        <Link
          href={teacherWorkflowRoutes.classroomCreate}
          className="ui-primary-btn"
          style={{
            ...workflowStyles.primaryButton,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "8px 18px",
            fontSize: 13,
            background: webTheme.gradients.accentButton,
            color: "#fff",
            boxShadow: webTheme.shadow.glow,
          }}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
          New classroom
        </Link>
      </div>

      {/* Auth redirect is handled by useAuthRedirect — no dead "sign in" card */}

      {classroomsQuery.isLoading ? (
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                borderRadius: 18,
                background: "var(--ae-card-surface)",
                border: "1px solid var(--ae-card-border)",
                height: 180,
              }}
            />
          ))}
        </div>
      ) : null}

      {classroomsQuery.isError ? (
        <WorkflowBanner
          tone="danger"
          message={
            classroomsQuery.error instanceof Error
              ? classroomsQuery.error.message
              : "Failed to load classrooms."
          }
        />
      ) : null}

      {classroomsQuery.data && classroomsQuery.data.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "72px 24px",
            color: webTheme.colors.textMuted,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: webTheme.colors.accentSoft,
              display: "inline-grid",
              placeItems: "center",
              fontSize: 24,
              marginBottom: 16,
            }}
          >
            📚
          </div>
          <p
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: webTheme.colors.text,
              marginTop: 0,
              marginBottom: 6,
            }}
          >
            No classrooms yet
          </p>
          <p style={{ margin: 0, fontSize: 14, maxWidth: 320, marginInline: "auto" }}>
            Create your first classroom to start managing attendance.
          </p>
        </div>
      ) : null}

      {classroomCards.length > 0 ? (
        <div style={workflowStyles.cardGrid}>
          <AnimatePresence>
            {classroomCards.map((classroom, index) => (
              <motion.div
                key={classroom.classroomId}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover={cardHover}
                style={{ height: "100%" }}
              >
                <div
                  className="ui-card-link"
                  style={{
                    borderRadius: 18,
                    border: "1px solid var(--ae-card-border)",
                    background: "var(--ae-card-surface)",
                    position: "relative",
                    overflow: "hidden",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "var(--ae-card-shadow)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "60%",
                      height: "60%",
                      background: "var(--ae-card-glow)",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    className="ui-card-accent-bar"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: webTheme.gradients.accentButton,
                      transition: "opacity 0.3s ease",
                    }}
                  />

                  <Link
                    href={teacherWorkflowRoutes.classroomDetail(classroom.classroomId)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                      padding: "24px 24px 0",
                      textDecoration: "none",
                      color: "inherit",
                      flex: 1,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          color: webTheme.colors.accent,
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          opacity: 0.7,
                        }}
                      >
                        {classroom.courseCode}
                      </span>
                      <h3
                        style={{
                          marginTop: 4,
                          marginRight: 0,
                          marginBottom: 0,
                          marginLeft: 0,
                          fontSize: 18,
                          fontWeight: 600,
                          color: webTheme.colors.text,
                          lineHeight: 1.3,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {classroom.classroomTitle}
                      </h3>
                    </div>

                    <p
                      style={{
                        margin: 0,
                        color: webTheme.colors.textMuted,
                        fontSize: 13,
                        lineHeight: 1.5,
                        flex: 1,
                      }}
                    >
                      {classroom.scopeSummary}
                    </p>
                  </Link>

                  <div
                    style={{
                      marginTop: "auto",
                      marginRight: 20,
                      marginBottom: 0,
                      marginLeft: 20,
                      height: 1,
                      background: "var(--ae-divider-gradient)",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 24px 16px",
                    }}
                  >
                    <div
                      style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
                    >
                      {/* v2.0: Removed attendanceModeLabel pill from here — mode is shown per-session in the lectures tab instead */}
                      <span style={workflowStyles.pill}>{classroom.statusLabel}</span>
                      {classroom.joinCodeLabel !== "No active join code" ? (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: webTheme.colors.textMuted,
                            fontFamily: "monospace",
                            letterSpacing: "0.04em",
                          }}
                          title="Join code"
                        >
                          {classroom.joinCodeLabel}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {confirmDeleteId === classroom.classroomId ? (
                        <>
                          <span style={{ fontSize: 12, color: webTheme.colors.danger }}>
                            Archive?
                          </span>
                          <button
                            type="button"
                            onClick={() => archiveMutation.mutate(classroom.classroomId)}
                            disabled={archiveMutation.isPending}
                            style={{
                              background: webTheme.colors.danger,
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              padding: "4px 12px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: archiveMutation.isPending ? "not-allowed" : "pointer",
                            }}
                          >
                            {archiveMutation.isPending ? "..." : "Yes"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            style={{
                              background: webTheme.colors.surfaceMuted,
                              color: webTheme.colors.text,
                              border: `1px solid ${webTheme.colors.border}`,
                              borderRadius: 6,
                              padding: "4px 12px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            No
                          </button>
                        </>
                      ) : classroom.canArchive ? (
                        <button
                          type="button"
                          title="Archive classroom"
                          aria-label={`Archive classroom ${classroom.classroomTitle}`}
                          onClick={() => setConfirmDeleteId(classroom.classroomId)}
                          className="ui-danger-action"
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "6px 8px",
                            borderRadius: 8,
                            color: webTheme.colors.textMuted,
                            fontSize: 16,
                            lineHeight: 1,
                          }}
                        >
                          🗑
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {archiveMutation.isError && confirmDeleteId === classroom.classroomId ? (
                    <div
                      style={{
                        padding: "0 24px 12px",
                        fontSize: 12,
                        color: webTheme.colors.danger,
                      }}
                    >
                      {archiveMutation.error instanceof Error
                        ? archiveMutation.error.message
                        : "Failed to delete."}
                    </div>
                  ) : null}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : null}
    </div>
  )
}
