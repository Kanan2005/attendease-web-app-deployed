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
import { AnimatePresence, motion } from "framer-motion"
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

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  }),
}

export function TeacherClassroomListWorkspace(props: {
  accessToken: string | null
}) {
  const [statusFilter, setStatusFilter] = useState<CourseOfferingStatus | "ALL">("ALL")

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

  const classroomCards = classroomsQuery.data
    ? buildTeacherWebClassroomListCards(classroomsQuery.data)
    : []

  return (
    <div style={{ display: "grid", gap: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 700,
              color: webTheme.colors.text,
              letterSpacing: "-0.02em",
            }}
          >
            Your classrooms
          </h1>
          <p style={{ margin: "8px 0 0", color: webTheme.colors.textMuted, fontSize: 15 }}>
            {classroomCards.length} classroom{classroomCards.length !== 1 ? "s" : ""}
          </p>
        </div>

        <Link
          href={teacherWorkflowRoutes.classroomCreate}
          style={{
            ...workflowStyles.primaryButton,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          + Create classroom
        </Link>
      </div>

      {!props.accessToken ? (
        <WorkflowStateCard message="Sign in to load your classrooms." />
      ) : null}

      {classroomsQuery.isLoading ? (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                borderRadius: webTheme.radius.card,
                background: webTheme.colors.surfaceRaised,
                border: `1px solid ${webTheme.colors.border}`,
                height: 200,
                animation: "pulse 1.5s ease-in-out infinite",
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
            padding: "64px 24px",
            color: webTheme.colors.textMuted,
          }}
        >
          <p style={{ fontSize: 18, fontWeight: 600, color: webTheme.colors.text }}>
            No classrooms yet
          </p>
          <p style={{ marginTop: 8, fontSize: 15 }}>
            Create your first classroom to get started with attendance.
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
                whileHover={{
                  scale: 1.02,
                  borderColor: "rgba(255,255,255,0.15)",
                  transition: { duration: 0.2 },
                }}
                whileTap={{ scale: 0.98 }}
                style={{
                  borderRadius: webTheme.radius.card,
                  border: `1px solid ${webTheme.colors.border}`,
                  background: webTheme.colors.surfaceRaised,
                  padding: 24,
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Link
                  href={teacherWorkflowRoutes.classroomDetail(classroom.classroomId)}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "grid",
                    gap: 14,
                  }}
                >
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={workflowStyles.pill}>{classroom.statusLabel}</span>
                    <span style={workflowStyles.pill}>{classroom.attendanceModeLabel}</span>
                  </div>

                  <div>
                    <span style={{ color: webTheme.colors.textSubtle, fontSize: 12, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {classroom.courseCode}
                    </span>
                    <h3 style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 600, color: webTheme.colors.text, lineHeight: 1.3 }}>
                      {classroom.classroomTitle}
                    </h3>
                  </div>

                  <p style={{ margin: 0, color: webTheme.colors.textMuted, fontSize: 14, lineHeight: 1.5 }}>
                    {classroom.scopeSummary}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingTop: 10,
                      borderTop: `1px solid ${webTheme.colors.border}`,
                    }}
                  >
                    <span style={{ color: webTheme.colors.textSubtle, fontSize: 13 }}>
                      {classroom.joinCodeLabel}
                    </span>
                    <span
                      style={{
                        color: webTheme.colors.accent,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Open →
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : null}
    </div>
  )
}
