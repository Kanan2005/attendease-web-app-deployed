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

export function TeacherSemesterVisibilityWorkspace(props: {
  accessToken: string | null
}) {
  const classroomsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.teacherSemesterVisibility(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listClassrooms(props.accessToken ?? ""),
  })

  return (
    <div style={workflowStyles.grid}>
      <WebSectionCard
        title="Semester Visibility"
        description="Teachers read semester-linked classroom state here, while actual semester lifecycle changes remain admin-only."
      >
        {!props.accessToken ? (
          <WorkflowStateCard message="No web access token is available for semester visibility yet." />
        ) : classroomsQuery.isLoading ? (
          <WorkflowStateCard message="Loading semester visibility..." />
        ) : classroomsQuery.isError ? (
          <WorkflowBanner
            tone="danger"
            message={
              classroomsQuery.error instanceof Error
                ? classroomsQuery.error.message
                : "Failed to load semester visibility."
            }
          />
        ) : classroomsQuery.data && classroomsQuery.data.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={workflowStyles.table}>
              <thead>
                <tr>
                  <th style={workflowStyles.th}>Semester id</th>
                  <th style={workflowStyles.th}>Classrooms</th>
                  <th style={workflowStyles.th}>Active</th>
                  <th style={workflowStyles.th}>Completed/Archived</th>
                  <th style={workflowStyles.th}>Trusted-device rooms</th>
                </tr>
              </thead>
              <tbody>
                {buildTeacherSemesterVisibilityRows(classroomsQuery.data).map((row) => (
                  <tr key={row.semesterId}>
                    <td style={workflowStyles.td}>{row.semesterId}</td>
                    <td style={workflowStyles.td}>{row.classroomCount}</td>
                    <td style={workflowStyles.td}>{row.activeCount}</td>
                    <td style={workflowStyles.td}>{row.completedCount}</td>
                    <td style={workflowStyles.td}>{row.requiresTrustedDeviceCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <WorkflowStateCard message="No classrooms were available to derive semester visibility." />
        )}
      </WebSectionCard>
    </div>
  )
}
