"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import {
  buildTeacherWebClassroomUpdateRequest,
  createTeacherWebClassroomEditDraft,
  hasTeacherWebClassroomEditChanges,
} from "../teacher-classroom-management"
import { webWorkflowQueryKeys } from "../web-workflows"

import { WorkflowBanner, WorkflowStateCard, bootstrap, workflowStyles } from "./shared"
import { TeacherClassroomSettingsCard } from "./teacher-classroom-detail-workspace/course-settings-card"
import { TeacherClassroomOverviewCard } from "./teacher-classroom-detail-workspace/overview-card"
import {
  TeacherClassroomNextToolsCard,
  TeacherClassroomQrLaunchCard,
  TeacherClassroomRecentSessionsCard,
} from "./teacher-classroom-detail-workspace/tools-card"

export function TeacherClassroomDetailWorkspace(props: {
  accessToken: string | null
  classroomId: string
}) {
  const queryClient = useQueryClient()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [form, setForm] = useState<ReturnType<typeof createTeacherWebClassroomEditDraft> | null>(
    null,
  )

  const detailQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomDetail(props.classroomId),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.getClassroom(props.accessToken ?? "", props.classroomId),
  })
  const joinCodeQuery = useQuery({
    queryKey: ["web-workflows", "classroom-join-code", props.classroomId],
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.getClassroomJoinCode(props.accessToken ?? "", props.classroomId),
  })
  const lecturesQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomLectures(props.classroomId),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listClassroomLectures(props.accessToken ?? "", props.classroomId),
  })

  useEffect(() => {
    if (!detailQuery.data) {
      return
    }

    setForm((current) => current ?? createTeacherWebClassroomEditDraft(detailQuery.data))
  }, [detailQuery.data])

  const updateClassroom = useMutation({
    mutationFn: async () => {
      const currentClassroom = detailQuery.data

      if (!props.accessToken || !form || !currentClassroom) {
        throw new Error("Classroom update requires a loaded web session and classroom detail.")
      }

      if (!hasTeacherWebClassroomEditChanges(currentClassroom, form)) {
        throw new Error("No course changes are waiting to be saved.")
      }

      return bootstrap.authClient.updateClassroom(
        props.accessToken,
        props.classroomId,
        buildTeacherWebClassroomUpdateRequest(currentClassroom, form),
      )
    },
    onSuccess: async (updated) => {
      setStatusMessage(`Saved changes for ${updated.classroomTitle ?? updated.displayTitle}.`)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classroomDetail(props.classroomId),
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classrooms(),
        }),
      ])
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to update the classroom.")
    },
  })

  const resetJoinCode = useMutation({
    mutationFn: async () => {
      if (!props.accessToken) {
        throw new Error("Join-code reset requires an authenticated teacher or admin session.")
      }

      return bootstrap.authClient.resetClassroomJoinCode(props.accessToken, props.classroomId)
    },
    onSuccess: async (joinCode) => {
      setStatusMessage(`Rotated join code to ${joinCode.code}.`)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["web-workflows", "classroom-join-code", props.classroomId],
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classrooms(),
        }),
      ])
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to rotate the join code.")
    },
  })

  const archiveClassroom = useMutation({
    mutationFn: async () => {
      if (!props.accessToken) {
        throw new Error("Archiving a classroom requires an authenticated teacher or admin session.")
      }

      return bootstrap.authClient.archiveClassroom(props.accessToken, props.classroomId)
    },
    onSuccess: async (archived) => {
      setStatusMessage(`Archived ${archived.classroomTitle ?? archived.displayTitle}.`)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classroomDetail(props.classroomId),
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classrooms(),
        }),
      ])
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to archive the classroom.")
    },
  })

  if (!props.accessToken) {
    return <WorkflowStateCard message="Sign in to open this classroom." />
  }

  if (detailQuery.isLoading || !form) {
    return <WorkflowStateCard message="Loading classroom detail..." />
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <WorkflowBanner
        tone="danger"
        message={
          detailQuery.error instanceof Error
            ? detailQuery.error.message
            : "Failed to load the classroom detail."
        }
      />
    )
  }

  const classroom = detailQuery.data
  const canEditCourseInfo =
    classroom.permissions?.canEditCourseInfo ?? classroom.permissions?.canEdit ?? true
  const canArchive = classroom.permissions?.canArchive ?? false

  return (
    <div style={workflowStyles.grid}>
      <TeacherClassroomOverviewCard
        classroom={classroom}
        joinCode={joinCodeQuery.data?.code ?? null}
      />

      <div style={workflowStyles.twoColumn}>
        <TeacherClassroomSettingsCard
          classroom={classroom}
          form={form}
          canEditCourseInfo={canEditCourseInfo}
          canArchive={canArchive}
          updatePending={updateClassroom.isPending}
          joinCodePending={resetJoinCode.isPending}
          archivePending={archiveClassroom.isPending}
          setForm={setForm}
          onSave={() => updateClassroom.mutate()}
          onResetJoinCode={() => resetJoinCode.mutate()}
          onArchive={() => archiveClassroom.mutate()}
        />

        <div style={workflowStyles.grid}>
          <TeacherClassroomNextToolsCard classroomId={props.classroomId} />
          <TeacherClassroomQrLaunchCard classroomId={props.classroomId} classroom={classroom} />
          <TeacherClassroomRecentSessionsCard
            lectures={lecturesQuery.data}
            loading={lecturesQuery.isLoading}
            error={lecturesQuery.error}
          />
        </div>
      </div>

      {statusMessage ? <WorkflowBanner tone="info" message={statusMessage} /> : null}
    </div>
  )
}
