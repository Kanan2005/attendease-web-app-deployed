"use client"

import type { ClassroomSchedule } from "@attendease/contracts"
import type { Dispatch, SetStateAction } from "react"

import { WebSectionCard } from "../../web-shell"
import {
  createEmptyScheduleExceptionDraft,
  type createScheduleDraftState,
  formatPortalMinutesRange,
  sortScheduleSlots,
} from "../../web-workflows"

import { WorkflowField, WorkflowSelectField, workflowStyles } from "../shared"

type ScheduleDraftState = ReturnType<typeof createScheduleDraftState>

export function TeacherScheduleDateExceptionsSection(props: {
  draft: ScheduleDraftState
  setDraft: Dispatch<SetStateAction<ScheduleDraftState | null>>
  schedule: ClassroomSchedule
}) {
  return (
    <>
      <WebSectionCard
        title="Date Exceptions"
        description="One-off, cancelled, and rescheduled class changes stay in the draft buffer until they are published."
      >
        <div style={workflowStyles.grid}>
          {props.draft.exceptions.map((exception, index) => (
            <div key={exception.id ?? `draft-exception-${index}`} style={workflowStyles.rowCard}>
              <div style={workflowStyles.formGrid}>
                <WorkflowSelectField
                  label="Exception type"
                  value={exception.exceptionType}
                  onChange={(value) =>
                    props.setDraft((current) =>
                      current
                        ? {
                            ...current,
                            exceptions: current.exceptions.map((entry, entryIndex) =>
                              entryIndex === index
                                ? {
                                    ...entry,
                                    exceptionType: value as typeof exception.exceptionType,
                                  }
                                : entry,
                            ),
                          }
                        : current,
                    )
                  }
                  options={[
                    { value: "ONE_OFF", label: "One-off class" },
                    { value: "CANCELLED", label: "Cancelled class" },
                    { value: "RESCHEDULED", label: "Rescheduled class" },
                  ]}
                />
                <WorkflowField
                  label="Effective date (ISO)"
                  value={exception.effectiveDate}
                  onChange={(value) =>
                    props.setDraft((current) =>
                      current
                        ? {
                            ...current,
                            exceptions: current.exceptions.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, effectiveDate: value } : entry,
                            ),
                          }
                        : current,
                    )
                  }
                />
                <WorkflowSelectField
                  label="Linked weekly slot"
                  value={exception.scheduleSlotId ?? ""}
                  onChange={(value) =>
                    props.setDraft((current) =>
                      current
                        ? {
                            ...current,
                            exceptions: current.exceptions.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, scheduleSlotId: value || null }
                                : entry,
                            ),
                          }
                        : current,
                    )
                  }
                  options={[
                    { value: "", label: "No linked slot" },
                    ...sortScheduleSlots(props.schedule.scheduleSlots).map((slot) => ({
                      value: slot.id,
                      label: `Weekday ${slot.weekday} · ${formatPortalMinutesRange(slot.startMinutes, slot.endMinutes)}`,
                    })),
                  ]}
                />
                <WorkflowField
                  label="Start minutes"
                  value={String(exception.startMinutes ?? "")}
                  onChange={(value) =>
                    props.setDraft((current) =>
                      current
                        ? {
                            ...current,
                            exceptions: current.exceptions.map((entry, entryIndex) =>
                              entryIndex === index
                                ? {
                                    ...entry,
                                    startMinutes: value ? Number(value) : null,
                                  }
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
                  value={String(exception.endMinutes ?? "")}
                  onChange={(value) =>
                    props.setDraft((current) =>
                      current
                        ? {
                            ...current,
                            exceptions: current.exceptions.map((entry, entryIndex) =>
                              entryIndex === index
                                ? {
                                    ...entry,
                                    endMinutes: value ? Number(value) : null,
                                  }
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
                  value={exception.locationLabel}
                  onChange={(value) =>
                    props.setDraft((current) =>
                      current
                        ? {
                            ...current,
                            exceptions: current.exceptions.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, locationLabel: value } : entry,
                            ),
                          }
                        : current,
                    )
                  }
                />
                <WorkflowField
                  label="Reason"
                  value={exception.reason}
                  onChange={(value) =>
                    props.setDraft((current) =>
                      current
                        ? {
                            ...current,
                            exceptions: current.exceptions.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, reason: value } : entry,
                            ),
                          }
                        : current,
                    )
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </WebSectionCard>

      <WebSectionCard
        title="Draft tools"
        description="Add one-off changes without leaving the current classroom schedule draft."
      >
        <div style={workflowStyles.buttonRow}>
          <button
            type="button"
            onClick={() =>
              props.setDraft((current) =>
                current
                  ? {
                      ...current,
                      exceptions: [...current.exceptions, createEmptyScheduleExceptionDraft()],
                    }
                  : current,
              )
            }
            style={workflowStyles.secondaryButton}
          >
            Add date exception
          </button>
        </div>
      </WebSectionCard>
    </>
  )
}
