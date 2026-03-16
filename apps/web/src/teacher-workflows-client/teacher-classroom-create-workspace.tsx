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

export function TeacherClassroomCreateWorkspace(props: {
  accessToken: string | null
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [draft, setDraft] = useState(() => createTeacherWebClassroomCreateDraft())

  const assignmentsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.teacherAssignments(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listMyAssignments(props.accessToken ?? ""),
  })

  const scopeOptions = buildTeacherWebClassroomScopeOptions(assignmentsQuery.data ?? [])
  const firstScopeOption = scopeOptions[0] ?? null
  const firstScopeKey = firstScopeOption?.key ?? ""
  const activeScopeOption =
    scopeOptions.find((option) => option.key === draft.selectedScopeKey) ?? firstScopeOption
  const activeScopeSummary = activeScopeOption?.supportingText ?? null

  useEffect(() => {
    if (draft.selectedScopeKey || !firstScopeKey) {
      return
    }

    setDraft((current) =>
      current.selectedScopeKey
        ? current
        : {
            ...current,
            selectedScopeKey: firstScopeKey,
          },
    )
  }, [draft.selectedScopeKey, firstScopeKey])

  const createClassroom = useMutation({
    mutationFn: async () => {
      if (!props.accessToken) {
        throw new Error("A teacher or admin web session is required before creating classrooms.")
      }

      return bootstrap.authClient.createClassroom(
        props.accessToken,
        buildTeacherWebClassroomCreateRequest(scopeOptions, draft),
      )
    },
    onSuccess: async (created) => {
      setStatusMessage(
        `Created ${created.classroomTitle ?? created.displayTitle} (${created.courseCode ?? created.code}).`,
      )
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.classrooms(),
      })
      router.push(teacherWorkflowRoutes.classroomDetail(created.id))
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to create classroom.")
    },
  })

  return (
    <div style={workflowStyles.grid}>
      <WebSectionCard
        title="Create classroom"
        description="Pick a teaching scope, set the course details, and choose the attendance defaults before students join."
      >
        {!props.accessToken ? (
          <WorkflowStateCard message="Sign in to create a classroom." />
        ) : assignmentsQuery.isLoading ? (
          <WorkflowStateCard message="Loading teaching scopes..." />
        ) : assignmentsQuery.isError ? (
          <WorkflowBanner
            tone="danger"
            message={
              assignmentsQuery.error instanceof Error
                ? assignmentsQuery.error.message
                : "Failed to load teaching scopes."
            }
          />
        ) : scopeOptions.length === 0 ? (
          <WorkflowStateCard message="No teacher assignment currently allows classroom creation." />
        ) : (
          <div style={workflowStyles.grid}>
            <div style={workflowStyles.twoColumn}>
              <WebSectionCard
                title="Course details"
                description="Create the classroom inside an allowed teaching scope so course setup stays aligned with teacher assignments."
              >
                <div style={workflowStyles.grid}>
                  <WorkflowSelectField
                    label="Teaching scope"
                    value={draft.selectedScopeKey}
                    onChange={(value) =>
                      setDraft((current) => ({ ...current, selectedScopeKey: value }))
                    }
                    options={scopeOptions.map((option) => ({
                      value: option.key,
                      label: option.title,
                    }))}
                  />
                  <div style={workflowStyles.stateCard}>
                    {activeScopeSummary ?? "Teaching scope details will appear here."}
                  </div>
                  <div style={workflowStyles.formGrid}>
                    <WorkflowField
                      label="Classroom title"
                      value={draft.classroomTitle}
                      onChange={(value) =>
                        setDraft((current) => ({ ...current, classroomTitle: value }))
                      }
                      placeholder="Mathematics"
                    />
                    <WorkflowField
                      label="Course code"
                      value={draft.courseCode}
                      onChange={(value) =>
                        setDraft((current) => ({ ...current, courseCode: value }))
                      }
                      placeholder="CSE6-MATH-A"
                    />
                  </div>
                </div>
              </WebSectionCard>

              <WebSectionCard
                title="Attendance defaults"
                description="Set the defaults teachers expect to keep stable for this classroom."
              >
                <div style={workflowStyles.formGrid}>
                  <WorkflowSelectField
                    label="Attendance mode"
                    value={draft.defaultAttendanceMode}
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        defaultAttendanceMode: value as AttendanceMode,
                      }))
                    }
                    options={[
                      { value: "QR_GPS", label: "QR + GPS" },
                      { value: "BLUETOOTH", label: "Bluetooth" },
                      { value: "MANUAL", label: "Manual" },
                    ]}
                  />
                  <WorkflowField
                    label="GPS radius (meters)"
                    value={draft.defaultGpsRadiusMeters}
                    onChange={(value) =>
                      setDraft((current) => ({ ...current, defaultGpsRadiusMeters: value }))
                    }
                    type="number"
                  />
                  <WorkflowField
                    label="Session duration (minutes)"
                    value={draft.defaultSessionDurationMinutes}
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        defaultSessionDurationMinutes: value,
                      }))
                    }
                    type="number"
                  />
                  <WorkflowField
                    label="Timezone"
                    value={draft.timezone}
                    onChange={(value) => setDraft((current) => ({ ...current, timezone: value }))}
                  />
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
                  <input
                    type="checkbox"
                    checked={draft.requiresTrustedDevice}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        requiresTrustedDevice: event.target.checked,
                      }))
                    }
                  />
                  Require device registration for student attendance
                </label>
              </WebSectionCard>
            </div>

            <div style={workflowStyles.buttonRow}>
              <button
                type="button"
                onClick={() => createClassroom.mutate()}
                disabled={createClassroom.isPending}
                style={workflowStyles.primaryButton}
              >
                {createClassroom.isPending ? "Creating..." : "Create classroom"}
              </button>
              <Link href={teacherWorkflowRoutes.classrooms} style={workflowStyles.secondaryButton}>
                Back to classrooms
              </Link>
            </div>

            <div style={workflowStyles.stateCard}>
              Create now, then open the classroom page to manage roster, schedule, updates, and QR
              attendance from the same course workspace.
            </div>

            {statusMessage ? <WorkflowBanner tone="info" message={statusMessage} /> : null}
          </div>
        )}
      </WebSectionCard>
    </div>
  )
}
