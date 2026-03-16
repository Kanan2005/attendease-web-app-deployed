"use client"

import type {
  AnalyticsComparisonsResponse,
  AnalyticsDistributionResponse,
  AnalyticsModeUsageResponse,
  AnalyticsTrendResponse,
  EmailAutomationRuleSummary,
  EmailDispatchRunSummary,
  EmailLogSummary,
} from "@attendease/contracts"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"

import { createWebAuthBootstrap } from "./auth"
import {
  buildLowAttendancePreviewRequest,
  buildTeacherAnalyticsFilters,
  buildTeacherEmailAutomationRuleRequest,
  createTeacherAnalyticsFilterDraft,
  createTeacherEmailAutomationRuleDraft,
  createTeacherLowAttendanceEmailDraft,
} from "./teacher-analytics-automation"
import { WebSectionCard } from "./web-shell"
import { formatPortalDateTime, webWorkflowQueryKeys } from "./web-workflows"

const bootstrap = createWebAuthBootstrap(process.env as Record<string, string | undefined>)

const styles = {
  grid: {
    display: "grid",
    gap: 20,
  },
  split: {
    display: "grid",
    gap: 20,
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  },
  compactGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  card: {
    borderRadius: 18,
    border: "1px solid #dbe4f0",
    background: "#ffffff",
    padding: 16,
  },
  state: {
    borderRadius: 18,
    border: "1px dashed #cbd5e1",
    background: "#f8fafc",
    padding: 16,
    color: "#475569",
  },
  bannerBase: {
    borderRadius: 16,
    padding: "12px 14px",
    fontWeight: 600,
  },
  formGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  input: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    padding: "12px 14px",
    fontSize: 14,
    background: "#ffffff",
  },
  textarea: {
    width: "100%",
    minHeight: 124,
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    padding: "12px 14px",
    fontSize: 14,
    background: "#ffffff",
    resize: "vertical" as const,
  },
  buttonRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap" as const,
  },
  primaryButton: {
    border: "none",
    borderRadius: 14,
    padding: "12px 16px",
    background: "#1d4ed8",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    padding: "12px 16px",
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: 700,
    cursor: "pointer",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  th: {
    textAlign: "left" as const,
    padding: "12px 10px",
    color: "#475569",
    fontSize: 12,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    borderBottom: "1px solid #e2e8f0",
  },
  td: {
    padding: "14px 10px",
    borderBottom: "1px solid #eef2f7",
    verticalAlign: "top" as const,
    color: "#0f172a",
  },
} as const

function WorkflowStateCard(props: { message: string }) {
  return <div style={styles.state}>{props.message}</div>
}

function WorkflowBanner(props: {
  tone: "success" | "danger" | "warning"
  message: string
}) {
  const palette =
    props.tone === "success"
      ? {
          background: "#ecfdf5",
          border: "1px solid #86efac",
          color: "#166534",
        }
      : props.tone === "warning"
        ? {
            background: "#fff7ed",
            border: "1px solid #fdba74",
            color: "#9a3412",
          }
        : {
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            color: "#991b1b",
          }

  return <div style={{ ...styles.bannerBase, ...palette }}>{props.message}</div>
}

function renderQueryError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function sumAttendancePoints(points: AnalyticsTrendResponse["weekly"]) {
  return points.reduce(
    (summary, point) => ({
      sessionCount: summary.sessionCount + point.sessionCount,
      presentCount: summary.presentCount + point.presentCount,
      absentCount: summary.absentCount + point.absentCount,
    }),
    {
      sessionCount: 0,
      presentCount: 0,
      absentCount: 0,
    },
  )
}

function buildDistributionLabel(distribution: AnalyticsDistributionResponse | undefined) {
  if (!distribution || distribution.totalStudents === 0) {
    return "No students in scope"
  }

  const belowThreshold =
    distribution.buckets.find((bucket) => bucket.bucket === "BELOW_75")?.studentCount ?? 0

  return `${belowThreshold} below 75%`
}

function buildModeLabel(modes: AnalyticsModeUsageResponse | undefined) {
  if (!modes || modes.totals.length === 0) {
    return "No session modes yet"
  }

  return modes.totals.map((row) => `${row.mode}: ${row.sessionCount}`).join(" • ")
}

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
      bootstrap.authClient.listClassrooms(props.accessToken ?? "", { status: "ACTIVE" }),
  })
  const trendQuery = useQuery({
    queryKey: webWorkflowQueryKeys.analyticsTrends(toAnalyticsQueryKey(appliedFilters)),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.getAnalyticsTrends(props.accessToken ?? "", appliedFilters),
  })
  const distributionQuery = useQuery({
    queryKey: webWorkflowQueryKeys.analyticsDistribution(toAnalyticsQueryKey(appliedFilters)),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.getAnalyticsDistribution(props.accessToken ?? "", appliedFilters),
  })
  const comparisonsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.analyticsComparisons(toAnalyticsQueryKey(appliedFilters)),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.getAnalyticsComparisons(props.accessToken ?? "", appliedFilters),
  })
  const modesQuery = useQuery({
    queryKey: webWorkflowQueryKeys.analyticsModes(toAnalyticsQueryKey(appliedFilters)),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.getAnalyticsModes(props.accessToken ?? "", appliedFilters),
  })
  const studentTimelineQuery = useQuery({
    queryKey: webWorkflowQueryKeys.analyticsStudentTimeline(
      studentId.trim(),
      toAnalyticsQueryKey(appliedFilters),
    ),
    enabled: Boolean(props.accessToken) && studentId.trim().length > 0,
    queryFn: () =>
      bootstrap.authClient.getAnalyticsStudentTimeline(
        props.accessToken ?? "",
        studentId.trim(),
        appliedFilters,
      ),
  })
  const sessionDrilldownQuery = useQuery({
    queryKey: webWorkflowQueryKeys.analyticsSessionDrilldown(sessionId.trim()),
    enabled: Boolean(props.accessToken) && sessionId.trim().length > 0,
    queryFn: () =>
      bootstrap.authClient.getAnalyticsSessionDrilldown(props.accessToken ?? "", sessionId.trim()),
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
                          <div style={{ color: "#64748b", marginTop: 4 }}>{row.classroomCode}</div>
                        </td>
                        <td style={styles.td}>
                          {row.lectureTitle ?? "No linked lecture"}
                          <div style={{ color: "#64748b", marginTop: 4 }}>
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
                  <div style={{ color: "#64748b", marginTop: 4 }}>
                    {sessionDrilldownQuery.data.session.presentCount} present /{" "}
                    {sessionDrilldownQuery.data.session.absentCount} absent
                  </div>
                </div>
                <div style={{ color: "#475569" }}>
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
                            <div style={{ color: "#64748b", marginTop: 4 }}>
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

export function TeacherEmailAutomationWorkspace(props: {
  accessToken: string | null
}) {
  const queryClient = useQueryClient()
  const [ruleDraft, setRuleDraft] = useState(createTeacherEmailAutomationRuleDraft())
  const [previewDraft, setPreviewDraft] = useState(createTeacherLowAttendanceEmailDraft())
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const classroomsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classrooms({ status: "ACTIVE" }),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listClassrooms(props.accessToken ?? "", { status: "ACTIVE" }),
  })
  const rulesQuery = useQuery({
    queryKey: webWorkflowQueryKeys.emailAutomationRules({}),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listEmailAutomationRules(props.accessToken ?? "", {}),
  })
  const runsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.emailDispatchRuns({}),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listEmailDispatchRuns(props.accessToken ?? "", {}),
  })
  const logsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.emailLogs({}),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listEmailLogs(props.accessToken ?? "", {}),
  })

  useEffect(() => {
    if (!ruleDraft.classroomId && classroomsQuery.data?.[0]?.id) {
      setRuleDraft((current) => ({
        ...current,
        classroomId: classroomsQuery.data?.[0]?.id ?? "",
      }))
    }
  }, [classroomsQuery.data, ruleDraft.classroomId])

  useEffect(() => {
    if (!previewDraft.ruleId && rulesQuery.data?.[0]?.id) {
      setPreviewDraft((current) => ({
        ...current,
        ruleId: rulesQuery.data?.[0]?.id ?? "",
      }))
    }
  }, [previewDraft.ruleId, rulesQuery.data])

  const createRuleMutation = useMutation({
    mutationFn: () =>
      bootstrap.authClient.createEmailAutomationRule(
        props.accessToken ?? "",
        buildTeacherEmailAutomationRuleRequest(ruleDraft),
      ),
    onSuccess: async () => {
      setStatusMessage("Created a low-attendance automation rule.")
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.emailAutomationRules({}),
      })
    },
  })
  const updateRuleMutation = useMutation({
    mutationFn: (input: {
      ruleId: string
      status: EmailAutomationRuleSummary["status"]
    }) =>
      bootstrap.authClient.updateEmailAutomationRule(props.accessToken ?? "", input.ruleId, {
        status: input.status,
      }),
    onSuccess: async () => {
      setStatusMessage("Updated the automation rule.")
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.emailAutomationRules({}),
      })
    },
  })
  const previewMutation = useMutation({
    mutationFn: () =>
      bootstrap.authClient.previewLowAttendanceEmail(
        props.accessToken ?? "",
        buildLowAttendancePreviewRequest(previewDraft),
      ),
  })
  const manualSendMutation = useMutation({
    mutationFn: () =>
      bootstrap.authClient.sendManualLowAttendanceEmail(
        props.accessToken ?? "",
        buildLowAttendancePreviewRequest(previewDraft),
      ),
    onSuccess: async () => {
      setStatusMessage("Queued a low-attendance email dispatch run.")
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.emailDispatchRuns({}),
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.emailLogs({}),
        }),
      ])
    },
  })

  return (
    <div style={styles.grid}>
      {!props.accessToken ? (
        <WorkflowStateCard message="No protected teacher web session is available for email automation yet." />
      ) : null}
      {statusMessage ? <WorkflowBanner tone="success" message={statusMessage} /> : null}

      <WebSectionCard
        title="Automation Rule"
        description="Automation rules control daily low-attendance checks, template defaults, and per-classroom schedule timing."
      >
        <div style={styles.formGrid}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Classroom</span>
            <select
              value={ruleDraft.classroomId}
              onChange={(event) =>
                setRuleDraft((current) => ({
                  ...current,
                  classroomId: event.target.value,
                }))
              }
              style={styles.input}
            >
              <option value="">Select classroom</option>
              {classroomsQuery.data?.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.displayTitle}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Threshold percent</span>
            <input
              value={ruleDraft.thresholdPercent}
              onChange={(event) =>
                setRuleDraft((current) => ({
                  ...current,
                  thresholdPercent: event.target.value,
                }))
              }
              style={styles.input}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Local send hour</span>
            <input
              value={ruleDraft.scheduleHourLocal}
              onChange={(event) =>
                setRuleDraft((current) => ({
                  ...current,
                  scheduleHourLocal: event.target.value,
                }))
              }
              style={styles.input}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Local send minute</span>
            <input
              value={ruleDraft.scheduleMinuteLocal}
              onChange={(event) =>
                setRuleDraft((current) => ({
                  ...current,
                  scheduleMinuteLocal: event.target.value,
                }))
              }
              style={styles.input}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Timezone</span>
            <input
              value={ruleDraft.timezone}
              onChange={(event) =>
                setRuleDraft((current) => ({
                  ...current,
                  timezone: event.target.value,
                }))
              }
              style={styles.input}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Status</span>
            <select
              value={ruleDraft.status}
              onChange={(event) =>
                setRuleDraft((current) => ({
                  ...current,
                  status: event.target.value as EmailAutomationRuleSummary["status"],
                }))
              }
              style={styles.input}
            >
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Template subject</span>
            <input
              value={ruleDraft.templateSubject}
              onChange={(event) =>
                setRuleDraft((current) => ({
                  ...current,
                  templateSubject: event.target.value,
                }))
              }
              style={styles.input}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Template body</span>
            <textarea
              value={ruleDraft.templateBody}
              onChange={(event) =>
                setRuleDraft((current) => ({
                  ...current,
                  templateBody: event.target.value,
                }))
              }
              style={styles.textarea}
            />
          </label>
          <div style={styles.buttonRow}>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={() => {
                setStatusMessage(null)
                createRuleMutation.mutate()
              }}
              disabled={!props.accessToken || createRuleMutation.isPending}
            >
              {createRuleMutation.isPending ? "Creating..." : "Create rule"}
            </button>
          </div>
          {createRuleMutation.isError ? (
            <WorkflowBanner
              tone="danger"
              message={renderQueryError(
                createRuleMutation.error,
                "Failed to create the automation rule.",
              )}
            />
          ) : null}
        </div>
      </WebSectionCard>

      <WebSectionCard
        title="Existing Rules"
        description="Teachers can review current automation state and quickly pause or resume delivery without affecting historical logs."
      >
        {rulesQuery.isLoading ? (
          <WorkflowStateCard message="Loading automation rules..." />
        ) : rulesQuery.isError ? (
          <WorkflowBanner
            tone="danger"
            message={renderQueryError(rulesQuery.error, "Failed to load automation rules.")}
          />
        ) : rulesQuery.data?.length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Classroom</th>
                  <th style={styles.th}>Threshold</th>
                  <th style={styles.th}>Schedule</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Last Success</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rulesQuery.data.map((rule) => (
                  <tr key={rule.id}>
                    <td style={styles.td}>
                      <strong>{rule.classroomDisplayTitle}</strong>
                      <div style={{ color: "#64748b", marginTop: 4 }}>{rule.classroomCode}</div>
                    </td>
                    <td style={styles.td}>{rule.thresholdPercent}%</td>
                    <td style={styles.td}>
                      {String(rule.scheduleHourLocal).padStart(2, "0")}:
                      {String(rule.scheduleMinuteLocal).padStart(2, "0")} {rule.timezone}
                    </td>
                    <td style={styles.td}>{rule.status}</td>
                    <td style={styles.td}>{formatPortalDateTime(rule.lastSuccessfulRunAt)}</td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        disabled={updateRuleMutation.isPending}
                        onClick={() => {
                          setStatusMessage(null)
                          updateRuleMutation.mutate({
                            ruleId: rule.id,
                            status: rule.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                          })
                        }}
                      >
                        {rule.status === "ACTIVE" ? "Pause" : "Resume"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <WorkflowStateCard message="No automation rules exist yet for the current teacher scope." />
        )}
      </WebSectionCard>

      <WebSectionCard
        title="Preview And Manual Send"
        description="Manual preview and manual send use the same recipient-selection truth as the automated scheduler."
      >
        <div style={styles.formGrid}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Rule</span>
            <select
              value={previewDraft.ruleId}
              onChange={(event) =>
                setPreviewDraft((current) => ({
                  ...current,
                  ruleId: event.target.value,
                }))
              }
              style={styles.input}
            >
              <option value="">Select rule</option>
              {rulesQuery.data?.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.classroomDisplayTitle}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>From date</span>
            <input
              type="date"
              value={previewDraft.fromDate}
              onChange={(event) =>
                setPreviewDraft((current) => ({
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
              value={previewDraft.toDate}
              onChange={(event) =>
                setPreviewDraft((current) => ({
                  ...current,
                  toDate: event.target.value,
                }))
              }
              style={styles.input}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Threshold override</span>
            <input
              value={previewDraft.thresholdPercent}
              onChange={(event) =>
                setPreviewDraft((current) => ({
                  ...current,
                  thresholdPercent: event.target.value,
                }))
              }
              placeholder="Use rule default if blank"
              style={styles.input}
            />
          </label>
        </div>

        <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Preview subject override</span>
            <input
              value={previewDraft.templateSubject}
              onChange={(event) =>
                setPreviewDraft((current) => ({
                  ...current,
                  templateSubject: event.target.value,
                }))
              }
              style={styles.input}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Preview body override</span>
            <textarea
              value={previewDraft.templateBody}
              onChange={(event) =>
                setPreviewDraft((current) => ({
                  ...current,
                  templateBody: event.target.value,
                }))
              }
              style={styles.textarea}
            />
          </label>
          <div style={styles.buttonRow}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => {
                setStatusMessage(null)
                previewMutation.mutate()
              }}
              disabled={!props.accessToken || !previewDraft.ruleId || previewMutation.isPending}
            >
              {previewMutation.isPending ? "Rendering..." : "Preview email"}
            </button>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={() => {
                setStatusMessage(null)
                manualSendMutation.mutate()
              }}
              disabled={!props.accessToken || !previewDraft.ruleId || manualSendMutation.isPending}
            >
              {manualSendMutation.isPending ? "Queueing..." : "Send manually"}
            </button>
          </div>
        </div>

        {previewMutation.isError ? (
          <WorkflowBanner
            tone="danger"
            message={renderQueryError(previewMutation.error, "Failed to render the email preview.")}
          />
        ) : null}
        {manualSendMutation.isError ? (
          <WorkflowBanner
            tone="danger"
            message={renderQueryError(
              manualSendMutation.error,
              "Failed to queue the manual email run.",
            )}
          />
        ) : null}

        {previewMutation.data ? (
          <div style={{ ...styles.split, marginTop: 18 }}>
            <div style={styles.card}>
              <h4 style={{ marginTop: 0 }}>Preview</h4>
              <p style={{ marginTop: 0, color: "#475569" }}>
                {previewMutation.data.recipientCount} recipients selected below{" "}
                {previewMutation.data.thresholdPercent}%.
              </p>
              <p style={{ marginBottom: 8 }}>
                <strong>Subject:</strong> {previewMutation.data.previewSubject}
              </p>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                  background: "#f8fafc",
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                {previewMutation.data.previewText}
              </pre>
            </div>
            <div style={styles.card}>
              <h4 style={{ marginTop: 0 }}>Sample Recipients</h4>
              {previewMutation.data.sampleRecipients.length ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Student</th>
                        <th style={styles.th}>Email</th>
                        <th style={styles.th}>Attendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewMutation.data.sampleRecipients.map((recipient) => (
                        <tr key={recipient.studentId}>
                          <td style={styles.td}>
                            <strong>{recipient.studentDisplayName}</strong>
                            <div style={{ color: "#64748b", marginTop: 4 }}>
                              {recipient.studentRollNumber ?? "No roll number"}
                            </div>
                          </td>
                          <td style={styles.td}>{recipient.studentEmail}</td>
                          <td style={styles.td}>{recipient.attendancePercentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <WorkflowStateCard message="No students are currently below the selected threshold." />
              )}
            </div>
          </div>
        ) : null}
      </WebSectionCard>

      <div style={styles.split}>
        <WebSectionCard
          title="Dispatch Runs"
          description="Dispatch runs show queue, processing, success, and failure counts for both manual and automated email flows."
        >
          <DispatchRunTable
            runs={runsQuery.data}
            error={runsQuery.error}
            isLoading={runsQuery.isLoading}
          />
        </WebSectionCard>

        <WebSectionCard
          title="Email Logs"
          description="Email logs stay distinct from attendance truth and help support review delivery outcomes."
        >
          <EmailLogTable
            logs={logsQuery.data}
            error={logsQuery.error}
            isLoading={logsQuery.isLoading}
          />
        </WebSectionCard>
      </div>
    </div>
  )
}

function MetricCard(props: { label: string; value: string }) {
  return (
    <div style={styles.card}>
      <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 14 }}>{props.label}</p>
      <p style={{ margin: 0, color: "#0f172a", fontSize: 28, fontWeight: 700 }}>{props.value}</p>
    </div>
  )
}

function TrendTable(props: {
  title: string
  rows: AnalyticsTrendResponse["weekly"]
}) {
  return (
    <div style={styles.card}>
      <h4 style={{ marginTop: 0 }}>{props.title}</h4>
      {props.rows.length === 0 ? (
        <WorkflowStateCard message="No trend rows are available for the current filter range." />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Period</th>
                <th style={styles.th}>Sessions</th>
                <th style={styles.th}>Present / Absent</th>
                <th style={styles.th}>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {props.rows.map((row) => (
                <tr key={row.periodKey}>
                  <td style={styles.td}>{row.label}</td>
                  <td style={styles.td}>{row.sessionCount}</td>
                  <td style={styles.td}>
                    {row.presentCount} / {row.absentCount}
                  </td>
                  <td style={styles.td}>{row.attendancePercentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DistributionCard(props: {
  distribution: AnalyticsDistributionResponse | undefined
}) {
  return (
    <div style={styles.card}>
      <h4 style={{ marginTop: 0 }}>Distribution</h4>
      {!props.distribution ? (
        <WorkflowStateCard message="Distribution is not available yet." />
      ) : (
        <div style={styles.grid}>
          <p style={{ margin: 0, color: "#475569" }}>
            Total students in scope: {props.distribution.totalStudents}
          </p>
          {props.distribution.buckets.map((bucket) => (
            <div key={bucket.bucket} style={{ ...styles.card, background: "#f8fbff" }}>
              <strong>{bucket.label}</strong>
              <div style={{ color: "#475569", marginTop: 6 }}>{bucket.studentCount} students</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ComparisonCards(props: {
  comparisons: AnalyticsComparisonsResponse
}) {
  return (
    <div style={styles.grid}>
      <div style={styles.card}>
        <h4 style={{ marginTop: 0 }}>Classroom Comparison</h4>
        {props.comparisons.classrooms.length === 0 ? (
          <WorkflowStateCard message="No classroom comparisons matched the current filters." />
        ) : (
          props.comparisons.classrooms.map((row) => (
            <div key={row.classroomId} style={{ ...styles.card, background: "#f8fbff" }}>
              <strong>{row.classroomDisplayTitle}</strong>
              <div style={{ color: "#64748b", marginTop: 4 }}>{row.classroomCode}</div>
              <div style={{ marginTop: 8 }}>{row.attendancePercentage}% attendance</div>
            </div>
          ))
        )}
      </div>
      <div style={styles.card}>
        <h4 style={{ marginTop: 0 }}>Subject Comparison</h4>
        {props.comparisons.subjects.length === 0 ? (
          <WorkflowStateCard message="No subject comparisons matched the current filters." />
        ) : (
          props.comparisons.subjects.map((row) => (
            <div key={row.subjectId} style={{ ...styles.card, background: "#f8fbff" }}>
              <strong>{row.subjectTitle}</strong>
              <div style={{ color: "#64748b", marginTop: 4 }}>{row.subjectCode}</div>
              <div style={{ marginTop: 8 }}>{row.attendancePercentage}% attendance</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ModeUsageTable(props: {
  modes: AnalyticsModeUsageResponse
}) {
  return props.modes.totals.length === 0 ? (
    <WorkflowStateCard message="No attendance sessions exist for mode analysis yet." />
  ) : (
    <div style={{ overflowX: "auto" }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Mode</th>
            <th style={styles.th}>Sessions</th>
            <th style={styles.th}>Marked</th>
          </tr>
        </thead>
        <tbody>
          {props.modes.totals.map((row) => (
            <tr key={row.mode}>
              <td style={styles.td}>{row.mode}</td>
              <td style={styles.td}>{row.sessionCount}</td>
              <td style={styles.td}>{row.markedCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DispatchRunTable(props: {
  runs: EmailDispatchRunSummary[] | undefined
  error: unknown
  isLoading: boolean
}) {
  if (props.isLoading) {
    return <WorkflowStateCard message="Loading email dispatch runs..." />
  }

  if (props.error) {
    return (
      <WorkflowBanner
        tone="danger"
        message={renderQueryError(props.error, "Failed to load email dispatch runs.")}
      />
    )
  }

  if (!props.runs?.length) {
    return <WorkflowStateCard message="No email dispatch runs exist yet." />
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Classroom</th>
            <th style={styles.th}>Trigger</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Sent / Failed</th>
            <th style={styles.th}>Dispatch Date</th>
          </tr>
        </thead>
        <tbody>
          {props.runs.map((run) => (
            <tr key={run.id}>
              <td style={styles.td}>
                <strong>{run.classroomDisplayTitle}</strong>
                <div style={{ color: "#64748b", marginTop: 4 }}>{run.classroomCode}</div>
              </td>
              <td style={styles.td}>{run.triggerType}</td>
              <td style={styles.td}>{run.status}</td>
              <td style={styles.td}>
                {run.sentCount} / {run.failedCount}
              </td>
              <td style={styles.td}>{formatPortalDateTime(run.dispatchDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmailLogTable(props: {
  logs: EmailLogSummary[] | undefined
  error: unknown
  isLoading: boolean
}) {
  if (props.isLoading) {
    return <WorkflowStateCard message="Loading email logs..." />
  }

  if (props.error) {
    return (
      <WorkflowBanner
        tone="danger"
        message={renderQueryError(props.error, "Failed to load email logs.")}
      />
    )
  }

  if (!props.logs?.length) {
    return <WorkflowStateCard message="No low-attendance email logs exist yet." />
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Recipient</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Trigger</th>
            <th style={styles.th}>Sent</th>
          </tr>
        </thead>
        <tbody>
          {props.logs.map((log) => (
            <tr key={log.id}>
              <td style={styles.td}>
                <strong>{log.studentDisplayName ?? log.recipientEmail}</strong>
                <div style={{ color: "#64748b", marginTop: 4 }}>{log.recipientEmail}</div>
              </td>
              <td style={styles.td}>{log.status}</td>
              <td style={styles.td}>{log.triggerType ?? "Manual"}</td>
              <td style={styles.td}>{formatPortalDateTime(log.sentAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function toAnalyticsQueryKey(filters: {
  classroomId?: string | undefined
  classId?: string | undefined
  sectionId?: string | undefined
  subjectId?: string | undefined
  from?: string | undefined
  to?: string | undefined
}) {
  return {
    ...(filters.classroomId ? { classroomId: filters.classroomId } : {}),
    ...(filters.classId ? { classId: filters.classId } : {}),
    ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
    ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
  }
}
