import type {
  AnalyticsComparisonsResponse,
  AnalyticsDistributionResponse,
  AnalyticsModeUsageResponse,
  AnalyticsTrendResponse,
  EmailDispatchRunSummary,
  EmailLogSummary,
} from "@attendease/contracts"

import { formatPortalDateTime } from "../web-workflows"
import { WorkflowBanner, WorkflowStateCard, renderQueryError } from "./shared"
import { teacherAnalyticsStyles as styles } from "./styles"

export function MetricCard(props: { label: string; value: string }) {
  return (
    <div style={styles.card}>
      <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 14 }}>{props.label}</p>
      <p style={{ margin: 0, color: "#0f172a", fontSize: 28, fontWeight: 700 }}>{props.value}</p>
    </div>
  )
}

export function TrendTable(props: {
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

export function DistributionCard(props: {
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

export function ComparisonCards(props: {
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

export function ModeUsageTable(props: {
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

export function DispatchRunTable(props: {
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

export function EmailLogTable(props: {
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
