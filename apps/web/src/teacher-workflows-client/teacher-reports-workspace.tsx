"use client"

import type { AttendanceMode, AttendanceSessionStatus } from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useState } from "react"

import {
  buildTeacherWebAcademicFilterOptions,
  buildTeacherWebFilterSummary,
  buildTeacherWebReportOverviewModel,
  buildTeacherWebReportQueryFilters,
  createTeacherWebReportFilterDraft,
  mapTeacherWebReviewErrorToMessage,
} from "../teacher-review-workflows"
import { formatPortalDateTime } from "../web-workflows"
import { teacherWorkflowRoutes, webWorkflowQueryKeys } from "../web-workflows"

import {
  WorkflowBanner,
  WorkflowField,
  WorkflowSelectField,
  WorkflowStateCard,
  WorkflowSummaryGrid,
  WorkflowTonePill,
  bootstrap,
  findSelectedFilterLabel,
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
      {!props.accessToken ? (
        <WorkflowStateCard message="Sign in to review attendance reports." />
      ) : (
        <>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: webTheme.colors.text, margin: 0 }}>
            Reports
          </h2>

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
              options={[{ value: "", label: "All classes" }, ...academicFilterOptions.classOptions]}
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
              label="From"
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
              label="To"
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
        </>
      )}

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
        <WorkflowStateCard message="No report rows matched the current filters." />
      ) : (
        <>
          <div style={workflowStyles.cardGrid}>
            {reportOverview.subjectRows.map((row) => (
              <div key={`${row.classroomId}:${row.subjectId}`} style={workflowStyles.rowCard}>
                <div style={workflowStyles.buttonRow}>
                  <WorkflowTonePill label={row.attendanceLabel} tone={row.tone} />
                </div>
                <strong style={{ display: "block", marginTop: 10, color: webTheme.colors.text }}>
                  {row.title}
                </strong>
                <div style={{ color: webTheme.colors.textSubtle, marginTop: 6 }}>
                  {row.courseContextLabel}
                </div>
                <div style={{ color: webTheme.colors.textMuted, marginTop: 10 }}>
                  {row.sessionSummary}
                </div>
                <div style={{ color: webTheme.colors.textSubtle, marginTop: 8 }}>
                  {row.lastSessionAt
                    ? `Last session ${formatPortalDateTime(row.lastSessionAt)}`
                    : "No recent session yet"}
                </div>
              </div>
            ))}
          </div>

          <div style={workflowStyles.twoColumn}>
            <div style={workflowStyles.grid}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: webTheme.colors.text, margin: 0 }}>
                Students needing follow-up
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table style={workflowStyles.table}>
                  <thead>
                    <tr>
                      <th style={workflowStyles.th}>Student</th>
                      <th style={workflowStyles.th}>Context</th>
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
                          <div style={{ color: webTheme.colors.textSubtle, marginTop: 4 }}>
                            {row.sessionSummary}
                          </div>
                        </td>
                        <td style={workflowStyles.td}>
                          <WorkflowTonePill label={row.followUpLabel} tone={row.tone} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={workflowStyles.grid}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: webTheme.colors.text, margin: 0 }}>
                Day-wise trend
              </h3>
              {reportOverview.daywiseRows.map((row) => (
                <div
                  key={`${row.classroomId}:${row.attendanceDate}`}
                  style={workflowStyles.rowCard}
                >
                  <div style={workflowStyles.buttonRow}>
                    <WorkflowTonePill label={row.attendanceLabel} tone={row.tone} />
                  </div>
                  <strong style={{ display: "block", marginTop: 10, color: webTheme.colors.text }}>
                    {row.title}
                  </strong>
                  <div style={{ color: webTheme.colors.textMuted, marginTop: 6 }}>
                    {row.sessionSummary}
                  </div>
                  <div style={{ color: webTheme.colors.textSubtle, marginTop: 8 }}>
                    {row.dateLabel}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={workflowStyles.buttonRow}>
            <Link
              href={teacherWorkflowRoutes.sessionHistory}
              style={workflowStyles.secondaryButton}
            >
              Session review
            </Link>
            <Link href="/teacher/exports" style={workflowStyles.primaryButton}>
              Exports
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
