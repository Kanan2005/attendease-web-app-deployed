"use client"

import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useEffect, useState } from "react"

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
  ReportSessionTrendChart,
  ReportSummaryRings,
  type SessionChartPoint,
} from "./reports-charts"
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

const DEFAULT_ATTENDANCE_THRESHOLD = 75

export function TeacherReportsWorkspace(props: {
  accessToken: string | null
  initialClassroomId?: string | null
}) {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState(() =>
    props.initialClassroomId
      ? { ...createTeacherWebReportFilterDraft(), classroomId: props.initialClassroomId }
      : createTeacherWebReportFilterDraft(),
  )
  const [attendanceThreshold, setAttendanceThreshold] = useState(DEFAULT_ATTENDANCE_THRESHOLD)
  const [exportSuccess, setExportSuccess] = useState(false)

  useEffect(() => {
    if (!exportSuccess) return
    const timer = setTimeout(() => setExportSuccess(false), 4000)
    return () => clearTimeout(timer)
  }, [exportSuccess])

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

  const sessionsForChartQuery = useQuery({
    queryKey: webWorkflowQueryKeys.sessionHistory(reportFilters),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listAttendanceSessions(props.accessToken ?? "", reportFilters),
  })

  const lecturesQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomLectures(props.initialClassroomId ?? ""),
    enabled: Boolean(props.accessToken && props.initialClassroomId),
    queryFn: () =>
      bootstrap.authClient.listClassroomLectures(
        props.accessToken ?? "",
        props.initialClassroomId ?? "",
      ),
  })

  const reportOverview = buildTeacherWebReportOverviewModel({
    daywiseRows: daywiseQuery.data ?? [],
    subjectRows: subjectwiseQuery.data ?? [],
    studentRows: studentQuery.data ?? [],
    filterSummary,
  })

  const studentsBelowThreshold = reportOverview.studentRows.filter(
    (row) => row.attendancePercentage < attendanceThreshold,
  )

  const isCourseScoped = Boolean(props.initialClassroomId)
  const lectures = lecturesQuery.data ?? []
  const sessions = sessionsForChartQuery.data ?? []

  const sessionChartData: SessionChartPoint[] = (() => {
    const utcDateLabel = (iso: string): string => {
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return iso
      return new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(d)
    }

    if (isCourseScoped && lectures.length > 0) {
      return lectures
        .map((lecture) => {
          const session = sessions.find((s) => s.lectureId === lecture.id)
          const total = session ? session.presentCount + session.absentCount : 0
          const pct = total > 0 && session ? Math.round((session.presentCount / total) * 100) : 0
          const point: SessionChartPoint = {
            date: lecture.lectureDate,
            dateLabel: utcDateLabel(lecture.lectureDate),
            pct,
          }
          if (lecture.title) point.title = lecture.title
          return point
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }

    return sessions
      .filter((s) => s.lectureDate != null || s.startedAt != null)
      .map((s) => {
        const total = s.presentCount + s.absentCount
        const pct = total > 0 ? Math.round((s.presentCount / total) * 100) : 0
        const dateStr = s.lectureDate ?? s.startedAt ?? ""
        const pt: SessionChartPoint = { date: dateStr, dateLabel: utcDateLabel(dateStr), pct }
        if (s.lectureTitle) pt.title = s.lectureTitle
        return pt
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  })()

  const exportToExcelMutation = useMutation({
    mutationFn: async () => {
      if (!props.accessToken) {
        throw new Error("Sign in to export report data.")
      }
      return bootstrap.authClient.createExportJob(props.accessToken, {
        jobType: "COMPREHENSIVE_CSV",
        filters: reportFilters,
      })
    },
    onSuccess: async () => {
      setExportSuccess(true)
      await queryClient.invalidateQueries({ queryKey: webWorkflowQueryKeys.exportJobs() })
    },
  })

  const lectureCount = isCourseScoped ? lectures.length : (sessionsForChartQuery.data?.length ?? 0)

  const avgAttendancePct = (() => {
    if (!isCourseScoped || lectures.length === 0) {
      return reportOverview.summaryCards.find((c) => c.label === "Attendance")?.value ?? "0%"
    }
    const lecturesWithSession = lectures.filter((lec) =>
      sessions.some((s) => s.lectureId === lec.id),
    )
    if (lecturesWithSession.length === 0) return "0%"
    const totalPct = lecturesWithSession.reduce((sum, lec) => {
      const session = sessions.find((s) => s.lectureId === lec.id)
      if (!session) return sum
      const total = session.presentCount + session.absentCount
      return sum + (total > 0 ? Math.round((session.presentCount / total) * 100) : 0)
    }, 0)
    return `${Math.round(totalPct / lecturesWithSession.length)}%`
  })()

  const visibleSummaryCards = isCourseScoped
    ? [
        {
          label: "Students enrolled",
          value: String(
            reportOverview.summaryCards.find((c) => c.label === "Students")?.value ?? "0",
          ),
          tone: (reportOverview.summaryCards.find((c) => c.label === "Students")?.tone ??
            "warning") as "primary" | "success" | "warning" | "danger",
        },
        {
          label: "Lecture sessions",
          value: String(lectureCount),
          tone: (lectureCount > 0 ? "primary" : "warning") as
            | "primary"
            | "success"
            | "warning"
            | "danger",
        },
        {
          label: "Average attendance",
          value: avgAttendancePct,
          tone: (reportOverview.summaryCards.find((c) => c.label === "Attendance")?.tone ??
            "warning") as "primary" | "success" | "warning" | "danger",
        },
      ]
    : reportOverview.summaryCards

  return (
    <div style={workflowStyles.grid}>
      {!props.accessToken ? (
        <WorkflowStateCard message="Sign in to review attendance reports." />
      ) : (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <h2 style={{ fontSize: 22, fontWeight: 700, color: webTheme.colors.text, margin: 0 }}>
              Reports
            </h2>
            <button
              type="button"
              onClick={() => exportToExcelMutation.mutate()}
              disabled={exportToExcelMutation.isPending}
              style={workflowStyles.primaryButton}
            >
              {exportToExcelMutation.isPending ? "Queueing export..." : "Export to Excel"}
            </button>
          </div>

          {isCourseScoped ? (
            <div style={workflowStyles.formGrid}>
              <WorkflowField
                label="From"
                value={filters.fromDate}
                onChange={(value) => setFilters((current) => ({ ...current, fromDate: value }))}
                type="date"
              />
              <WorkflowField
                label="To"
                value={filters.toDate}
                onChange={(value) => setFilters((current) => ({ ...current, toDate: value }))}
                type="date"
              />
            </div>
          ) : (
            <div style={workflowStyles.formGrid}>
              <WorkflowSelectField
                label="Classroom"
                value={filters.classroomId}
                onChange={(value) => setFilters((current) => ({ ...current, classroomId: value }))}
                options={[
                  { value: "", label: "All classrooms" },
                  ...academicFilterOptions.classroomOptions,
                ]}
              />
              <WorkflowSelectField
                label="Class"
                value={filters.classId}
                onChange={(value) => setFilters((current) => ({ ...current, classId: value }))}
                options={[
                  { value: "", label: "All classes" },
                  ...academicFilterOptions.classOptions,
                ]}
              />
              <WorkflowSelectField
                label="Section"
                value={filters.sectionId}
                onChange={(value) => setFilters((current) => ({ ...current, sectionId: value }))}
                options={[
                  { value: "", label: "All sections" },
                  ...academicFilterOptions.sectionOptions,
                ]}
              />
              <WorkflowSelectField
                label="Subject"
                value={filters.subjectId}
                onChange={(value) => setFilters((current) => ({ ...current, subjectId: value }))}
                options={[
                  { value: "", label: "All subjects" },
                  ...academicFilterOptions.subjectOptions,
                ]}
              />
              <WorkflowField
                label="From"
                value={filters.fromDate}
                onChange={(value) => setFilters((current) => ({ ...current, fromDate: value }))}
                type="date"
              />
              <WorkflowField
                label="To"
                value={filters.toDate}
                onChange={(value) => setFilters((current) => ({ ...current, toDate: value }))}
                type="date"
              />
            </div>
          )}

          {classroomsQuery.isError ? (
            <WorkflowBanner
              tone="danger"
              message={mapTeacherWebReviewErrorToMessage(
                classroomsQuery.error,
                "AttendEase couldn't load the report filters.",
              )}
            />
          ) : null}

          <WorkflowSummaryGrid cards={visibleSummaryCards} />
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
          <ReportSummaryRings cards={visibleSummaryCards} />

          {sessionsForChartQuery.isError ? (
            <WorkflowBanner
              tone="danger"
              message={mapTeacherWebReviewErrorToMessage(
                sessionsForChartQuery.error,
                "Could not load chart data.",
              )}
            />
          ) : null}

          <section style={{ marginBottom: 32 }} aria-labelledby="report-trend-heading">
            <h3
              id="report-trend-heading"
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: webTheme.colors.text,
                margin: "0 0 12px",
              }}
            >
              Attendance by session
            </h3>
            <ReportSessionTrendChart data={sessionChartData} />
          </section>

          <section style={{ marginBottom: 32 }} aria-labelledby="report-threshold-heading">
            <div style={workflowStyles.twoColumn}>
              <div style={workflowStyles.grid}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 12,
                  }}
                >
                  <h3
                    id="report-threshold-heading"
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: webTheme.colors.text,
                      margin: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    Students below threshold
                    {studentsBelowThreshold.length > 0 ? (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: webTheme.colors.danger,
                          background: webTheme.colors.dangerSoft,
                          border: `1px solid ${webTheme.colors.dangerBorder}`,
                          borderRadius: 999,
                          padding: "2px 8px",
                          lineHeight: 1.4,
                        }}
                      >
                        {studentsBelowThreshold.length}
                      </span>
                    ) : null}
                  </h3>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                    <span style={{ color: webTheme.colors.textMuted }}>Threshold (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={attendanceThreshold}
                      onChange={(e) => {
                        const n = Number(e.target.value)
                        if (!Number.isNaN(n)) setAttendanceThreshold(Math.max(0, Math.min(100, n)))
                      }}
                      style={{
                        width: 64,
                        padding: "6px 8px",
                        border: `1px solid ${webTheme.colors.border}`,
                        borderRadius: 4,
                        fontSize: 14,
                        color: webTheme.colors.text,
                        background: webTheme.colors.surfaceRaised,
                      }}
                    />
                  </label>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={workflowStyles.table}>
                    <thead>
                      <tr>
                        <th style={workflowStyles.th}>Student</th>
                        <th style={workflowStyles.th}>Roll No.</th>
                        <th style={workflowStyles.th}>Attendance</th>
                        <th style={workflowStyles.th}>Follow-up</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsBelowThreshold.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            style={{ ...workflowStyles.td, color: webTheme.colors.textMuted }}
                          >
                            No students below {attendanceThreshold}% with current filters.
                          </td>
                        </tr>
                      ) : (
                        studentsBelowThreshold.map((row) => (
                          <tr key={row.studentId}>
                            <td style={workflowStyles.td}>
                              <strong>{row.title}</strong>
                            </td>
                            <td
                              style={{
                                ...workflowStyles.td,
                                color: webTheme.colors.textMuted,
                                fontSize: 13,
                              }}
                            >
                              {row.supportingLabel || "—"}
                            </td>
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={workflowStyles.grid}>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: webTheme.colors.text,
                    margin: "0 0 12px",
                  }}
                >
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
                    <strong
                      style={{ display: "block", marginTop: 10, color: webTheme.colors.text }}
                    >
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
          </section>

          {exportSuccess ? (
            <WorkflowBanner
              tone="info"
              message="Export queued. Open Exports to download when ready."
            />
          ) : null}
          {exportToExcelMutation.isError ? (
            <WorkflowBanner
              tone="danger"
              message={
                exportToExcelMutation.error instanceof Error
                  ? exportToExcelMutation.error.message
                  : "Failed to queue export."
              }
            />
          ) : null}
        </>
      )}
    </div>
  )
}
