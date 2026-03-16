import type { ClassroomSchedule } from "@attendease/contracts"
import { describe, expect, it } from "vitest"

import {
  addTeacherScheduleExceptionDraft,
  addTeacherWeeklySlotDraft,
  buildTeacherScheduleSaveRequest,
  createTeacherScheduleDraft,
  removeTeacherWeeklySlotDraft,
  updateTeacherScheduleExceptionDraft,
  updateTeacherWeeklySlotDraft,
} from "./teacher-schedule-draft.js"

function createSchedule(): ClassroomSchedule {
  return {
    classroomId: "classroom_1",
    scheduleSlots: [
      {
        id: "slot_1",
        courseOfferingId: "classroom_1",
        weekday: 1,
        startMinutes: 540,
        endMinutes: 600,
        locationLabel: "Room 101",
        status: "ACTIVE",
      },
    ],
    scheduleExceptions: [
      {
        id: "exception_1",
        courseOfferingId: "classroom_1",
        scheduleSlotId: "slot_1",
        exceptionType: "RESCHEDULED",
        effectiveDate: "2026-03-20T00:00:00.000Z",
        startMinutes: 660,
        endMinutes: 720,
        locationLabel: "Lab 2",
        reason: "Practical block",
      },
    ],
  }
}

describe("teacher schedule draft helpers", () => {
  it("creates a mutable draft from the live classroom schedule", () => {
    const draft = createTeacherScheduleDraft(createSchedule())

    expect(draft.slots[0]).toMatchObject({
      existingId: "slot_1",
      locationLabel: "Room 101",
    })
    expect(draft.exceptions[0]).toMatchObject({
      existingId: "exception_1",
      exceptionType: "RESCHEDULED",
    })
  })

  it("adds and archives weekly slot drafts for local schedule editing", () => {
    const draft = addTeacherWeeklySlotDraft(createTeacherScheduleDraft(createSchedule()), {
      weekday: 5,
      startMinutes: 780,
      endMinutes: 840,
    })

    expect(draft.slots).toHaveLength(2)
    expect(draft.slots[1]).toMatchObject({
      existingId: null,
      weekday: 5,
    })

    const archived = removeTeacherWeeklySlotDraft(draft, "slot_1")
    expect(archived.slots[0]?.status).toBe("ARCHIVED")
  })

  it("builds save-and-notify operations for changed and newly created schedule entries", () => {
    let draft = createTeacherScheduleDraft(createSchedule())
    draft = updateTeacherWeeklySlotDraft(draft, "slot_1", {
      endMinutes: 615,
    })
    draft = addTeacherScheduleExceptionDraft(draft, {
      exceptionType: "ONE_OFF",
      effectiveDate: "2026-03-22T00:00:00.000Z",
      startMinutes: 840,
      endMinutes: 900,
      locationLabel: "Seminar Hall",
      reason: "Extra class",
    })
    draft = updateTeacherScheduleExceptionDraft(draft, "exception_1", {
      reason: "Updated practical block",
    })

    const request = buildTeacherScheduleSaveRequest({
      original: createSchedule(),
      draft,
      note: "Save and notify",
    })

    expect(request).not.toBeNull()
    expect(request?.weeklySlotUpdates).toEqual([
      {
        slotId: "slot_1",
        endMinutes: 615,
      },
    ])
    expect(request?.exceptionCreates).toHaveLength(1)
    expect(request?.exceptionUpdates).toEqual([
      {
        exceptionId: "exception_1",
        reason: "Updated practical block",
      },
    ])
    expect(request?.note).toBe("Save and notify")
  })

  it("returns null when the local draft has no effective schedule changes", () => {
    const request = buildTeacherScheduleSaveRequest({
      original: createSchedule(),
      draft: createTeacherScheduleDraft(createSchedule()),
    })

    expect(request).toBeNull()
  })
})
