"use client"

import { webTheme } from "@attendease/ui-web"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"

import {
  buildTeacherAnalyticsFilters,
  createTeacherAnalyticsFilterDraft,
} from "../teacher-analytics-automation"
import { WebSectionCard } from "../web-shell"
import { formatPortalDateTime, webWorkflowQueryKeys } from "../web-workflows"
import {
  WorkflowBanner,
  WorkflowStateCard,
  buildDistributionLabel,
  buildModeLabel,
  renderQueryError,
  sumAttendancePoints,
  teacherAnalyticsAutomationBootstrap,
  toAnalyticsQueryKey,
} from "./shared"
import { teacherAnalyticsStyles as styles } from "./styles"
import { ComparisonCards, DistributionCard, MetricCard, ModeUsageTable, TrendTable } from "./tables"

export function TeacherAnalyticsWorkspace(props: {
  accessToken: string | null
}) {
  const [filters, setFilters] = useState(createTeacherAnalyticsFilterDraft())
  const [studentId, setStudentId] = useState("")
  const [sessionId, setSessionId] = useState("")
  const appliedFilters = useMemo(() => buildTeacherAnalyticsFilters(filters), [filters])

  const classroomsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classrooms({ status: "ACTIVE" }),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      teacherAnalyticsAutomationBootstrap.authClient.listClassrooms(props.accessToken ?? "", {
        status: "ACTIVE",
      }),
  })
  const trendQuery = useQuery({
    queryKey: webWorkflowQueryKeys.analyticsTrends(toAnalyticsQueryKey(appliedFilters)),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      teacherAnalyticsAutomationBootstrap.authClient.getAnalyticsTrends(
        props.accessToken ?? "",
        appliedFilters,
      ),
  })
  const distributionQuery = useQuery({
    queryKey: webWorkflowQueryKeys.analyticsDistribution(toAnalyticsQueryKey(appliedFilters)),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      teacherAnalyticsAutomationBootstrap.authClient.getAnalyticsDistribution(
        props.accessToken ?? "",
        appliedFilters,
      ),
  })
  const comparisonsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.analyticsComparisons(toAnalyticsQueryKey(appliedFilters)),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      teacherAnalyticsAutomationBootstrap.authClient.getAnalyticsComparisons(
        props.accessToken ?? "",
        appliedFilters,
      ),
  })
  const modesQuery = useQuery({
    queryKey: webWorkflowQueryKeys.analyticsModes(toAnalyticsQueryKey(appliedFilters)),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      teacherAnalyticsAutomationBootstrap.authClient.getAnalyticsModes(
        props.accessToken ?? "",
        appliedFilters,
      ),
  })
  const studentTimelineQuery = useQuery({
    queryKey: webWorkflowQueryKeys.analyticsStudentTimeline(
      studentId.trim(),
      toAnalyticsQueryKey(appliedFilters),
    ),
    enabled: Boolean(props.accessToken) && studentId.trim().length > 0,
    queryFn: () =>
      teacherAnalyticsAutomationBootstrap.authClient.getAnalyticsStudentTimeline(
        props.accessToken ?? "",
        studentId.trim(),
        appliedFilters,
      ),
  })
  const sessionDrilldownQuery = useQuery({
    queryKey: webWorkflowQueryKeys.analyticsSessionDrilldown(sessionId.trim()),
    enabled: Boolean(props.accessToken) && sessionId.trim().length > 0,
    queryFn: () =>
      teacherAnalyticsAutomationBootstrap.authClient.getAnalyticsSessionDrilldown(
        props.accessToken ?? "",
        sessionId.trim(),
      ),
  })

  const weeklySummary = sumAttendancePoints(trendQuery.data?.weekly ?? [])

  return (
    <div style={styles.grid}>
      {!props.accessToken ? (
        <WorkflowStateCard message="No protected teacher web session is available for analytics yet." />
      ) : null}

      <WebSectionCard
        title="Analytics Filters"
        description="Analytics payloads are server-prepared and compact. Filters stay aligned with the same finalized attendance truth already used by reports."
      >
        <div style={styles.formGrid}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Classroom</span>
            <select
              value={filters.classroomId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  classroomId: event.target.value,
                }))
              }
              style={styles.input}
            >
              <option value="">All classrooms</option>
              {classroomsQuery.data?.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.displayTitle}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>From date</span>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  fromDate: event.target.value,
                }))
              }
              style={styles.input}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>To date</span>
            <input
              type="date"
              value={filters.toDate}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  toDate: event.target.value,
                }))
              }
              style={styles.input}
            />
          </label>
        </div>
      </WebSectionCard>

      <div style={styles.compactGrid}>
        <MetricCard label="Sessions In Scope" value={String(weeklySummary.sessionCount)} />
        <MetricCard
          label="Present / Absent"
          value={`${weeklySummary.presentCount} / ${weeklySummary.absentCount}`}
        />
        <MetricCard
          label="Below Threshold"
          value={buildDistributionLabel(distributionQuery.data)}
        />
        <MetricCard label="Mode Usage" value={buildModeLabel(modesQuery.data)} />
      </div>

      {trendQuery.isError ||
      distributionQuery.isError ||
      comparisonsQuery.isError ||
      modesQuery.isError ? (
        <WorkflowBanner
          tone="danger"
          message={
            trendQuery.error instanceof Error
              ? trendQuery.error.message
              : distributionQuery.error instanceof Error
                ? distributionQuery.error.message
                : comparisonsQuery.error instanceof Error
                  ? comparisonsQuery.error.message
                  : renderQueryError(modesQuery.error, "Failed to load analytics.")
          }
        />
      ) : null}

      {trendQuery.isLoading ||
      distributionQuery.isLoading ||
      comparisonsQuery.isLoading ||
      modesQuery.isLoading ? (
        <WorkflowStateCard message="Loading analytics views..." />
      ) : null}

      {trendQuery.data ? (
        <WebSectionCard
          title="Trend Charts"
          description="Weekly and monthly trend series are rendered directly from compact server-prepared analytics payloads."
        >
          <div style={styles.split}>
            <TrendTable title="Weekly Trend" rows={trendQuery.data.weekly} />
            <TrendTable title="Monthly Trend" rows={trendQuery.data.monthly} />
          </div>
        </WebSectionCard>
      ) : null}

      {comparisonsQuery.data ? (
        <WebSectionCard
          title="Distribution And Comparisons"
          description="Distribution buckets, classroom comparisons, and subject summaries are ready for later chart enhancements without changing the API contract."
        >
          <div style={styles.split}>
            <DistributionCard distribution={distributionQuery.data} />
            <ComparisonCards comparisons={comparisonsQuery.data} />
          </div>
        </WebSectionCard>
      ) : null}

      {modesQuery.data ? (
        <WebSectionCard
          title="Mode Usage"
          description="QR + GPS and Bluetooth usage trends are already compact enough for dashboards and exports to reuse later."
        >
          <ModeUsageTable modes={modesQuery.data} />
        </WebSectionCard>
      ) : null}

      <WebSectionCard
        title="Drill-Down"
        description="Teacher web can now drill into a specific student timeline or session detail without leaving the analytics area."
      >
        <div style={styles.formGrid}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Student ID</span>
            <input
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              placeholder="seed_user_student_one"
              style={styles.input}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Session ID</span>
            <input
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              placeholder="seed_attendance_session_math"
              style={styles.input}
            />
          </label>
        </div>

        <div style={{ ...styles.split, marginTop: 18 }}>
          <div style={styles.card}>
            <h4 style={{ marginTop: 0 }}>Student Timeline</h4>
            {studentTimelineQuery.isLoading ? (
              <WorkflowStateCard message="Loading student timeline..." />
            ) : studentTimelineQuery.isError ? (
              <WorkflowBanner
                tone="danger"
                message={renderQueryError(
                  studentTimelineQuery.error,
                  "Failed to load the student timeline.",
                )}
              />
            ) : studentTimelineQuery.data?.length ? (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Classroom</th>
                      <th style={styles.th}>Lecture</th>
                      <th style={styles.th}>Mode</th>
                      <th style={styles.th}>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentTimelineQuery.data.map((row) => (
                      <tr key={row.sessionId}>
                        <td style={styles.td}>
                          <strong>{row.classroomDisplayTitle}</strong>
                          <div style={{ color: webTheme.colors.textSubtle, marginTop: 4 }}>
                            {row.classroomCode}
                          </div>
                        </td>
                        <td style={styles.td}>
                          {row.lectureTitle ?? "No linked lecture"}
                          <div style={{ color: webTheme.colors.textSubtle, marginTop: 4 }}>
                            {formatPortalDateTime(row.lectureDate)}
                          </div>
                        </td>
                        <td style={styles.td}>{row.mode}</td>
                        <td style={styles.td}>{row.attendanceStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <WorkflowStateCard message="Enter a student ID to load the attendance timeline." />
            )}
          </div>

          <div style={styles.card}>
            <h4 style={{ marginTop: 0 }}>Session Drill-Down</h4>
            {sessionDrilldownQuery.isLoading ? (
              <WorkflowStateCard message="Loading session drill-down..." />
            ) : sessionDrilldownQuery.isError ? (
              <WorkflowBanner
                tone="danger"
                message={renderQueryError(
                  sessionDrilldownQuery.error,
                  "Failed to load the session drill-down.",
                )}
              />
            ) : sessionDrilldownQuery.data ? (
              <div style={styles.grid}>
                <div>
                  <strong>{sessionDrilldownQuery.data.session.classroomDisplayTitle}</strong>
                  <div style={{ color: webTheme.colors.textSubtle, marginTop: 4 }}>
                    {sessionDrilldownQuery.data.session.presentCount} present /{" "}
                    {sessionDrilldownQuery.data.session.absentCount} absent
                  </div>
                </div>
                <div style={{ color: webTheme.colors.textMuted }}>
                  Suspicious attempts: {sessionDrilldownQuery.data.session.suspiciousAttemptCount}
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Student</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Marked At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionDrilldownQuery.data.students.map((row) => (
                        <tr key={row.attendanceRecordId}>
                          <td style={styles.td}>
                            <strong>{row.studentDisplayName}</strong>
                            <div style={{ color: webTheme.colors.textSubtle, marginTop: 4 }}>
                              {row.studentRollNumber ?? row.studentEmail}
                            </div>
                          </td>
                          <td style={styles.td}>{row.status}</td>
                          <td style={styles.td}>{formatPortalDateTime(row.markedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <WorkflowStateCard message="Enter a session ID to load its drill-down detail." />
            )}
          </div>
        </div>
      </WebSectionCard>
    </div>
  )
}
