"use client"

import type {
  AnnouncementVisibility,
  AttendanceMode,
  AttendanceSessionStatus,
  AttendanceSessionStudentSummary,
  ClassroomDetail,
  ClassroomRosterMemberSummary,
  ClassroomSummary,
  CourseOfferingStatus,
  ExportJobType,
  LectureSummary,
} from "@attendease/contracts"
import {
  buildAttendanceCorrectionSaveMessage,
  buildAttendanceEditChanges,
  createAttendanceEditDraft,
  getAttendanceCorrectionReviewPollInterval,
} from "@attendease/domain"
import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { createWebAuthBootstrap } from "../auth"
import {
  buildTeacherWebClassroomCreateRequest,
  buildTeacherWebClassroomListCards,
  buildTeacherWebClassroomScopeOptions,
  buildTeacherWebClassroomScopeSummary,
  buildTeacherWebClassroomUpdateRequest,
  createTeacherWebClassroomCreateDraft,
  createTeacherWebClassroomEditDraft,
  formatTeacherWebAttendanceModeLabel,
  hasTeacherWebClassroomEditChanges,
} from "../teacher-classroom-management"
import {
  applyTeacherWebQrSessionClassroomSelection,
  buildTeacherWebQrSessionClassroomOptions,
  buildTeacherWebQrSessionStartRequest,
  createTeacherWebQrSessionStartDraft,
  evaluateTeacherWebQrSessionStartReadiness,
} from "../teacher-qr-session-management"
import {
  type TeacherWebReviewTone,
  buildTeacherWebAcademicFilterOptions,
  buildTeacherWebFilterSummary,
  buildTeacherWebHistoryQueryFilters,
  buildTeacherWebReportOverviewModel,
  buildTeacherWebReportQueryFilters,
  buildTeacherWebSessionDetailOverviewModel,
  buildTeacherWebSessionDetailStatusModel,
  buildTeacherWebSessionHistorySummaryModel,
  buildTeacherWebSessionRosterModel,
  createTeacherWebHistoryFilterDraft,
  createTeacherWebReportFilterDraft,
  mapTeacherWebReviewErrorToMessage,
} from "../teacher-review-workflows"
import {
  buildTeacherWebRosterAddRequest,
  buildTeacherWebRosterFilters,
  buildTeacherWebRosterMemberActions,
  buildTeacherWebRosterMemberIdentityText,
  buildTeacherWebRosterResultSummary,
} from "../teacher-roster-management"
import { WebSectionCard } from "../web-shell"
import {
  buildScheduleSavePayload,
  buildTeacherClassroomLinks,
  buildTeacherSemesterVisibilityRows,
  createEmptyScheduleExceptionDraft,
  createEmptyScheduleSlotDraft,
  createScheduleDraftState,
  formatPortalDateTime,
  formatPortalMinutesRange,
  getTeacherSessionHistoryPollInterval,
  parseRosterImportRowsText,
  sortScheduleExceptions,
  sortScheduleSlots,
  teacherWorkflowRoutes,
  webWorkflowQueryKeys,
} from "../web-workflows"

import {
  WorkflowBanner,
  WorkflowField,
  WorkflowSelectField,
  WorkflowStateCard,
  WorkflowStatusCard,
  WorkflowSummaryGrid,
  WorkflowTonePill,
  bootstrap,
  findSelectedFilterLabel,
  getToneStyles,
  toneForSessionState,
  workflowStyles,
} from "./shared"

export function TeacherScheduleWorkspace(props: {
  accessToken: string | null
  classroomId: string
}) {
  const queryClient = useQueryClient()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [saveNote, setSaveNote] = useState(
    "Schedule saved and published from the teacher web route.",
  )
  const [draft, setDraft] = useState<ReturnType<typeof createScheduleDraftState> | null>(null)

  const detailQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomDetail(props.classroomId),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.getClassroom(props.accessToken ?? "", props.classroomId),
  })
  const scheduleQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomSchedule(props.classroomId),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.getClassroomSchedule(props.accessToken ?? "", props.classroomId),
  })

  useEffect(() => {
    if (!scheduleQuery.data) {
      return
    }

    setDraft(createScheduleDraftState(scheduleQuery.data))
  }, [scheduleQuery.data])

  const saveSchedule = useMutation({
    mutationFn: async () => {
      if (!props.accessToken || !scheduleQuery.data || !draft) {
        throw new Error("Schedule save requires a classroom, a web session, and a draft state.")
      }

      const payload = buildScheduleSavePayload({
        original: scheduleQuery.data,
        draft,
        note: saveNote,
      })

      if (!payload) {
        throw new Error("No schedule changes are waiting in the draft buffer.")
      }

      return bootstrap.authClient.saveAndNotifyClassroomSchedule(
        props.accessToken,
        props.classroomId,
        payload,
      )
    },
    onSuccess: async (schedule) => {
      setStatusMessage("Saved the schedule draft and queued the notification outbox event.")
      setDraft(createScheduleDraftState(schedule))
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.classroomSchedule(props.classroomId),
      })
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to save the schedule.")
    },
  })

  if (!props.accessToken) {
    return (
      <WorkflowStateCard message="No web access token is available for schedule editing yet." />
    )
  }

  if (scheduleQuery.isLoading || !draft) {
    return <WorkflowStateCard message="Loading schedule draft..." />
  }

  if (scheduleQuery.isError || !scheduleQuery.data) {
    return (
      <WorkflowBanner
        tone="danger"
        message={
          scheduleQuery.error instanceof Error
            ? scheduleQuery.error.message
            : "Failed to load the classroom schedule."
        }
      />
    )
  }

  return (
    <div style={workflowStyles.grid}>
      <WebSectionCard
        title={detailQuery.data ? `${detailQuery.data.displayTitle} schedule` : "Schedule draft"}
        description="This page keeps weekly slots and date exceptions in local draft state until the teacher clicks Save & Notify."
      >
        <div style={workflowStyles.buttonRow}>
          <button
            type="button"
            onClick={() =>
              setDraft((current) =>
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
          <button
            type="button"
            onClick={() =>
              setDraft((current) =>
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

      <WebSectionCard
        title="Weekly Slots"
        description="Edit the draft copy below. Existing rows will become update operations; new rows will become create operations."
      >
        <div style={workflowStyles.grid}>
          {draft.slots.map((slot, index) => (
            <div key={slot.id ?? `draft-slot-${index}`} style={workflowStyles.rowCard}>
              <div style={workflowStyles.formGrid}>
                <WorkflowSelectField
                  label="Weekday"
                  value={String(slot.weekday)}
                  onChange={(value) =>
                    setDraft((current) =>
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
                    setDraft((current) =>
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
                    setDraft((current) =>
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
                    setDraft((current) =>
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
                    setDraft((current) =>
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
              <div style={{ color: "#64748b", marginTop: 10 }}>
                {formatPortalMinutesRange(slot.startMinutes, slot.endMinutes)}
              </div>
            </div>
          ))}
        </div>
      </WebSectionCard>

      <WebSectionCard
        title="Date Exceptions"
        description="One-off, cancelled, and rescheduled class changes stay in the draft buffer until they are published."
      >
        <div style={workflowStyles.grid}>
          {draft.exceptions.map((exception, index) => (
            <div key={exception.id ?? `draft-exception-${index}`} style={workflowStyles.rowCard}>
              <div style={workflowStyles.formGrid}>
                <WorkflowSelectField
                  label="Exception type"
                  value={exception.exceptionType}
                  onChange={(value) =>
                    setDraft((current) =>
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
                    setDraft((current) =>
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
                    setDraft((current) =>
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
                    ...sortScheduleSlots(scheduleQuery.data.scheduleSlots).map((slot) => ({
                      value: slot.id,
                      label: `Weekday ${slot.weekday} · ${formatPortalMinutesRange(slot.startMinutes, slot.endMinutes)}`,
                    })),
                  ]}
                />
                <WorkflowField
                  label="Start minutes"
                  value={String(exception.startMinutes ?? "")}
                  onChange={(value) =>
                    setDraft((current) =>
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
                    setDraft((current) =>
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
                    setDraft((current) =>
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
                    setDraft((current) =>
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
        title="Save & Notify"
        description="One transaction-backed schedule.changed outbox event is emitted when the draft is saved successfully."
      >
        <div style={workflowStyles.grid}>
          <WorkflowField label="Save note" value={saveNote} onChange={setSaveNote} />
          <button
            type="button"
            onClick={() => saveSchedule.mutate()}
            disabled={saveSchedule.isPending}
            style={workflowStyles.primaryButton}
          >
            {saveSchedule.isPending ? "Saving..." : "Save & Notify"}
          </button>
        </div>
      </WebSectionCard>

      {statusMessage ? <WorkflowBanner tone="info" message={statusMessage} /> : null}
    </div>
  )
}
