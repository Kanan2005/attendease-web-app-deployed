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
    <div style={workflowStyles.grid}>
      <WebSectionCard
        title="Classroom management"
        description="Open the classroom you want to teach, update course details, or create a new classroom from the same workspace."
      >
        <div style={workflowStyles.summaryGrid}>
          <div style={workflowStyles.summaryMetric}>
            <div style={{ color: "#475569", fontSize: 13 }}>Classrooms in view</div>
            <strong style={{ display: "block", fontSize: 24, marginTop: 6 }}>
              {classroomCards.length}
            </strong>
          </div>
          <div style={workflowStyles.summaryMetric}>
            <div style={{ color: "#475569", fontSize: 13 }}>QR-ready classrooms</div>
            <strong style={{ display: "block", fontSize: 24, marginTop: 6 }}>
              {
                classroomCards.filter((classroom) => classroom.attendanceModeLabel === "QR + GPS")
                  .length
              }
            </strong>
          </div>
          <div style={workflowStyles.summaryMetric}>
            <div style={{ color: "#475569", fontSize: 13 }}>Course setup changes</div>
            <strong style={{ display: "block", fontSize: 24, marginTop: 6 }}>
              {classroomCards.filter((classroom) => classroom.canEdit).length}
            </strong>
          </div>
        </div>

        <div style={{ ...workflowStyles.buttonRow, marginTop: 16 }}>
          <Link href={teacherWorkflowRoutes.classroomCreate} style={workflowStyles.primaryButton}>
            Create classroom
          </Link>
          <Link href={teacherWorkflowRoutes.sessionHistory} style={workflowStyles.secondaryButton}>
            Attendance sessions
          </Link>
          <Link href={teacherWorkflowRoutes.imports} style={workflowStyles.secondaryButton}>
            Import status
          </Link>
        </div>
      </WebSectionCard>

      <WebSectionCard
        title="Classrooms"
        description="Course code, teaching scope, attendance mode, and quick actions stay together so teachers do not bounce between separate tools."
      >
        {!props.accessToken ? (
          <WorkflowStateCard message="Sign in to load your classroom list." />
        ) : (
          <div style={workflowStyles.grid}>
            <label style={{ display: "grid", gap: 6, maxWidth: 260 }}>
              <span>Filter classrooms</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as CourseOfferingStatus | "ALL")
                }
                style={workflowStyles.input}
              >
                <option value="ALL">All statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>

            {classroomsQuery.isLoading ? (
              <WorkflowStateCard message="Loading classrooms..." />
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
              <WorkflowStateCard message="No classrooms matched the selected status filter." />
            ) : null}

            {classroomCards.length > 0 ? (
              <div style={workflowStyles.cardGrid}>
                {classroomCards.map((classroom) => (
                  <div key={classroom.classroomId} style={workflowStyles.rowCard}>
                    <div style={{ display: "grid", gap: 10 }}>
                      <div>
                        <div style={{ color: "#475569", fontSize: 13 }}>{classroom.courseCode}</div>
                        <strong style={{ display: "block", fontSize: 20, marginTop: 4 }}>
                          {classroom.classroomTitle}
                        </strong>
                        <p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.5 }}>
                          {classroom.scopeSummary}
                        </p>
                      </div>

                      <div style={workflowStyles.buttonRow}>
                        <span style={workflowStyles.pill}>{classroom.statusLabel}</span>
                        <span style={workflowStyles.pill}>{classroom.attendanceModeLabel}</span>
                      </div>

                      <div style={{ color: "#475569", lineHeight: 1.6 }}>
                        Join code: {classroom.joinCodeLabel}
                        <br />
                        {classroom.deviceRuleLabel}
                      </div>

                      <div style={workflowStyles.buttonRow}>
                        <Link
                          href={teacherWorkflowRoutes.classroomDetail(classroom.classroomId)}
                          style={workflowStyles.primaryButton}
                        >
                          Manage course
                        </Link>
                        <Link
                          href={teacherWorkflowRoutes.classroomRoster(classroom.classroomId)}
                          style={workflowStyles.secondaryButton}
                        >
                          Roster
                        </Link>
                        <Link
                          href={teacherWorkflowRoutes.classroomSchedule(classroom.classroomId)}
                          style={workflowStyles.secondaryButton}
                        >
                          Schedule
                        </Link>
                      </div>

                      <div style={workflowStyles.buttonRow}>
                        <Link
                          href={teacherWorkflowRoutes.classroomStream(classroom.classroomId)}
                          style={workflowStyles.secondaryButton}
                        >
                          Updates
                        </Link>
                        <Link
                          href={teacherWorkflowRoutes.classroomDetail(classroom.classroomId)}
                          style={workflowStyles.secondaryButton}
                        >
                          Open QR tools
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </WebSectionCard>
    </div>
  )
}
