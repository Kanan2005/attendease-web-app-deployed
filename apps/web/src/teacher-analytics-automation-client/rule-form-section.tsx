import type { EmailAutomationRuleSummary } from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query"
import type { Dispatch, SetStateAction } from "react"

import type { TeacherEmailAutomationRuleDraft } from "../teacher-analytics-automation"
import { WebSectionCard } from "../web-shell"
import { formatPortalDateTime } from "../web-workflows"
import { WorkflowBanner, WorkflowStateCard, renderQueryError } from "./shared"
import { teacherAnalyticsStyles as styles } from "./styles"

type ClassroomOption = {
  id: string
  displayTitle: string
}

export function TeacherAutomationRuleSection(props: {
  accessToken: string | null
  classroomsQuery: UseQueryResult<ClassroomOption[]>
  ruleDraft: TeacherEmailAutomationRuleDraft
  setRuleDraft: Dispatch<SetStateAction<TeacherEmailAutomationRuleDraft>>
  createRuleMutation: UseMutationResult<unknown, unknown, void, unknown>
  clearStatus: () => void
}) {
  return (
    <WebSectionCard
      title="Automation Rule"
      description="Automation rules control daily low-attendance checks, template defaults, and per-classroom schedule timing."
    >
      <div style={styles.formGrid}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Classroom</span>
          <select
            value={props.ruleDraft.classroomId}
            onChange={(event) =>
              props.setRuleDraft((current) => ({
                ...current,
                classroomId: event.target.value,
              }))
            }
            style={styles.input}
          >
            <option value="">Select classroom</option>
            {props.classroomsQuery.data?.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.displayTitle}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Threshold percent</span>
          <input
            value={props.ruleDraft.thresholdPercent}
            onChange={(event) =>
              props.setRuleDraft((current) => ({
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
            value={props.ruleDraft.scheduleHourLocal}
            onChange={(event) =>
              props.setRuleDraft((current) => ({
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
            value={props.ruleDraft.scheduleMinuteLocal}
            onChange={(event) =>
              props.setRuleDraft((current) => ({
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
            value={props.ruleDraft.timezone}
            onChange={(event) =>
              props.setRuleDraft((current) => ({
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
            value={props.ruleDraft.status}
            onChange={(event) =>
              props.setRuleDraft((current) => ({
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
            value={props.ruleDraft.templateSubject}
            onChange={(event) =>
              props.setRuleDraft((current) => ({
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
            value={props.ruleDraft.templateBody}
            onChange={(event) =>
              props.setRuleDraft((current) => ({
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
              props.clearStatus()
              props.createRuleMutation.mutate()
            }}
            disabled={!props.accessToken || props.createRuleMutation.isPending}
          >
            {props.createRuleMutation.isPending ? "Creating..." : "Create rule"}
          </button>
        </div>
        {props.createRuleMutation.isError ? (
          <WorkflowBanner
            tone="danger"
            message={renderQueryError(
              props.createRuleMutation.error,
              "Failed to create the automation rule.",
            )}
          />
        ) : null}
      </div>
    </WebSectionCard>
  )
}

export function TeacherExistingRulesSection(props: {
  rulesQuery: UseQueryResult<EmailAutomationRuleSummary[]>
  updateRuleMutation: UseMutationResult<
    unknown,
    unknown,
    {
      ruleId: string
      status: EmailAutomationRuleSummary["status"]
    },
    unknown
  >
  clearStatus: () => void
}) {
  return (
    <WebSectionCard
      title="Existing Rules"
      description="Teachers can review current automation state and quickly pause or resume delivery without affecting historical logs."
    >
      {props.rulesQuery.isLoading ? (
        <WorkflowStateCard message="Loading automation rules..." />
      ) : props.rulesQuery.isError ? (
        <WorkflowBanner
          tone="danger"
          message={renderQueryError(props.rulesQuery.error, "Failed to load automation rules.")}
        />
      ) : props.rulesQuery.data?.length ? (
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
              {props.rulesQuery.data.map((rule) => (
                <tr key={rule.id}>
                  <td style={styles.td}>
                    <strong>{rule.classroomDisplayTitle}</strong>
                    <div style={{ color: webTheme.colors.textSubtle, marginTop: 4 }}>
                      {rule.classroomCode}
                    </div>
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
                      disabled={props.updateRuleMutation.isPending}
                      onClick={() => {
                        props.clearStatus()
                        props.updateRuleMutation.mutate({
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
  )
}
