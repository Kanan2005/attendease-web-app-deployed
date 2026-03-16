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

export function TeacherReportsWorkspace(props: {
  accessToken: string | null
}) {
  const [filters, setFilters] = useState(() => createTeacherWebReportFilterDraft())

  const classroomsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classrooms(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listClassrooms(props.accessToken ?? ""),
  })
  const academicFilterOptions = buildTeacherWebAcademicFilterOptions(classroomsQuery.data ?? [])
  const reportFilters = buildTeacherWebReportQueryFilters(filters)
  const filterSummary = buildTeacherWebFilterSummary({
    classroom: findSelectedFilterLabel(academicFilterOptions.classroomOptions, filters.classroomId),
    class: findSelectedFilterLabel(academicFilterOptions.classOptions, filters.classId),
    section: findSelectedFilterLabel(academicFilterOptions.sectionOptions, filters.sectionId),
    subject: findSelectedFilterLabel(academicFilterOptions.subjectOptions, filters.subjectId),
    fromDate: filters.fromDate || null,
    toDate: filters.toDate || null,
  })

  const daywiseQuery = useQuery({
    queryKey: webWorkflowQueryKeys.teacherDaywiseReports(reportFilters),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listTeacherDaywiseReports(props.accessToken ?? "", reportFilters),
  })
  const subjectwiseQuery = useQuery({
    queryKey: webWorkflowQueryKeys.teacherSubjectwiseReports(reportFilters),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listTeacherSubjectwiseReports(props.accessToken ?? "", reportFilters),
  })
  const studentQuery = useQuery({
    queryKey: webWorkflowQueryKeys.teacherStudentPercentageReports(reportFilters),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listTeacherStudentPercentageReports(
        props.accessToken ?? "",
        reportFilters,
      ),
  })

  const reportOverview = buildTeacherWebReportOverviewModel({
    daywiseRows: daywiseQuery.data ?? [],
    subjectRows: subjectwiseQuery.data ?? [],
    studentRows: studentQuery.data ?? [],
    filterSummary,
  })

  return (
    <div style={workflowStyles.grid}>
      <WebSectionCard
        title="Report filters"
        description="Use one filter scope for day-wise trends, course rollups, and student follow-up so review work stays fast."
      >
        {!props.accessToken ? (
          <WorkflowStateCard message="Sign in to review attendance reports." />
        ) : (
          <div style={workflowStyles.grid}>
            <div style={workflowStyles.formGrid}>
              <WorkflowSelectField
                label="Classroom"
                value={filters.classroomId}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    classroomId: value,
                  }))
                }
                options={[
                  { value: "", label: "All classrooms" },
                  ...academicFilterOptions.classroomOptions,
                ]}
              />
              <WorkflowSelectField
                label="Class"
                value={filters.classId}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    classId: value,
                  }))
                }
                options={[
                  { value: "", label: "All classes" },
                  ...academicFilterOptions.classOptions,
                ]}
              />
              <WorkflowSelectField
                label="Section"
                value={filters.sectionId}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    sectionId: value,
                  }))
                }
                options={[
                  { value: "", label: "All sections" },
                  ...academicFilterOptions.sectionOptions,
                ]}
              />
              <WorkflowSelectField
                label="Subject"
                value={filters.subjectId}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    subjectId: value,
                  }))
                }
                options={[
                  { value: "", label: "All subjects" },
                  ...academicFilterOptions.subjectOptions,
                ]}
              />
              <WorkflowField
                label="From date"
                value={filters.fromDate}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    fromDate: value,
                  }))
                }
                type="date"
              />
              <WorkflowField
                label="To date"
                value={filters.toDate}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    toDate: value,
                  }))
                }
                type="date"
              />
            </div>

            {classroomsQuery.isError ? (
              <WorkflowBanner
                tone="danger"
                message={mapTeacherWebReviewErrorToMessage(
                  classroomsQuery.error,
                  "AttendEase couldn't load the report filters.",
                )}
              />
            ) : null}

            <WorkflowSummaryGrid cards={reportOverview.summaryCards} />

            <div style={workflowStyles.stateCard}>
              <strong style={{ display: "block", marginBottom: 8 }}>Current report scope</strong>
              <div style={{ lineHeight: 1.7 }}>{reportOverview.filterSummary}</div>
              <div style={{ marginTop: 10 }}>{reportOverview.availabilityMessage}</div>
            </div>
          </div>
        )}
      </WebSectionCard>

      {!props.accessToken ? null : daywiseQuery.isLoading ||
        subjectwiseQuery.isLoading ||
        studentQuery.isLoading ? (
        <WorkflowStateCard message="Loading report results..." />
      ) : daywiseQuery.isError || subjectwiseQuery.isError || studentQuery.isError ? (
        <WorkflowBanner
          tone="danger"
          message={mapTeacherWebReviewErrorToMessage(
            daywiseQuery.error ?? subjectwiseQuery.error ?? studentQuery.error,
            "AttendEase couldn't load the teacher report results.",
          )}
        />
      ) : !reportOverview.hasAnyData ? (
        <WorkflowStateCard message="No report rows matched the current filter scope." />
      ) : (
        <>
          <WebSectionCard title="Course rollups" description={reportOverview.subjectSummary}>
            <div style={workflowStyles.cardGrid}>
              {reportOverview.subjectRows.map((row) => (
                <div key={`${row.classroomId}:${row.subjectId}`} style={workflowStyles.rowCard}>
                  <div style={workflowStyles.buttonRow}>
                    <WorkflowTonePill label={row.attendanceLabel} tone={row.tone} />
                  </div>
                  <strong style={{ display: "block", marginTop: 10 }}>{row.title}</strong>
                  <div style={{ color: "#64748b", marginTop: 6 }}>{row.courseContextLabel}</div>
                  <div style={{ color: "#475569", marginTop: 10 }}>{row.sessionSummary}</div>
                  <div style={{ color: "#64748b", marginTop: 8 }}>
                    {row.lastSessionAt
                      ? `Last session ${formatPortalDateTime(row.lastSessionAt)}`
                      : "No recent session yet"}
                  </div>
                </div>
              ))}
            </div>
          </WebSectionCard>

          <div style={workflowStyles.twoColumn}>
            <WebSectionCard
              title="Students needing follow-up"
              description={reportOverview.studentSummary}
            >
              <div style={{ overflowX: "auto" }}>
                <table style={workflowStyles.table}>
                  <thead>
                    <tr>
                      <th style={workflowStyles.th}>Student</th>
                      <th style={workflowStyles.th}>Course context</th>
                      <th style={workflowStyles.th}>Attendance</th>
                      <th style={workflowStyles.th}>Follow-up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportOverview.studentRows.map((row) => (
                      <tr key={row.studentId}>
                        <td style={workflowStyles.td}>
                          <strong>{row.title}</strong>
                        </td>
                        <td style={workflowStyles.td}>{row.supportingLabel}</td>
                        <td style={workflowStyles.td}>
                          <div>{row.attendanceLabel}</div>
                          <div style={{ color: "#64748b", marginTop: 4 }}>{row.sessionSummary}</div>
                        </td>
                        <td style={workflowStyles.td}>
                          <WorkflowTonePill label={row.followUpLabel} tone={row.tone} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </WebSectionCard>

            <WebSectionCard title="Day-wise trend" description={reportOverview.daywiseSummary}>
              <div style={workflowStyles.grid}>
                {reportOverview.daywiseRows.map((row) => (
                  <div
                    key={`${row.classroomId}:${row.attendanceDate}`}
                    style={workflowStyles.rowCard}
                  >
                    <div style={workflowStyles.buttonRow}>
                      <WorkflowTonePill label={row.attendanceLabel} tone={row.tone} />
                    </div>
                    <strong style={{ display: "block", marginTop: 10 }}>{row.title}</strong>
                    <div style={{ color: "#475569", marginTop: 6 }}>{row.sessionSummary}</div>
                    <div style={{ color: "#64748b", marginTop: 8 }}>{row.dateLabel}</div>
                  </div>
                ))}
              </div>
            </WebSectionCard>
          </div>

          <div style={workflowStyles.buttonRow}>
            <Link
              href={teacherWorkflowRoutes.sessionHistory}
              style={workflowStyles.secondaryButton}
            >
              Open session review
            </Link>
            <Link href="/teacher/exports" style={workflowStyles.primaryButton}>
              Open exports
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
