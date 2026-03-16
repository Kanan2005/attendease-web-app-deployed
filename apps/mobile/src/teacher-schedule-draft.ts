import type {
  ClassroomSchedule,
  SaveAndNotifyScheduleRequest,
  ScheduleExceptionSummary,
  ScheduleExceptionType,
  ScheduleSlotSummary,
} from "@attendease/contracts"

export interface TeacherScheduleSlotDraft {
  localId: string
  existingId: string | null
  weekday: number
  startMinutes: number
  endMinutes: number
  locationLabel: string
  status: ScheduleSlotSummary["status"]
}

export interface TeacherScheduleExceptionDraft {
  localId: string
  existingId: string | null
  scheduleSlotId: string | null
  exceptionType: ScheduleExceptionType
  effectiveDate: string
  startMinutes: number | null
  endMinutes: number | null
  locationLabel: string
  reason: string
}

export interface TeacherScheduleDraft {
  slots: TeacherScheduleSlotDraft[]
  exceptions: TeacherScheduleExceptionDraft[]
}

export function createTeacherScheduleDraft(schedule: ClassroomSchedule): TeacherScheduleDraft {
  return {
    slots: schedule.scheduleSlots.map((slot) => ({
      localId: slot.id,
      existingId: slot.id,
      weekday: slot.weekday,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
      locationLabel: slot.locationLabel ?? "",
      status: slot.status,
    })),
    exceptions: schedule.scheduleExceptions.map((exception) => ({
      localId: exception.id,
      existingId: exception.id,
      scheduleSlotId: exception.scheduleSlotId,
      exceptionType: exception.exceptionType,
      effectiveDate: exception.effectiveDate,
      startMinutes: exception.startMinutes,
      endMinutes: exception.endMinutes,
      locationLabel: exception.locationLabel ?? "",
      reason: exception.reason ?? "",
    })),
  }
}

export function addTeacherWeeklySlotDraft(
  draft: TeacherScheduleDraft,
  overrides: Partial<Omit<TeacherScheduleSlotDraft, "localId" | "existingId">> = {},
): TeacherScheduleDraft {
  const localId = `draft-slot-${draft.slots.length + 1}`

  return {
    ...draft,
    slots: [
      ...draft.slots,
      {
        localId,
        existingId: null,
        weekday: overrides.weekday ?? 1,
        startMinutes: overrides.startMinutes ?? 540,
        endMinutes: overrides.endMinutes ?? 600,
        locationLabel: overrides.locationLabel ?? "",
        status: overrides.status ?? "ACTIVE",
      },
    ],
  }
}

export function updateTeacherWeeklySlotDraft(
  draft: TeacherScheduleDraft,
  localId: string,
  patch: Partial<Omit<TeacherScheduleSlotDraft, "localId" | "existingId">>,
): TeacherScheduleDraft {
  return {
    ...draft,
    slots: draft.slots.map((slot) =>
      slot.localId === localId
        ? {
            ...slot,
            ...patch,
          }
        : slot,
    ),
  }
}

export function removeTeacherWeeklySlotDraft(
  draft: TeacherScheduleDraft,
  localId: string,
): TeacherScheduleDraft {
  const target = draft.slots.find((slot) => slot.localId === localId)

  if (!target) {
    return draft
  }

  if (!target.existingId) {
    return {
      ...draft,
      slots: draft.slots.filter((slot) => slot.localId !== localId),
    }
  }

  return updateTeacherWeeklySlotDraft(draft, localId, {
    status: "ARCHIVED",
  })
}

export function addTeacherScheduleExceptionDraft(
  draft: TeacherScheduleDraft,
  overrides: Partial<Omit<TeacherScheduleExceptionDraft, "localId" | "existingId">> = {},
): TeacherScheduleDraft {
  const localId = `draft-exception-${draft.exceptions.length + 1}`

  return {
    ...draft,
    exceptions: [
      ...draft.exceptions,
      {
        localId,
        existingId: null,
        scheduleSlotId: overrides.scheduleSlotId ?? null,
        exceptionType: overrides.exceptionType ?? "ONE_OFF",
        effectiveDate: overrides.effectiveDate ?? new Date().toISOString(),
        startMinutes: overrides.startMinutes ?? 540,
        endMinutes: overrides.endMinutes ?? 600,
        locationLabel: overrides.locationLabel ?? "",
        reason: overrides.reason ?? "",
      },
    ],
  }
}

export function updateTeacherScheduleExceptionDraft(
  draft: TeacherScheduleDraft,
  localId: string,
  patch: Partial<Omit<TeacherScheduleExceptionDraft, "localId" | "existingId">>,
): TeacherScheduleDraft {
  return {
    ...draft,
    exceptions: draft.exceptions.map((exception) =>
      exception.localId === localId
        ? {
            ...exception,
            ...patch,
          }
        : exception,
    ),
  }
}

export function buildTeacherScheduleSaveRequest(input: {
  original: ClassroomSchedule
  draft: TeacherScheduleDraft
  note?: string
}): SaveAndNotifyScheduleRequest | null {
  const originalSlots = new Map(input.original.scheduleSlots.map((slot) => [slot.id, slot]))
  const originalExceptions = new Map(
    input.original.scheduleExceptions.map((exception) => [exception.id, exception]),
  )

  const weeklySlotCreates = input.draft.slots
    .filter((slot) => slot.existingId === null)
    .map((slot) => ({
      weekday: slot.weekday,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
      ...(normalizeOptionalText(slot.locationLabel) !== null
        ? { locationLabel: normalizeOptionalText(slot.locationLabel) }
        : {}),
    }))

  const weeklySlotUpdates = input.draft.slots.flatMap((slot) => {
    if (!slot.existingId) {
      return []
    }

    const original = originalSlots.get(slot.existingId)

    if (!original) {
      return []
    }

    const patch = {
      ...(slot.weekday !== original.weekday ? { weekday: slot.weekday } : {}),
      ...(slot.startMinutes !== original.startMinutes ? { startMinutes: slot.startMinutes } : {}),
      ...(slot.endMinutes !== original.endMinutes ? { endMinutes: slot.endMinutes } : {}),
      ...(normalizeOptionalText(slot.locationLabel) !==
      normalizeOptionalText(original.locationLabel)
        ? { locationLabel: normalizeOptionalText(slot.locationLabel) }
        : {}),
      ...(slot.status !== original.status ? { status: slot.status } : {}),
    }

    return Object.keys(patch).length > 0
      ? [
          {
            slotId: slot.existingId,
            ...patch,
          },
        ]
      : []
  })

  const exceptionCreates = input.draft.exceptions
    .filter((exception) => exception.existingId === null)
    .map((exception) => ({
      ...(exception.scheduleSlotId ? { scheduleSlotId: exception.scheduleSlotId } : {}),
      exceptionType: exception.exceptionType,
      effectiveDate: exception.effectiveDate,
      ...(exception.startMinutes !== null ? { startMinutes: exception.startMinutes } : {}),
      ...(exception.endMinutes !== null ? { endMinutes: exception.endMinutes } : {}),
      ...(normalizeOptionalText(exception.locationLabel) !== null
        ? { locationLabel: normalizeOptionalText(exception.locationLabel) }
        : {}),
      ...(normalizeOptionalText(exception.reason) !== null
        ? { reason: normalizeOptionalText(exception.reason) }
        : {}),
    }))

  const exceptionUpdates = input.draft.exceptions.flatMap((exception) => {
    if (!exception.existingId) {
      return []
    }

    const original = originalExceptions.get(exception.existingId)

    if (!original) {
      return []
    }

    const patch = {
      ...(exception.scheduleSlotId !== original.scheduleSlotId
        ? { scheduleSlotId: exception.scheduleSlotId }
        : {}),
      ...(exception.exceptionType !== original.exceptionType
        ? { exceptionType: exception.exceptionType }
        : {}),
      ...(exception.effectiveDate !== original.effectiveDate
        ? { effectiveDate: exception.effectiveDate }
        : {}),
      ...(exception.startMinutes !== original.startMinutes
        ? { startMinutes: exception.startMinutes }
        : {}),
      ...(exception.endMinutes !== original.endMinutes ? { endMinutes: exception.endMinutes } : {}),
      ...(normalizeOptionalText(exception.locationLabel) !==
      normalizeOptionalText(original.locationLabel)
        ? { locationLabel: normalizeOptionalText(exception.locationLabel) }
        : {}),
      ...(normalizeOptionalText(exception.reason) !== normalizeOptionalText(original.reason)
        ? { reason: normalizeOptionalText(exception.reason) }
        : {}),
    }

    return Object.keys(patch).length > 0
      ? [
          {
            exceptionId: exception.existingId,
            ...patch,
          },
        ]
      : []
  })

  const hasChanges =
    weeklySlotCreates.length > 0 ||
    weeklySlotUpdates.length > 0 ||
    exceptionCreates.length > 0 ||
    exceptionUpdates.length > 0

  if (!hasChanges) {
    return null
  }

  const note = normalizeOptionalText(input.note)

  return {
    ...(weeklySlotCreates.length > 0 ? { weeklySlotCreates } : {}),
    ...(weeklySlotUpdates.length > 0 ? { weeklySlotUpdates } : {}),
    ...(exceptionCreates.length > 0 ? { exceptionCreates } : {}),
    ...(exceptionUpdates.length > 0 ? { exceptionUpdates } : {}),
    ...(note !== null ? { note } : {}),
  }
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}
