import type {
  ClassroomSchedule,
  ClassroomSummary,
  RosterImportJobSummary,
  RosterImportRowInput,
  SaveAndNotifyScheduleRequest,
  ScheduleExceptionSummary,
  ScheduleSlotSummary,
} from "@attendease/contracts"
import { rosterImportRowInputSchema } from "@attendease/contracts"

import type {
  ImportMonitorRow,
  ScheduleDraftState,
  ScheduleExceptionDraft,
  ScheduleSlotDraft,
  SemesterVisibilityRow,
} from "./web-workflows-types"

export function createScheduleDraftState(schedule: ClassroomSchedule): ScheduleDraftState {
  return {
    slots: schedule.scheduleSlots.map((slot) => ({
      id: slot.id,
      weekday: slot.weekday,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
      locationLabel: slot.locationLabel ?? "",
      status: slot.status,
    })),
    exceptions: schedule.scheduleExceptions.map((exception) => ({
      id: exception.id,
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

export function createEmptyScheduleSlotDraft(): ScheduleSlotDraft {
  return {
    id: null,
    weekday: 1,
    startMinutes: 540,
    endMinutes: 600,
    locationLabel: "",
    status: "ACTIVE",
  }
}

export function createEmptyScheduleExceptionDraft(): ScheduleExceptionDraft {
  return {
    id: null,
    scheduleSlotId: null,
    exceptionType: "ONE_OFF",
    effectiveDate: new Date().toISOString(),
    startMinutes: 540,
    endMinutes: 600,
    locationLabel: "",
    reason: "",
  }
}

export function buildScheduleSavePayload(input: {
  original: ClassroomSchedule
  draft: ScheduleDraftState
  note?: string
}): SaveAndNotifyScheduleRequest | null {
  const slotMap = new Map(input.original.scheduleSlots.map((slot) => [slot.id, slot]))
  const exceptionMap = new Map(
    input.original.scheduleExceptions.map((exception) => [exception.id, exception]),
  )

  const weeklySlotCreates = input.draft.slots
    .filter((slot) => slot.id === null)
    .map((slot) => ({
      weekday: slot.weekday,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
      ...(slot.locationLabel.trim() ? { locationLabel: slot.locationLabel.trim() } : {}),
    }))

  const weeklySlotUpdates = input.draft.slots
    .filter((slot) => slot.id !== null)
    .flatMap((slot) => {
      const slotId = slot.id

      if (!slotId) {
        return []
      }

      const current = slotMap.get(slotId)

      if (!current) {
        return []
      }

      const nextLocation = nullableTrimmedText(slot.locationLabel)
      const currentLocation = current.locationLabel ?? null

      if (
        current.weekday === slot.weekday &&
        current.startMinutes === slot.startMinutes &&
        current.endMinutes === slot.endMinutes &&
        current.status === slot.status &&
        currentLocation === nextLocation
      ) {
        return []
      }

      return [
        {
          slotId: current.id,
          weekday: slot.weekday,
          startMinutes: slot.startMinutes,
          endMinutes: slot.endMinutes,
          locationLabel: nextLocation,
          status: slot.status,
        },
      ]
    })

  const exceptionCreates = input.draft.exceptions
    .filter((exception) => exception.id === null)
    .map((exception) => buildScheduleExceptionCreate(exception))

  const exceptionUpdates = input.draft.exceptions
    .filter((exception) => exception.id !== null)
    .flatMap((exception) => {
      const exceptionId = exception.id

      if (!exceptionId) {
        return []
      }

      const current = exceptionMap.get(exceptionId)

      if (!current) {
        return []
      }

      const nextLocation = nullableTrimmedText(exception.locationLabel)
      const nextReason = nullableTrimmedText(exception.reason)

      if (
        current.scheduleSlotId === exception.scheduleSlotId &&
        current.exceptionType === exception.exceptionType &&
        current.effectiveDate === exception.effectiveDate &&
        current.startMinutes === exception.startMinutes &&
        current.endMinutes === exception.endMinutes &&
        (current.locationLabel ?? null) === nextLocation &&
        (current.reason ?? null) === nextReason
      ) {
        return []
      }

      return [
        {
          exceptionId: current.id,
          scheduleSlotId: exception.scheduleSlotId,
          exceptionType: exception.exceptionType,
          effectiveDate: exception.effectiveDate,
          startMinutes: exception.startMinutes,
          endMinutes: exception.endMinutes,
          locationLabel: nextLocation,
          reason: nextReason,
        },
      ]
    })

  const hasChanges =
    weeklySlotCreates.length > 0 ||
    weeklySlotUpdates.length > 0 ||
    exceptionCreates.length > 0 ||
    exceptionUpdates.length > 0

  if (!hasChanges) {
    return null
  }

  return {
    ...(weeklySlotCreates.length > 0 ? { weeklySlotCreates } : {}),
    ...(weeklySlotUpdates.length > 0 ? { weeklySlotUpdates } : {}),
    ...(exceptionCreates.length > 0 ? { exceptionCreates } : {}),
    ...(exceptionUpdates.length > 0 ? { exceptionUpdates } : {}),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
  }
}

export function parseRosterImportRowsText(input: string): {
  rows: RosterImportRowInput[]
  ignoredLineCount: number
} {
  const rows: RosterImportRowInput[] = []
  let ignoredLineCount = 0

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith("#")) {
      continue
    }

    const tokens = line
      .split(",")
      .map((segment) => segment.trim())
      .filter(Boolean)

    if (tokens.length === 0) {
      continue
    }

    const candidate = buildRosterImportRowCandidate(tokens)
    const parsed = rosterImportRowInputSchema.safeParse(candidate)

    if (!parsed.success) {
      ignoredLineCount += 1
      continue
    }

    rows.push(parsed.data)
  }

  return {
    rows,
    ignoredLineCount,
  }
}

export function buildTeacherSemesterVisibilityRows(
  classrooms: ClassroomSummary[],
): SemesterVisibilityRow[] {
  const buckets = new Map<string, SemesterVisibilityRow>()

  for (const classroom of classrooms) {
    const current = buckets.get(classroom.semesterId) ?? {
      semesterId: classroom.semesterId,
      classroomCount: 0,
      activeCount: 0,
      completedCount: 0,
      requiresTrustedDeviceCount: 0,
    }

    current.classroomCount += 1

    if (classroom.status === "ACTIVE") {
      current.activeCount += 1
    }

    if (classroom.status === "COMPLETED" || classroom.status === "ARCHIVED") {
      current.completedCount += 1
    }

    if (classroom.requiresTrustedDevice) {
      current.requiresTrustedDeviceCount += 1
    }

    buckets.set(classroom.semesterId, current)
  }

  return [...buckets.values()].sort((left, right) =>
    left.semesterId.localeCompare(right.semesterId),
  )
}

export function buildImportMonitorRows(input: {
  classrooms: ClassroomSummary[]
  jobsByClassroom: Record<string, RosterImportJobSummary[]>
}): ImportMonitorRow[] {
  const classroomMap = new Map(input.classrooms.map((classroom) => [classroom.id, classroom]))

  return Object.entries(input.jobsByClassroom)
    .flatMap(([classroomId, jobs]) => {
      const classroom = classroomMap.get(classroomId)

      if (!classroom) {
        return []
      }

      return jobs.map((job) => ({
        classroomId,
        classroomCode: classroom.code,
        classroomTitle: classroom.displayTitle,
        jobId: job.id,
        status: job.status,
        totalRows: job.totalRows,
        validRows: job.validRows,
        invalidRows: job.invalidRows,
        appliedRows: job.appliedRows,
        createdAt: job.createdAt,
        reviewRequired: job.status === "REVIEW_REQUIRED",
      }))
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

function buildScheduleExceptionCreate(exception: ScheduleExceptionDraft) {
  return {
    ...(exception.scheduleSlotId ? { scheduleSlotId: exception.scheduleSlotId } : {}),
    exceptionType: exception.exceptionType,
    effectiveDate: exception.effectiveDate,
    ...(exception.startMinutes !== null ? { startMinutes: exception.startMinutes } : {}),
    ...(exception.endMinutes !== null ? { endMinutes: exception.endMinutes } : {}),
    ...(nullableTrimmedText(exception.locationLabel)
      ? { locationLabel: nullableTrimmedText(exception.locationLabel) }
      : {}),
    ...(nullableTrimmedText(exception.reason)
      ? { reason: nullableTrimmedText(exception.reason) }
      : {}),
  }
}

function buildRosterImportRowCandidate(tokens: string[]): Partial<RosterImportRowInput> {
  const first = tokens[0] ?? ""
  const second = tokens[1] ?? ""
  const third = tokens[2] ?? ""

  if (first.includes("@")) {
    return {
      studentEmail: first,
      ...(second
        ? second.includes(" ") || third
          ? { parsedName: second }
          : { studentRollNumber: second }
        : {}),
      ...(third ? { studentRollNumber: third } : {}),
    }
  }

  if (!looksLikeRollNumber(first)) {
    return {}
  }

  return {
    studentRollNumber: first,
    ...(second.includes("@") ? { studentEmail: second } : {}),
    ...(!second.includes("@") && second ? { parsedName: second } : {}),
    ...(third ? { parsedName: third } : {}),
  }
}

function nullableTrimmedText(value: string): string | null {
  const next = value.trim()

  return next ? next : null
}

function looksLikeRollNumber(value: string): boolean {
  const normalized = value.trim()

  if (!normalized) {
    return false
  }

  if (normalized.includes(" ")) {
    return false
  }

  const alphaNumeric = /^[A-Za-z0-9_-]+$/.test(normalized)

  if (!alphaNumeric) {
    return false
  }

  return /\d/.test(normalized) || /[-_]/.test(normalized)
}

export function sortScheduleSlots(slots: ScheduleSlotSummary[]): ScheduleSlotSummary[] {
  return [...slots].sort((left, right) => {
    if (left.weekday !== right.weekday) {
      return left.weekday - right.weekday
    }

    return left.startMinutes - right.startMinutes
  })
}

export function sortScheduleExceptions(
  exceptions: ScheduleExceptionSummary[],
): ScheduleExceptionSummary[] {
  return [...exceptions].sort((left, right) =>
    left.effectiveDate.localeCompare(right.effectiveDate),
  )
}
