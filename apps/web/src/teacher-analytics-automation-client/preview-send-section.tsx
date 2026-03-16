import type {
  EmailAutomationRuleSummary,
  EmailDispatchRunSummary,
  EmailLogSummary,
  LowAttendanceEmailPreviewResponse,
} from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query"
import type { Dispatch, SetStateAction } from "react"

import type { TeacherLowAttendanceEmailDraft } from "../teacher-analytics-automation"
import { WebSectionCard } from "../web-shell"
import { WorkflowBanner, WorkflowStateCard, renderQueryError } from "./shared"
import { teacherAnalyticsStyles as styles } from "./styles"
import { DispatchRunTable, EmailLogTable } from "./tables"

export function TeacherPreviewSendSection(props: {
  accessToken: string | null
  previewDraft: TeacherLowAttendanceEmailDraft
  setPreviewDraft: Dispatch<SetStateAction<TeacherLowAttendanceEmailDraft>>
  rulesQuery: UseQueryResult<EmailAutomationRuleSummary[]>
  previewMutation: UseMutationResult<LowAttendanceEmailPreviewResponse, unknown, void, unknown>
  manualSendMutation: UseMutationResult<unknown, unknown, void, unknown>
  runsQuery: UseQueryResult<EmailDispatchRunSummary[]>
  logsQuery: UseQueryResult<EmailLogSummary[]>
  clearStatus: () => void
}) {
  return (
    <>
      <WebSectionCard
        title="Preview And Manual Send"
        description="Manual preview and manual send use the same recipient-selection truth as the automated scheduler."
      >
        <div style={styles.formGrid}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Rule</span>
            <select
              value={props.previewDraft.ruleId}
              onChange={(event) =>
                props.setPreviewDraft((current) => ({
                  ...current,
                  ruleId: event.target.value,
                }))
              }
              style={styles.input}
            >
              <option value="">Select rule</option>
              {props.rulesQuery.data?.map((rule) => (
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
              value={props.previewDraft.fromDate}
              onChange={(event) =>
                props.setPreviewDraft((current) => ({
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
              value={props.previewDraft.toDate}
              onChange={(event) =>
                props.setPreviewDraft((current) => ({
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
              value={props.previewDraft.thresholdPercent}
              onChange={(event) =>
                props.setPreviewDraft((current) => ({
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
              value={props.previewDraft.templateSubject}
              onChange={(event) =>
                props.setPreviewDraft((current) => ({
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
              value={props.previewDraft.templateBody}
              onChange={(event) =>
                props.setPreviewDraft((current) => ({
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
                props.clearStatus()
                props.previewMutation.mutate()
              }}
              disabled={
                !props.accessToken || !props.previewDraft.ruleId || props.previewMutation.isPending
              }
            >
              {props.previewMutation.isPending ? "Rendering..." : "Preview email"}
            </button>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={() => {
                props.clearStatus()
                props.manualSendMutation.mutate()
              }}
              disabled={
                !props.accessToken ||
                !props.previewDraft.ruleId ||
                props.manualSendMutation.isPending
              }
            >
              {props.manualSendMutation.isPending ? "Queueing..." : "Send manually"}
            </button>
          </div>
        </div>

        {props.previewMutation.isError ? (
          <WorkflowBanner
            tone="danger"
            message={renderQueryError(
              props.previewMutation.error,
              "Failed to render the email preview.",
            )}
          />
        ) : null}
        {props.manualSendMutation.isError ? (
          <WorkflowBanner
            tone="danger"
            message={renderQueryError(
              props.manualSendMutation.error,
              "Failed to queue the manual email run.",
            )}
          />
        ) : null}

        {props.previewMutation.data ? (
          <div style={{ ...styles.split, marginTop: 18 }}>
            <div style={styles.card}>
              <h4 style={{ marginTop: 0 }}>Preview</h4>
              <p style={{ marginTop: 0, color: webTheme.colors.textMuted }}>
                {props.previewMutation.data.recipientCount} recipients selected below{" "}
                {props.previewMutation.data.thresholdPercent}%.
              </p>
              <p style={{ marginBottom: 8 }}>
                <strong>Subject:</strong> {props.previewMutation.data.previewSubject}
              </p>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                  background: webTheme.colors.surfaceMuted,
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                {props.previewMutation.data.previewText}
              </pre>
            </div>
            <div style={styles.card}>
              <h4 style={{ marginTop: 0 }}>Sample Recipients</h4>
              {props.previewMutation.data.sampleRecipients.length ? (
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
                      {props.previewMutation.data.sampleRecipients.map((recipient) => (
                        <tr key={recipient.studentId}>
                          <td style={styles.td}>
                            <strong>{recipient.studentDisplayName}</strong>
                            <div style={{ color: webTheme.colors.textSubtle, marginTop: 4 }}>
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
            runs={props.runsQuery.data}
            error={props.runsQuery.error}
            isLoading={props.runsQuery.isLoading}
          />
        </WebSectionCard>

        <WebSectionCard
          title="Email Logs"
          description="Email logs stay distinct from attendance truth and help support review delivery outcomes."
        >
          <EmailLogTable
            logs={props.logsQuery.data}
            error={props.logsQuery.error}
            isLoading={props.logsQuery.isLoading}
          />
        </WebSectionCard>
      </div>
    </>
  )
}
