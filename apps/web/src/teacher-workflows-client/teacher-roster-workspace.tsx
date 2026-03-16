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

export function TeacherRosterWorkspace(props: {
  accessToken: string | null
  classroomId: string
}) {
  const queryClient = useQueryClient()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED"
  >("ALL")
  const [studentLookup, setStudentLookup] = useState("")
  const [newMemberStatus, setNewMemberStatus] = useState<"ACTIVE" | "PENDING">("PENDING")
  const rosterFilters = buildTeacherWebRosterFilters({
    searchText: search,
    statusFilter,
  })

  const detailQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomDetail(props.classroomId),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.getClassroom(props.accessToken ?? "", props.classroomId),
  })
  const rosterQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomRoster(props.classroomId, rosterFilters),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listClassroomRoster(
        props.accessToken ?? "",
        props.classroomId,
        rosterFilters,
      ),
  })

  const addMember = useMutation({
    mutationFn: async () => {
      if (!props.accessToken) {
        throw new Error("Roster updates require an authenticated teacher or admin session.")
      }

      return bootstrap.authClient.addClassroomRosterMember(
        props.accessToken,
        props.classroomId,
        buildTeacherWebRosterAddRequest({
          lookup: studentLookup,
          membershipStatus: newMemberStatus,
        }),
      )
    },
    onSuccess: async (member) => {
      setStatusMessage(`Added ${member.studentName ?? member.studentDisplayName} to the roster.`)
      setStudentLookup("")
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classroomRoster(props.classroomId),
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classroomDetail(props.classroomId),
        }),
      ])
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to add the roster member.")
    },
  })

  const updateMember = useMutation({
    mutationFn: async (input: {
      enrollmentId: string
      membershipStatus: ClassroomRosterMemberSummary["membershipState"]
    }) => {
      if (!props.accessToken) {
        throw new Error("Roster changes require an authenticated teacher or admin session.")
      }

      return bootstrap.authClient.updateClassroomRosterMember(
        props.accessToken,
        props.classroomId,
        input.enrollmentId,
        { membershipStatus: input.membershipStatus },
      )
    },
    onSuccess: async (member) => {
      setStatusMessage(
        `Updated ${member.studentName ?? member.studentDisplayName} to ${member.membershipState}.`,
      )
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classroomRoster(props.classroomId),
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classroomDetail(props.classroomId),
        }),
      ])
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to update roster state.")
    },
  })

  const removeMember = useMutation({
    mutationFn: async (enrollmentId: string) => {
      if (!props.accessToken) {
        throw new Error("Roster changes require an authenticated teacher or admin session.")
      }

      return bootstrap.authClient.removeClassroomRosterMember(
        props.accessToken,
        props.classroomId,
        enrollmentId,
      )
    },
    onSuccess: async (member) => {
      setStatusMessage(
        `Removed ${member.studentName ?? member.studentDisplayName} from the roster.`,
      )
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classroomRoster(props.classroomId),
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.classroomDetail(props.classroomId),
        }),
      ])
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to remove the student.")
    },
  })

  if (!props.accessToken) {
    return <WorkflowStateCard message="Sign in to manage this classroom roster." />
  }

  if (detailQuery.isLoading) {
    return <WorkflowStateCard message="Loading classroom roster..." />
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <WorkflowBanner
        tone="danger"
        message={
          detailQuery.error instanceof Error
            ? detailQuery.error.message
            : "Failed to load classroom context for the roster."
        }
      />
    )
  }

  const classroom = detailQuery.data
  const classroomTitle = classroom.classroomTitle ?? classroom.displayTitle
  const courseCode = classroom.courseCode ?? classroom.code
  const scopeSummary = buildTeacherWebClassroomScopeSummary(classroom)
  const rosterMembers = rosterQuery.data ?? []
  const activeCount = rosterMembers.filter((member) => member.membershipState === "ACTIVE").length
  const pendingCount = rosterMembers.filter((member) => member.membershipState === "PENDING").length
  const blockedCount = rosterMembers.filter((member) => member.membershipState === "BLOCKED").length
  const rosterSummary = buildTeacherWebRosterResultSummary({
    visibleCount: rosterMembers.length,
    statusFilter,
    searchText: search,
  })

  return (
    <div style={workflowStyles.grid}>
      <WebSectionCard
        title={`${classroomTitle} (${courseCode})`}
        description="Keep student lookup, membership state, and course context together so roster work does not feel separate from the classroom."
      >
        <div style={workflowStyles.summaryGrid}>
          <div style={workflowStyles.summaryMetric}>
            <div style={{ color: "#475569", fontSize: 13 }}>Teaching scope</div>
            <strong style={{ display: "block", marginTop: 6 }}>{scopeSummary}</strong>
          </div>
          <div style={workflowStyles.summaryMetric}>
            <div style={{ color: "#475569", fontSize: 13 }}>Attendance mode</div>
            <strong style={{ display: "block", marginTop: 6 }}>
              {formatTeacherWebAttendanceModeLabel(classroom.defaultAttendanceMode)}
            </strong>
          </div>
          <div style={workflowStyles.summaryMetric}>
            <div style={{ color: "#475569", fontSize: 13 }}>Students in view</div>
            <strong style={{ display: "block", fontSize: 24, marginTop: 6 }}>
              {rosterQuery.isLoading ? "..." : rosterMembers.length}
            </strong>
          </div>
          <div style={workflowStyles.summaryMetric}>
            <div style={{ color: "#475569", fontSize: 13 }}>Pending / Blocked</div>
            <strong style={{ display: "block", marginTop: 6 }}>
              {pendingCount} pending · {blockedCount} blocked
            </strong>
          </div>
        </div>
      </WebSectionCard>

      <div style={workflowStyles.twoColumn}>
        <WebSectionCard
          title="Add student"
          description="Use a student email or identifier so normal classroom roster work stays quick."
        >
          <div style={workflowStyles.grid}>
            <div style={workflowStyles.formGrid}>
              <WorkflowField
                label="Student email or identifier"
                value={studentLookup}
                onChange={setStudentLookup}
                placeholder="student.one@attendease.dev or 23CS001"
              />
              <WorkflowSelectField
                label="Starting membership state"
                value={newMemberStatus}
                onChange={(value) => setNewMemberStatus(value as "ACTIVE" | "PENDING")}
                options={[
                  { value: "PENDING", label: "Pending" },
                  { value: "ACTIVE", label: "Active" },
                ]}
              />
            </div>

            <div style={workflowStyles.buttonRow}>
              <button
                type="button"
                onClick={() => addMember.mutate()}
                disabled={addMember.isPending}
                style={workflowStyles.primaryButton}
              >
                {addMember.isPending ? "Adding..." : "Add student"}
              </button>
            </div>

            <div style={workflowStyles.stateCard}>
              Accepted lookup values:
              <br />
              student email
              <br />
              student identifier
            </div>
          </div>
        </WebSectionCard>

        <WebSectionCard
          title="Roster filters"
          description="Search by student identity and narrow the current classroom roster without losing course context."
        >
          <div style={workflowStyles.grid}>
            <div style={workflowStyles.formGrid}>
              <WorkflowField label="Search students" value={search} onChange={setSearch} />
              <WorkflowSelectField
                label="Membership state"
                value={statusFilter}
                onChange={(value) =>
                  setStatusFilter(value as "ALL" | "ACTIVE" | "PENDING" | "DROPPED" | "BLOCKED")
                }
                options={[
                  { value: "ALL", label: "All students" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "PENDING", label: "Pending" },
                  { value: "DROPPED", label: "Dropped" },
                  { value: "BLOCKED", label: "Blocked" },
                ]}
              />
            </div>

            <div style={workflowStyles.stateCard}>
              {rosterQuery.isLoading ? "Refreshing roster..." : rosterSummary}
              <br />
              {activeCount} active students ready for attendance from this view.
            </div>
          </div>
        </WebSectionCard>
      </div>

      <WebSectionCard
        title="Students"
        description="Review each student in course context, update membership state where policy allows, and remove a student explicitly when needed."
      >
        {rosterQuery.isLoading ? <WorkflowStateCard message="Loading roster..." /> : null}
        {rosterQuery.isError ? (
          <WorkflowBanner
            tone="danger"
            message={
              rosterQuery.error instanceof Error
                ? rosterQuery.error.message
                : "Failed to load the roster."
            }
          />
        ) : null}
        {rosterQuery.data && rosterQuery.data.length === 0 ? (
          <WorkflowStateCard message={rosterSummary} />
        ) : null}

        {rosterQuery.data && rosterQuery.data.length > 0 ? (
          <div style={workflowStyles.cardGrid}>
            {rosterQuery.data.map((member) => {
              const membershipSource = member.membershipSource ?? member.source

              return (
                <div key={member.id} style={workflowStyles.rowCard}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div>
                      <strong style={{ display: "block", fontSize: 18 }}>
                        {member.studentName ?? member.studentDisplayName}
                      </strong>
                      <div style={{ color: "#64748b", marginTop: 6, lineHeight: 1.5 }}>
                        {buildTeacherWebRosterMemberIdentityText(member)}
                      </div>
                    </div>

                    <div style={workflowStyles.buttonRow}>
                      <span style={workflowStyles.pill}>{member.membershipState}</span>
                      <span style={workflowStyles.pill}>{membershipSource}</span>
                      {member.attendanceDisabled ? (
                        <span style={workflowStyles.pill}>Attendance paused</span>
                      ) : null}
                    </div>

                    <div style={{ color: "#475569", lineHeight: 1.6 }}>
                      Member since {formatPortalDateTime(member.memberSince)}
                      <br />
                      Joined via {membershipSource.toLowerCase().replaceAll("_", " ")}
                    </div>

                    <div style={workflowStyles.buttonRow}>
                      {buildTeacherWebRosterMemberActions(member).map((action) =>
                        action.kind === "REMOVE" ? (
                          <button
                            type="button"
                            key={`${member.id}-${action.label}`}
                            onClick={() => removeMember.mutate(member.id)}
                            disabled={removeMember.isPending || updateMember.isPending}
                            style={workflowStyles.dangerButton}
                          >
                            {removeMember.isPending ? "Removing..." : action.label}
                          </button>
                        ) : (
                          <button
                            type="button"
                            key={`${member.id}-${action.membershipStatus}`}
                            onClick={() =>
                              updateMember.mutate({
                                enrollmentId: member.id,
                                membershipStatus: action.membershipStatus,
                              })
                            }
                            disabled={updateMember.isPending || removeMember.isPending}
                            style={
                              action.tone === "danger"
                                ? workflowStyles.dangerButton
                                : workflowStyles.secondaryButton
                            }
                          >
                            {updateMember.isPending ? "Saving..." : action.label}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </WebSectionCard>

      {statusMessage ? <WorkflowBanner tone="info" message={statusMessage} /> : null}
    </div>
  )
}
