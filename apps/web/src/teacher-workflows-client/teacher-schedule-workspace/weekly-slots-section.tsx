"use client"

import { webTheme } from "@attendease/ui-web"
import type { Dispatch, SetStateAction } from "react"

import {
  createEmptyScheduleSlotDraft,
  type createScheduleDraftState,
  formatPortalMinutesRange,
} from "../../web-workflows"

import { WebSectionCard } from "../../web-shell"
import { WorkflowField, WorkflowSelectField, workflowStyles } from "../shared"

type ScheduleDraftState = ReturnType<typeof createScheduleDraftState>

export function TeacherScheduleWeeklySlotsSection(props: {
  draft: ScheduleDraftState
  setDraft: Dispatch<SetStateAction<ScheduleDraftState | null>>
}) {
  return (
    <>
      <WebSectionCard
        title="Schedule draft"
        description="This page keeps weekly slots and date exceptions in local draft state until the teacher clicks Save & Notify."
      >
        <div style={workflowStyles.buttonRow}>
          <button
            type="button"
            onClick={() =>
              props.setDraft((current) =>
                current
                  ? {
                      ...current,
                      slots: [...current.slots, createEmptyScheduleSlotDraft()],
                    }
                  : current,
              )
            }
            style={workflowStyles.secondaryButton}
          >
            Add weekly slot
          </button>
        </div>
      </WebSectionCard>

      <WebSectionCard
        title="Weekly Slots"
        description="Edit the draft copy below. Existing rows will become update operations; new rows will become create operations."
      >
        <div style={workflowStyles.grid}>
          {props.draft.slots.map((slot, index) => (
            <div key={slot.id ?? `draft-slot-${index}`} style={workflowStyles.rowCard}>
              <div style={workflowStyles.formGrid}>
                <WorkflowSelectField
                  label="Weekday"
                  value={String(slot.weekday)}
                  onChange={(value) =>
                    props.setDraft((current) =>
                      current
                        ? {
                            ...current,
                            slots: current.slots.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, weekday: Number(value) } : entry,
                            ),
                          }
                        : current,
                    )
                  }
                  options={[
                    { value: "1", label: "Monday" },
                    { value: "2", label: "Tuesday" },
                    { value: "3", label: "Wednesday" },
                    { value: "4", label: "Thursday" },
                    { value: "5", label: "Friday" },
                    { value: "6", label: "Saturday" },
                    { value: "7", label: "Sunday" },
                  ]}
                />
                <WorkflowField
                  label="Start minutes"
                  value={String(slot.startMinutes)}
                  onChange={(value) =>
                    props.setDraft((current) =>
                      current
                        ? {
                            ...current,
                            slots: current.slots.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, startMinutes: Number(value) }
                                : entry,
                            ),
                          }
                        : current,
                    )
                  }
                  type="number"
                />
                <WorkflowField
                  label="End minutes"
                  value={String(slot.endMinutes)}
                  onChange={(value) =>
                    props.setDraft((current) =>
                      current
                        ? {
                            ...current,
                            slots: current.slots.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, endMinutes: Number(value) }
                                : entry,
                            ),
                          }
                        : current,
                    )
                  }
                  type="number"
                />
                <WorkflowField
                  label="Location"
                  value={slot.locationLabel}
                  onChange={(value) =>
                    props.setDraft((current) =>
                      current
                        ? {
                            ...current,
                            slots: current.slots.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, locationLabel: value } : entry,
                            ),
                          }
                        : current,
                    )
                  }
                />
                <WorkflowSelectField
                  label="Slot status"
                  value={slot.status}
                  onChange={(value) =>
                    props.setDraft((current) =>
                      current
                        ? {
                            ...current,
                            slots: current.slots.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, status: value as "ACTIVE" | "ARCHIVED" }
                                : entry,
                            ),
                          }
                        : current,
                    )
                  }
                  options={[
                    { value: "ACTIVE", label: "Active" },
                    { value: "ARCHIVED", label: "Archived" },
                  ]}
                />
              </div>
              <div style={{ color: webTheme.colors.textSubtle, marginTop: 10 }}>
                {formatPortalMinutesRange(slot.startMinutes, slot.endMinutes)}
              </div>
            </div>
          ))}
        </div>
      </WebSectionCard>
    </>
  )
}
