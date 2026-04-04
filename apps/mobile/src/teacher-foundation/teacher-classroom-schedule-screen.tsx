/**
 * Container for the teacher schedule screen.
 * Manages draft state, week navigation, editor state, and auto-save.
 * Every editor action (add/save/remove) immediately updates the draft
 * AND fires the save mutation — no manual "Save & Publish" step.
 */
import { useCallback, useEffect, useRef, useState } from "react"

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { getWeekDates } from "../teacher-schedule-calendar"
import {
  type TeacherScheduleDraft,
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
import {
  type EditorState,
  TeacherClassroomScheduleScreenContent,
} from "./teacher-classroom-schedule-screen-content"

type SaveStatus = "idle" | "saving" | "saved" | "error"

export function TeacherClassroomScheduleScreen(props: { classroomId: string }) {
  const { session } = useTeacherSession()
  const classroom = useTeacherClassroomDetailData(props.classroomId)
  const saveScheduleMutation = useTeacherSaveScheduleMutation(props.classroomId)

  const [draft, setDraft] = useState<TeacherScheduleDraft | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [editorState, setEditorState] = useState<EditorState>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [saveErrorText, setSaveErrorText] = useState<string | null>(null)

  // Auto-clear "Saved" indicator after 2 seconds
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize draft from server data
  useEffect(() => {
    if (classroom.scheduleQuery.data && draft === null) {
      setDraft(createTeacherScheduleDraft(classroom.scheduleQuery.data))
    }
  }, [classroom.scheduleQuery.data, draft])

  /**
   * Persist a draft to the server. Computes the diff against the
   * original server state and fires the save mutation.
   */
  const persistDraft = useCallback(
    (nextDraft: TeacherScheduleDraft) => {
      if (!classroom.scheduleQuery.data) return

      const saveRequest = buildTeacherScheduleSaveRequest({
        original: classroom.scheduleQuery.data,
        draft: nextDraft,
      })

      if (!saveRequest) return

      setSaveStatus("saving")
      setSaveErrorText(null)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)

      saveScheduleMutation.mutate(saveRequest, {
        onSuccess: (nextSchedule) => {
          setDraft(createTeacherScheduleDraft(nextSchedule))
          setSaveStatus("saved")
          savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000)
        },
        onError: (error) => {
          setSaveStatus("error")
          setSaveErrorText(mapTeacherApiErrorToMessage(error))
        },
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutation ref is stable
    [classroom.scheduleQuery.data],
  )

  // ── Editor action callbacks ──

  /**
   * Compute the ISO date string for a given weekday in the currently viewed week.
   * Used to create date-specific exceptions when "Apply to all" is unchecked.
   */
  const getEffectiveDateForWeekday = useCallback(
    (weekday: number): string => {
      const dates = getWeekDates(weekOffset)
      const match = dates.find((d) => d.weekday === weekday)
      return match ? `${match.isoDate}T00:00:00.000Z` : new Date().toISOString()
    },
    [weekOffset],
  )

  const handleSlotSave = useCallback(
    (data: {
      localId: string | null
      weekdays: number[]
      startMinutes: number
      endMinutes: number
      locationLabel: string
      applyToAll: boolean
    }) => {
      if (!draft) return

      let nextDraft = draft

      if (data.localId) {
        if (data.applyToAll) {
          // Edit the recurring slot definition (affects every week)
          nextDraft = updateTeacherWeeklySlotDraft(nextDraft, data.localId, {
            startMinutes: data.startMinutes,
            endMinutes: data.endMinutes,
            locationLabel: data.locationLabel,
          })
        } else {
          // Single-instance edit: create a RESCHEDULED exception for this week only
          const slot = draft.slots.find((s) => s.localId === data.localId)
          if (slot) {
            nextDraft = addTeacherScheduleExceptionDraft(nextDraft, {
              exceptionType: "RESCHEDULED",
              scheduleSlotId: slot.existingId ?? slot.localId,
              effectiveDate: getEffectiveDateForWeekday(slot.weekday),
              startMinutes: data.startMinutes,
              endMinutes: data.endMinutes,
              locationLabel: data.locationLabel,
            })
          }
        }
      } else {
        // Add new slot(s) — one per selected weekday
        for (const wd of data.weekdays) {
          nextDraft = addTeacherWeeklySlotDraft(nextDraft, {
            weekday: wd,
            startMinutes: data.startMinutes,
            endMinutes: data.endMinutes,
            locationLabel: data.locationLabel,
          })
        }
      }

      setDraft(nextDraft)
      setEditorState(null)
      persistDraft(nextDraft)
    },
    [draft, persistDraft, getEffectiveDateForWeekday],
  )

  const handleSlotRemove = useCallback(
    (localId: string, applyToAll: boolean) => {
      if (!draft) return

      let nextDraft: TeacherScheduleDraft

      if (applyToAll) {
        // Archive the recurring slot entirely (removes from all weeks)
        nextDraft = removeTeacherWeeklySlotDraft(draft, localId)
      } else {
        // Single-instance cancel: create a CANCELLED exception for this week's date
        const slot = draft.slots.find((s) => s.localId === localId)
        if (!slot) return
        nextDraft = addTeacherScheduleExceptionDraft(draft, {
          exceptionType: "CANCELLED",
          scheduleSlotId: slot.existingId ?? slot.localId,
          effectiveDate: getEffectiveDateForWeekday(slot.weekday),
          startMinutes: null,
          endMinutes: null,
        })
      }

      setDraft(nextDraft)
      setEditorState(null)
      persistDraft(nextDraft)
    },
    [draft, persistDraft, getEffectiveDateForWeekday],
  )

  const handleExtraSave = useCallback(
    (data: {
      localId: string | null
      effectiveDate: string
      startMinutes: number
      endMinutes: number
      locationLabel: string
      reason: string
    }) => {
      if (!draft) return

      let nextDraft = draft

      if (data.localId) {
        nextDraft = updateTeacherScheduleExceptionDraft(nextDraft, data.localId, {
          effectiveDate: data.effectiveDate,
          startMinutes: data.startMinutes,
          endMinutes: data.endMinutes,
          locationLabel: data.locationLabel,
          reason: data.reason,
        })
      } else {
        nextDraft = addTeacherScheduleExceptionDraft(nextDraft, {
          exceptionType: "ONE_OFF",
          effectiveDate: data.effectiveDate,
          startMinutes: data.startMinutes,
          endMinutes: data.endMinutes,
          locationLabel: data.locationLabel,
          reason: data.reason,
        })
      }

      setDraft(nextDraft)
      setEditorState(null)
      persistDraft(nextDraft)
    },
    [draft, persistDraft],
  )

  const handleExtraRemove = useCallback(
    (localId: string) => {
      if (!draft) return

      // Remove the exception from the draft
      const nextDraft: TeacherScheduleDraft = {
        ...draft,
        exceptions: draft.exceptions.filter((e) => e.localId !== localId),
      }
      setDraft(nextDraft)
      setEditorState(null)
      persistDraft(nextDraft)
    },
    [draft, persistDraft],
  )

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
      draft={draft}
      weekOffset={weekOffset}
      saveStatus={saveStatus}
      saveErrorText={saveErrorText}
      editorState={editorState}
      onSetWeekOffset={setWeekOffset}
      onSetEditorState={setEditorState}
      onSlotSave={handleSlotSave}
      onSlotRemove={handleSlotRemove}
      onExtraSave={handleExtraSave}
      onExtraRemove={handleExtraRemove}
    />
  )
}
