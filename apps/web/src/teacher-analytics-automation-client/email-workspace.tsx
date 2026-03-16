"use client"

import type { EmailAutomationRuleSummary } from "@attendease/contracts"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import {
  buildLowAttendancePreviewRequest,
  buildTeacherEmailAutomationRuleRequest,
  createTeacherEmailAutomationRuleDraft,
  createTeacherLowAttendanceEmailDraft,
} from "../teacher-analytics-automation"
import { webWorkflowQueryKeys } from "../web-workflows"
import { TeacherPreviewSendSection } from "./preview-send-section"
import { TeacherAutomationRuleSection, TeacherExistingRulesSection } from "./rule-form-section"
import { WorkflowBanner, WorkflowStateCard, teacherAnalyticsAutomationBootstrap } from "./shared"
import { teacherAnalyticsStyles as styles } from "./styles"

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
      teacherAnalyticsAutomationBootstrap.authClient.listClassrooms(props.accessToken ?? "", {
        status: "ACTIVE",
      }),
  })
  const rulesQuery = useQuery({
    queryKey: webWorkflowQueryKeys.emailAutomationRules({}),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      teacherAnalyticsAutomationBootstrap.authClient.listEmailAutomationRules(
        props.accessToken ?? "",
        {},
      ),
  })
  const runsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.emailDispatchRuns({}),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      teacherAnalyticsAutomationBootstrap.authClient.listEmailDispatchRuns(
        props.accessToken ?? "",
        {},
      ),
  })
  const logsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.emailLogs({}),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      teacherAnalyticsAutomationBootstrap.authClient.listEmailLogs(props.accessToken ?? "", {}),
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
      teacherAnalyticsAutomationBootstrap.authClient.createEmailAutomationRule(
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
      teacherAnalyticsAutomationBootstrap.authClient.updateEmailAutomationRule(
        props.accessToken ?? "",
        input.ruleId,
        {
          status: input.status,
        },
      ),
    onSuccess: async () => {
      setStatusMessage("Updated the automation rule.")
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.emailAutomationRules({}),
      })
    },
  })
  const previewMutation = useMutation({
    mutationFn: () =>
      teacherAnalyticsAutomationBootstrap.authClient.previewLowAttendanceEmail(
        props.accessToken ?? "",
        buildLowAttendancePreviewRequest(previewDraft),
      ),
  })
  const manualSendMutation = useMutation({
    mutationFn: () =>
      teacherAnalyticsAutomationBootstrap.authClient.sendManualLowAttendanceEmail(
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

      <TeacherAutomationRuleSection
        accessToken={props.accessToken}
        classroomsQuery={classroomsQuery}
        ruleDraft={ruleDraft}
        setRuleDraft={setRuleDraft}
        createRuleMutation={createRuleMutation}
        clearStatus={() => setStatusMessage(null)}
      />
      <TeacherExistingRulesSection
        rulesQuery={rulesQuery}
        updateRuleMutation={updateRuleMutation}
        clearStatus={() => setStatusMessage(null)}
      />
      <TeacherPreviewSendSection
        accessToken={props.accessToken}
        previewDraft={previewDraft}
        setPreviewDraft={setPreviewDraft}
        rulesQuery={rulesQuery}
        previewMutation={previewMutation}
        manualSendMutation={manualSendMutation}
        runsQuery={runsQuery}
        logsQuery={logsQuery}
        clearStatus={() => setStatusMessage(null)}
      />
    </div>
  )
}
