"use client"

import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useState } from "react"

import {
  type WeekCalendarEvent,
  buildScheduleSavePayload,
  createScheduleDraftState,
  minutesToTimeString,
  webWorkflowQueryKeys,
} from "../web-workflows"
import type { ScheduleDraftState, ScheduleExceptionDraft, ScheduleSlotDraft } from "../web-workflows-types"

import { WorkflowBanner, WorkflowStateCard, bootstrap, useAuthRedirect, workflowStyles } from "./shared"
import {
  ExtraLecturePanel,
  SlotEditorPanel,
} from "./teacher-schedule-workspace/date-exceptions-section"
import { ScheduleActionBar } from "./teacher-schedule-workspace/save-notify-section"
import { WeekCalendarGrid } from "./teacher-schedule-workspace/weekly-slots-section"

type EditorMode =
  | { type: "none" }
  | { type: "add-slot" }
  | { type: "edit-slot"; slotDraft: ScheduleSlotDraft }
  | { type: "add-extra" }
  | { type: "edit-extra"; exceptionDraft: ScheduleExceptionDraft }

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export function TeacherScheduleWorkspace(props: {
  accessToken: string | null
  classroomId: string
}) {
  useAuthRedirect(props.accessToken)

  const queryClient = useQueryClient()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusTone, setStatusTone] = useState<"info" | "danger" | "success">("info")
  const [draft, setDraft] = useState<ScheduleDraftState | null>(null)
  const [editor, setEditor] = useState<EditorMode>({ type: "none" })

  // Week navigation: 0 = current week
  const [weekOffset, setWeekOffset] = useState(0)

  const currentMonday = useMemo(() => getMondayOfWeek(new Date()), [])
  const viewedMonday = useMemo(() => {
    const d = new Date(currentMonday)
    d.setDate(d.getDate() + weekOffset * 7)
    return d
  }, [currentMonday, weekOffset])
  const weekDates = useMemo(() => getWeekDates(viewedMonday), [viewedMonday])
  const isCurrentWeek = weekOffset === 0

  const scheduleQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomSchedule(props.classroomId),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.getClassroomSchedule(props.accessToken ?? "", props.classroomId),
  })

  useEffect(() => {
    if (scheduleQuery.data) {
      setDraft(createScheduleDraftState(scheduleQuery.data))
    }
  }, [scheduleQuery.data])

  const saveSchedule = useMutation({
    mutationFn: async (draftToSave: ScheduleDraftState) => {
      if (!props.accessToken || !scheduleQuery.data) {
        throw new Error("Schedule save requires a valid session and draft.")
      }
      const payload = buildScheduleSavePayload({
        original: scheduleQuery.data,
        draft: draftToSave,
        note: "Schedule updated from web.",
      })
      if (!payload) {
        throw new Error("No changes to save.")
      }
      return bootstrap.authClient.saveAndNotifyClassroomSchedule(
        props.accessToken,
        props.classroomId,
        payload,
      )
    },
    onSuccess: async (schedule) => {
      setStatusMessage("Saved.")
      setStatusTone("success")
      setDraft(createScheduleDraftState(schedule))
      setEditor({ type: "none" })
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.classroomSchedule(props.classroomId),
      })
    },
    onError: (error) => {
      setStatusTone("danger")
      setStatusMessage(error instanceof Error ? error.message : "Failed to save.")
    },
  })

  /**
   * Save handler from the SlotEditorPanel. Accepts an array of slots so that
   * multi-weekday additions arrive in a single call (avoiding stale-closure batching bugs).
   * When `applyToAll` is true (edit mode only), update every ACTIVE sibling
   * on the same weekday with the same original time.
   */
  function handleSlotSave(slots: ScheduleSlotDraft[], applyToAll: boolean) {
    if (!draft) return

    let newDraft: ScheduleDraftState

    const firstSlot = slots[0]
    if (!firstSlot) return

    if (!firstSlot.id) {
      // Add mode — append all new slots at once
      newDraft = { ...draft, slots: [...draft.slots, ...slots] }
    } else {
      // Edit mode — single slot
      const original = draft.slots.find((s) => s.id === firstSlot.id)

      if (applyToAll && original) {
        // "All instances" = every week on the SAME weekday with the same time
        newDraft = {
          ...draft,
          slots: draft.slots.map((s) => {
            if (
              s.status === "ACTIVE" &&
              s.weekday === original.weekday &&
              s.startMinutes === original.startMinutes &&
              s.endMinutes === original.endMinutes
            ) {
              return { ...s, startMinutes: firstSlot.startMinutes, endMinutes: firstSlot.endMinutes, locationLabel: firstSlot.locationLabel }
            }
            return s
          }),
        }
      } else {
        newDraft = { ...draft, slots: draft.slots.map((s) => (s.id === firstSlot.id ? firstSlot : s)) }
      }
    }

    setDraft(newDraft)
    saveSchedule.mutate(newDraft)
    setEditor({ type: "none" })
  }

  /**
   * Remove handler from the SlotEditorPanel.
   * - Without "all instances": cancel this slot for the currently viewed week
   *   only (adds a CANCELLED exception for that specific date).
   * - With "all instances": archive the recurring slot entirely (all weeks).
   */
  function handleSlotRemove(slotDraft: ScheduleSlotDraft, applyToAll: boolean) {
    if (!draft) return

    let newDraft: ScheduleDraftState

    if (applyToAll) {
      // Archive the slot — removes from every week
      newDraft = {
        ...draft,
        slots: draft.slots.map((s) => {
          if (
            s.status === "ACTIVE" &&
            s.weekday === slotDraft.weekday &&
            s.startMinutes === slotDraft.startMinutes &&
            s.endMinutes === slotDraft.endMinutes
          ) {
            return { ...s, status: "ARCHIVED" as const }
          }
          return s
        }),
      }
    } else {
      // Single-instance cancel: add a CANCELLED exception for this week's date
      const dateForSlot = weekDates[slotDraft.weekday - 1]
      if (!dateForSlot || !slotDraft.id) return

      const cancelException: ScheduleExceptionDraft = {
        id: null,
        scheduleSlotId: slotDraft.id,
        exceptionType: "CANCELLED",
        effectiveDate: `${toISODateStr(dateForSlot)}T00:00:00.000Z`,
        startMinutes: null,
        endMinutes: null,
        locationLabel: "",
        reason: "",
      }

      newDraft = {
        ...draft,
        exceptions: [...draft.exceptions, cancelException],
      }
    }

    setDraft(newDraft)
    saveSchedule.mutate(newDraft)
    setEditor({ type: "none" })
  }

  function handleExtraSave(exception: ScheduleExceptionDraft) {
    if (!draft) return
    const newDraft = { ...draft, exceptions: [...draft.exceptions, exception] }
    setDraft(newDraft)
    saveSchedule.mutate(newDraft)
    setEditor({ type: "none" })
  }

  function handleExtraUpdate(exception: ScheduleExceptionDraft) {
    if (!draft) return
    const newDraft = {
      ...draft,
      exceptions: draft.exceptions.map((e) => (e.id === exception.id ? exception : e)),
    }
    setDraft(newDraft)
    saveSchedule.mutate(newDraft)
    setEditor({ type: "none" })
  }

  /**
   * Remove a one-off extra lecture by filtering it from the draft.
   * The payload builder detects the missing exception and sends an
   * exceptionDeletes operation to the server.
   */
  function handleExtraRemove(exceptionId: string) {
    if (!draft) return
    const newDraft = {
      ...draft,
      exceptions: draft.exceptions.filter((e) => e.id !== exceptionId),
    }
    setDraft(newDraft)
    saveSchedule.mutate(newDraft)
    setEditor({ type: "none" })
  }

  // Called when the user clicks the pencil icon on a calendar event
  const handleEditEvent = useCallback((event: WeekCalendarEvent) => {
    if (!draft) return
    if (event.type === "one-off" && event.exceptionId) {
      const exc = draft.exceptions.find((e) => e.id === event.exceptionId)
      if (exc) {
        setEditor({ type: "edit-extra", exceptionDraft: exc })
        setStatusMessage(null)
      }
    } else if (event.slotId) {
      const slot = draft.slots.find((s) => s.id === event.slotId)
      if (slot) {
        setEditor({ type: "edit-slot", slotDraft: slot })
        setStatusMessage(null)
      }
    }
  }, [draft])

  /**
   * "All instances" means every week on the same weekday+time. Show the
   * checkbox when there are other ACTIVE slots on the SAME weekday with
   * the same time (e.g. duplicate entries), or always for saved slots
   * since the action semantically applies to the recurring weekly slot.
   */
  function editorHasSiblings(): boolean {
    if (editor.type !== "edit-slot" || !draft) return false
    return editor.slotDraft.id != null
  }

  if (!props.accessToken) {
    return <WorkflowStateCard message="Sign in to manage the class schedule." />
  }

  if (scheduleQuery.isLoading || !draft) {
    return <WorkflowStateCard message="Loading schedule..." />
  }

  if (scheduleQuery.isError) {
    return (
      <WorkflowBanner
        tone="danger"
        message={
          scheduleQuery.error instanceof Error
            ? scheduleQuery.error.message
            : "Failed to load schedule."
        }
      />
    )
  }

  const calendarEvents = buildWeekViewEvents(draft, weekDates)

  return (
    <div style={workflowStyles.grid}>
      {/* Title + action bar */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: webTheme.colors.text,
              letterSpacing: "-0.02em",
            }}
          >
            Schedule
          </h2>
          <span style={{ fontSize: 13, color: webTheme.colors.textSubtle }}>
            {draft.slots.filter((s) => s.status === "ACTIVE").length} weekly slot{draft.slots.filter((s) => s.status === "ACTIVE").length !== 1 ? "s" : ""}
          </span>
        </div>

        <ScheduleActionBar
          isSaving={saveSchedule.isPending}
          statusMessage={statusMessage}
          statusTone={statusTone}
          onAddSlot={() => {
            setEditor({ type: "add-slot" })
            setStatusMessage(null)
          }}
          onAddExtra={() => {
            setEditor({ type: "add-extra" })
            setStatusMessage(null)
          }}
        />
      </div>

      {/* Editor panels (shown above the calendar) */}
      {editor.type === "add-slot" ? (
        <SlotEditorPanel
          initial={null}
          onSave={handleSlotSave}
          onCancel={() => setEditor({ type: "none" })}
        />
      ) : editor.type === "edit-slot" ? (
        <SlotEditorPanel
          initial={editor.slotDraft}
          onSave={handleSlotSave}
          onCancel={() => setEditor({ type: "none" })}
          onRemove={
            editor.slotDraft.id
              ? (applyToAll) => handleSlotRemove(editor.slotDraft, applyToAll)
              : undefined
          }
          hasSiblings={editorHasSiblings()}
        />
      ) : editor.type === "add-extra" ? (
        <ExtraLecturePanel
          onSave={handleExtraSave}
          onCancel={() => setEditor({ type: "none" })}
        />
      ) : editor.type === "edit-extra" ? (
        <ExtraLecturePanel
          initial={editor.exceptionDraft}
          onSave={handleExtraUpdate}
          onCancel={() => setEditor({ type: "none" })}
          onRemove={
            editor.exceptionDraft.id
              ? () => handleExtraRemove(editor.exceptionDraft.id!)
              : undefined
          }
        />
      ) : null}

      {/* Week calendar — click the pencil icon on events to edit */}
      <WeekCalendarGrid
        events={calendarEvents}
        weekDates={weekDates}
        onEditEvent={handleEditEvent}
        onPrevWeek={() => setWeekOffset((o) => o - 1)}
        onNextWeek={() => setWeekOffset((o) => o + 1)}
        onToday={() => setWeekOffset(0)}
        isCurrentWeek={isCurrentWeek}
      />
    </div>
  )
}

/**
 * Builds calendar events for the viewed week from the draft state.
 */
function buildWeekViewEvents(draft: ScheduleDraftState, weekDates: Date[]): WeekCalendarEvent[] {
  const events: WeekCalendarEvent[] = []

  const cancelledKeys = new Set<string>()
  for (const exc of draft.exceptions) {
    if (exc.exceptionType === "CANCELLED" && exc.scheduleSlotId) {
      const excDate = exc.effectiveDate.split("T")[0] ?? ""
      cancelledKeys.add(`${exc.scheduleSlotId}|${excDate}`)
    }
  }

  for (const slot of draft.slots) {
    if (slot.status !== "ACTIVE") continue
    const dateForSlot = weekDates[slot.weekday - 1]
    if (!dateForSlot) continue

    const dateStr = toISODateStr(dateForSlot)
    const isCancelled = slot.id ? cancelledKeys.has(`${slot.id}|${dateStr}`) : false

    events.push({
      id: slot.id ? `slot-${slot.id}` : `draft-slot-${slot.weekday}-${slot.startMinutes}`,
      weekday: slot.weekday,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
      label: minutesToTimeString(slot.startMinutes) + " – " + minutesToTimeString(slot.endMinutes),
      locationLabel: slot.locationLabel || null,
      type: isCancelled ? "cancelled" : "slot",
      slotId: slot.id,
      exceptionId: null,
    })
  }

  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]
  if (weekStart && weekEnd) {
    const wsStr = toISODateStr(weekStart)
    const weStr = toISODateStr(weekEnd)

    for (const exc of draft.exceptions) {
      if (exc.exceptionType !== "ONE_OFF" || exc.startMinutes == null || exc.endMinutes == null) continue
      const excDateStr = exc.effectiveDate.split("T")[0] ?? ""
      if (excDateStr < wsStr || excDateStr > weStr) continue

      const excDate = new Date(exc.effectiveDate)
      const dayOfWeek = excDate.getUTCDay()
      const weekday = dayOfWeek === 0 ? 7 : dayOfWeek

      events.push({
        id: exc.id ? `exc-${exc.id}` : `draft-exc-${exc.effectiveDate}-${exc.startMinutes}`,
        weekday,
        startMinutes: exc.startMinutes,
        endMinutes: exc.endMinutes,
        label: minutesToTimeString(exc.startMinutes) + " – " + minutesToTimeString(exc.endMinutes),
        locationLabel: exc.locationLabel || null,
        type: "one-off",
        slotId: null,
        exceptionId: exc.id,
      })
    }
  }

  return events
}

function toISODateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
