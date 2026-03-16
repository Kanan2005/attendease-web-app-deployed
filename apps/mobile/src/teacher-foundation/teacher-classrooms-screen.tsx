import { useEffect, useState } from "react"

import {
  type TeacherClassroomCreateDraft,
  buildTeacherClassroomScopeOptions,
  createTeacherClassroomCreateDraft,
} from "../teacher-classroom-management"
import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { useTeacherSession } from "../teacher-session"
import { buildTeacherClassroomsStatus } from "../teacher-view-state"
import {
  useTeacherAssignmentsQuery,
  useTeacherClassroomsQuery,
  useTeacherCreateClassroomMutation,
} from "./queries"
import {
  TeacherErrorCard,
  TeacherLoadingCard,
  TeacherScreen,
  TeacherSessionSetupCard,
  TeacherStatusBanner,
} from "./shared-ui"
import { TeacherClassroomsCreateCard } from "./teacher-classrooms-screen-create-card"
import { TeacherClassroomsListCard } from "./teacher-classrooms-screen-list-card"

export function TeacherClassroomsScreen() {
  const { session } = useTeacherSession()
  const classroomsQuery = useTeacherClassroomsQuery()
  const assignmentsQuery = useTeacherAssignmentsQuery()
  const createClassroomMutation = useTeacherCreateClassroomMutation()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createMessage, setCreateMessage] = useState<string | null>(null)
  const createScopeOptions = buildTeacherClassroomScopeOptions(assignmentsQuery.data ?? [])
  const [createDraft, setCreateDraft] = useState<TeacherClassroomCreateDraft>(() =>
    createTeacherClassroomCreateDraft(),
  )
  const canCreateClassroom = (assignmentsQuery.data ?? []).some(
    (assignment) => assignment.canSelfCreateCourseOffering,
  )
  const classroomsError = classroomsQuery.error ?? assignmentsQuery.error
  const classroomsStatus = buildTeacherClassroomsStatus({
    hasSession: Boolean(session),
    isLoading: classroomsQuery.isLoading || assignmentsQuery.isLoading,
    errorMessage: classroomsError ? mapTeacherApiErrorToMessage(classroomsError) : null,
    classroomCount: classroomsQuery.data?.length ?? 0,
    canCreateClassroom,
  })

  useEffect(() => {
    if (!createScopeOptions.length) {
      return
    }

    if (createScopeOptions.some((option) => option.key === createDraft.selectedScopeKey)) {
      return
    }

    setCreateDraft((currentDraft: TeacherClassroomCreateDraft) => ({
      ...currentDraft,
      selectedScopeKey: createScopeOptions[0]?.key ?? "",
    }))
  }, [createDraft.selectedScopeKey, createScopeOptions])

  return (
    <TeacherScreen
      title="Classrooms"
      subtitle="Create classrooms, update course info, and keep roster, schedule, and Bluetooth attendance close to the course list."
    >
      {!session ? (
        <TeacherSessionSetupCard />
      ) : classroomsQuery.isLoading || assignmentsQuery.isLoading ? (
        <TeacherLoadingCard label="Loading teacher classrooms" />
      ) : classroomsError ? (
        <TeacherErrorCard label={mapTeacherApiErrorToMessage(classroomsError)} />
      ) : (
        <>
          <TeacherStatusBanner status={classroomsStatus} />
          <TeacherClassroomsCreateCard
            canCreateClassroom={canCreateClassroom}
            isCreateOpen={isCreateOpen}
            createMessage={createMessage}
            createScopeOptions={createScopeOptions}
            createDraft={createDraft}
            setCreateMessage={setCreateMessage}
            setIsCreateOpen={setIsCreateOpen}
            setCreateDraft={setCreateDraft}
            createClassroomMutation={createClassroomMutation}
          />
          <TeacherClassroomsListCard classrooms={classroomsQuery.data} />
        </>
      )}
    </TeacherScreen>
  )
}
