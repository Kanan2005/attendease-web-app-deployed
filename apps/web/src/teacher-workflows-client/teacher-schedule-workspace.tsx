"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { WebSectionCard } from "../web-shell"
import {
  buildScheduleSavePayload,
  createScheduleDraftState,
  webWorkflowQueryKeys,
} from "../web-workflows"

import { WorkflowBanner, WorkflowStateCard, bootstrap, workflowStyles } from "./shared"
import { TeacherScheduleDateExceptionsSection } from "./teacher-schedule-workspace/date-exceptions-section"
import { TeacherScheduleSaveNotifySection } from "./teacher-schedule-workspace/save-notify-section"
import { TeacherScheduleWeeklySlotsSection } from "./teacher-schedule-workspace/weekly-slots-section"

export function TeacherScheduleWorkspace(props: {
  accessToken: string | null
  classroomId: string
}) {
  const queryClient = useQueryClient()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [saveNote, setSaveNote] = useState(
    "Schedule saved and published from the teacher web route.",
  )
  const [draft, setDraft] = useState<ReturnType<typeof createScheduleDraftState> | null>(null)

  const detailQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomDetail(props.classroomId),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.getClassroom(props.accessToken ?? "", props.classroomId),
  })
  const scheduleQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomSchedule(props.classroomId),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.getClassroomSchedule(props.accessToken ?? "", props.classroomId),
  })

  useEffect(() => {
    if (!scheduleQuery.data) {
      return
    }

    setDraft(createScheduleDraftState(scheduleQuery.data))
  }, [scheduleQuery.data])

  const saveSchedule = useMutation({
    mutationFn: async () => {
      if (!props.accessToken || !scheduleQuery.data || !draft) {
        throw new Error("Schedule save requires a classroom, a web session, and a draft state.")
      }

      const payload = buildScheduleSavePayload({
        original: scheduleQuery.data,
        draft,
        note: saveNote,
      })

      if (!payload) {
        throw new Error("No schedule changes are waiting in the draft buffer.")
      }

      return bootstrap.authClient.saveAndNotifyClassroomSchedule(
        props.accessToken,
        props.classroomId,
        payload,
      )
    },
    onSuccess: async (schedule) => {
      setStatusMessage("Saved the schedule draft and queued the notification outbox event.")
      setDraft(createScheduleDraftState(schedule))
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.classroomSchedule(props.classroomId),
      })
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to save the schedule.")
    },
  })

  if (!props.accessToken) {
    return (
      <WorkflowStateCard message="No web access token is available for schedule editing yet." />
    )
  }

  if (scheduleQuery.isLoading || !draft) {
    return <WorkflowStateCard message="Loading schedule draft..." />
  }

  if (scheduleQuery.isError || !scheduleQuery.data) {
    return (
      <WorkflowBanner
        tone="danger"
        message={
          scheduleQuery.error instanceof Error
            ? scheduleQuery.error.message
            : "Failed to load the classroom schedule."
        }
      />
    )
  }

  return (
    <div style={workflowStyles.grid}>
      <WebSectionCard
        title={detailQuery.data ? `${detailQuery.data.displayTitle} schedule` : "Schedule draft"}
        description="This page keeps weekly slots and date exceptions in local draft state until the teacher clicks Save & Notify."
      >
        Keep weekly slots and date exceptions in local draft state until the teacher clicks Save &
        Notify.
      </WebSectionCard>

      <TeacherScheduleWeeklySlotsSection draft={draft} setDraft={setDraft} />
      <TeacherScheduleDateExceptionsSection
        draft={draft}
        setDraft={setDraft}
        schedule={scheduleQuery.data}
      />
      <TeacherScheduleSaveNotifySection
        saveNote={saveNote}
        setSaveNote={setSaveNote}
        statusMessage={statusMessage}
        savePending={saveSchedule.isPending}
        onSave={() => saveSchedule.mutate()}
      />
    </div>
  )
}
