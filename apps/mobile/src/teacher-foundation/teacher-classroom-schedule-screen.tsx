import { useEffect, useState } from "react"

import { buildTeacherSchedulingPreview } from "../academic-management"
import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { teacherRoutes } from "../teacher-routes"
import {
  addTeacherScheduleExceptionDraft,
  addTeacherWeeklySlotDraft,
  buildTeacherScheduleSaveRequest,
  createTeacherScheduleDraft,
  removeTeacherWeeklySlotDraft,
  updateTeacherScheduleExceptionDraft,
  updateTeacherWeeklySlotDraft,
} from "../teacher-schedule-draft"
import { useTeacherSession } from "../teacher-session"
import { useTeacherClassroomDetailData, useTeacherSaveScheduleMutation } from "./queries"
import { TeacherClassroomScheduleScreenContent } from "./teacher-classroom-schedule-screen-content"

export function TeacherClassroomScheduleScreen(props: { classroomId: string }) {
  const { session } = useTeacherSession()
  const classroom = useTeacherClassroomDetailData(props.classroomId)
  const classroomContext = teacherRoutes.classroomContext(props.classroomId)
  const saveScheduleMutation = useTeacherSaveScheduleMutation(props.classroomId)
  const preview = buildTeacherSchedulingPreview({
    classroomCount: classroom.detailQuery.data ? 1 : 0,
    slotCount: classroom.scheduleQuery.data?.scheduleSlots.length ?? 0,
    exceptionCount: classroom.scheduleQuery.data?.scheduleExceptions.length ?? 0,
    lectureCount: classroom.lecturesQuery.data?.length ?? 0,
  })
  const [draft, setDraft] = useState<ReturnType<typeof createTeacherScheduleDraft> | null>(null)
  const [scheduleNote, setScheduleNote] = useState("")
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null)

  useEffect(() => {
    if (classroom.scheduleQuery.data && draft === null) {
      setDraft(createTeacherScheduleDraft(classroom.scheduleQuery.data))
    }
  }, [classroom.scheduleQuery.data, draft])

  const saveRequest =
    classroom.scheduleQuery.data && draft
      ? buildTeacherScheduleSaveRequest({
          original: classroom.scheduleQuery.data,
          draft,
          note: scheduleNote,
        })
      : null

  return (
    <TeacherClassroomScheduleScreenContent
      hasSession={Boolean(session)}
      isLoading={
        classroom.detailQuery.isLoading ||
        classroom.scheduleQuery.isLoading ||
        classroom.lecturesQuery.isLoading
      }
      loadErrorMessage={
        classroom.detailQuery.error ||
        classroom.scheduleQuery.error ||
        classroom.lecturesQuery.error
          ? mapTeacherApiErrorToMessage(
              classroom.detailQuery.error ??
                classroom.scheduleQuery.error ??
                classroom.lecturesQuery.error,
            )
          : null
      }
      classroomTitle={classroom.detailQuery.data?.displayTitle ?? "Classroom"}
      previewTitle={preview.title}
      previewMessage={preview.message}
      routeLinks={{
        bluetoothCreate: classroomContext.bluetoothCreate,
        detail: classroomContext.detail,
        lectures: classroomContext.lectures,
      }}
      schedulePreviewMessage="Teacher mobile now keeps a local draft calendar flow on top of the live schedule API so weekly and date-specific changes can be reviewed before save-and-notify."
      draft={draft}
      saveMessage={scheduleMessage}
      isSavePending={saveScheduleMutation.isPending}
      canSave={Boolean(saveRequest)}
      saveNote={scheduleNote}
      saveErrorMessage={
        saveScheduleMutation.error ? mapTeacherApiErrorToMessage(saveScheduleMutation.error) : null
      }
      onDiscardDraft={() => {
        if (classroom.scheduleQuery.data) {
          setDraft(createTeacherScheduleDraft(classroom.scheduleQuery.data))
          setScheduleNote("")
          setScheduleMessage("Draft reset to the live classroom schedule.")
        }
      }}
      onAddWeeklySlot={() =>
        setDraft((currentDraft) =>
          currentDraft ? addTeacherWeeklySlotDraft(currentDraft) : currentDraft,
        )
      }
      onAddOneOffException={() =>
        setDraft((currentDraft) =>
          currentDraft
            ? addTeacherScheduleExceptionDraft(currentDraft, {
                exceptionType: "ONE_OFF",
              })
            : currentDraft,
        )
      }
      onAddCancellation={() =>
        setDraft((currentDraft) =>
          currentDraft
            ? addTeacherScheduleExceptionDraft(currentDraft, {
                exceptionType: "CANCELLED",
                startMinutes: null,
                endMinutes: null,
              })
            : currentDraft,
        )
      }
      onAddReschedule={() =>
        setDraft((currentDraft) =>
          currentDraft
            ? addTeacherScheduleExceptionDraft(currentDraft, {
                exceptionType: "RESCHEDULED",
              })
            : currentDraft,
        )
      }
      onUpdateSlot={(localId, patch) => {
        setDraft((currentDraft) =>
          currentDraft ? updateTeacherWeeklySlotDraft(currentDraft, localId, patch) : currentDraft,
        )
      }}
      onRemoveSlot={(localId) => {
        setDraft((currentDraft) =>
          currentDraft ? removeTeacherWeeklySlotDraft(currentDraft, localId) : currentDraft,
        )
      }}
      onUpdateException={(localId, patch) => {
        setDraft((currentDraft) =>
          currentDraft
            ? updateTeacherScheduleExceptionDraft(currentDraft, localId, patch)
            : currentDraft,
        )
      }}
      onSetSaveNote={setScheduleNote}
      onSave={() => {
        if (!saveRequest) {
          return
        }

        setScheduleMessage(null)
        saveScheduleMutation.mutate(saveRequest, {
          onSuccess: (nextSchedule) => {
            setDraft(createTeacherScheduleDraft(nextSchedule))
            setScheduleNote("")
            setScheduleMessage("Saved classroom calendar changes and triggered notify flow.")
          },
        })
      }}
    />
  )
}
