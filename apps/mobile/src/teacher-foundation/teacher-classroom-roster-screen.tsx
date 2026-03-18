import type { ClassroomRosterMemberSummary } from "@attendease/contracts"
import { useState } from "react"
import { Alert } from "react-native"

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { buildTeacherRosterImportDraftModel } from "../teacher-operational"
import type { TeacherRosterStatusFilter } from "../teacher-roster-management"
import {
  buildTeacherRosterAddRequest,
  buildTeacherRosterFilters,
  buildTeacherRosterMemberActions,
  buildTeacherRosterMemberIdentityText,
  buildTeacherRosterResultSummary,
  teacherRosterStatusFilters,
} from "../teacher-roster-management"
import { teacherRoutes } from "../teacher-routes"
import { useTeacherSession } from "../teacher-session"
import { buildTeacherRosterStatus } from "../teacher-view-state"
import {
  useTeacherAddRosterMemberMutation,
  useTeacherApplyRosterImportMutation,
  useTeacherClassroomDetailData,
  useTeacherClassroomRosterQuery,
  useTeacherCreateRosterImportMutation,
  useTeacherRemoveRosterMemberMutation,
  useTeacherUpdateRosterMemberMutation,
} from "./queries"
import { formatDateTime, formatEnum } from "./shared-ui"
import { TeacherClassroomRosterScreenContent } from "./teacher-classroom-roster-screen-content"

const mapRosterMember = (
  member: ClassroomRosterMemberSummary,
): {
  id: string
  studentDisplayName: string
  identityText: string
  statusText: string
  joinedAtText: string
  attendanceDisabled: string
  actions: {
    key: string
    label: string
    tone: "secondary" | "danger"
    kind: "REMOVE" | "UPDATE"
    membershipStatus?: string
  }[]
} => ({
  id: member.id,
  studentDisplayName: member.studentDisplayName,
  identityText: buildTeacherRosterMemberIdentityText(member),
  statusText: formatEnum(member.membershipState),
  joinedAtText: formatDateTime(member.memberSince),
  attendanceDisabled: member.attendanceDisabled ? "Yes" : "No",
  actions: buildTeacherRosterMemberActions(member).map((action) => ({
    key: `${action.kind}-${member.id}-${action.label}`,
    label: action.label,
    tone: action.tone === "danger" ? "danger" : "secondary",
    kind: action.kind,
    ...(action.kind === "UPDATE"
      ? {
          membershipStatus: action.membershipStatus,
        }
      : {}),
  })),
})

export function TeacherClassroomRosterScreen(props: { classroomId: string }) {
  const { session } = useTeacherSession()
  const classroom = useTeacherClassroomDetailData(props.classroomId)
  const addRosterMutation = useTeacherAddRosterMemberMutation(props.classroomId)
  const updateRosterMutation = useTeacherUpdateRosterMemberMutation(props.classroomId)
  const removeRosterMutation = useTeacherRemoveRosterMemberMutation(props.classroomId)
  const createRosterImportMutation = useTeacherCreateRosterImportMutation(props.classroomId)
  const applyRosterImportMutation = useTeacherApplyRosterImportMutation(props.classroomId)
  const classroomContext = teacherRoutes.classroomContext(props.classroomId)

  const [studentLookup, setStudentLookup] = useState("")
  const [memberStatus, setMemberStatus] = useState<"ACTIVE" | "PENDING">("ACTIVE")
  const [searchText, setSearchText] = useState("")
  const [statusFilter, setStatusFilter] = useState<TeacherRosterStatusFilter>("ALL")
  const [sourceFileName, setSourceFileName] = useState("teacher-mobile-import.csv")
  const [rowsText, setRowsText] = useState("")
  const [rosterMessage, setRosterMessage] = useState<string | null>(null)

  const rosterFilters = buildTeacherRosterFilters({
    searchText,
    statusFilter,
  })
  const filteredRosterQuery = useTeacherClassroomRosterQuery(props.classroomId, rosterFilters)
  const importDraft = buildTeacherRosterImportDraftModel(rowsText)
  const classroomDetail = classroom.detailQuery.data ?? null
  const rosterMembers = (filteredRosterQuery.data ?? []).map(mapRosterMember)
  const totalRosterCount = classroom.rosterQuery.data?.length ?? 0
  const activeRosterCount =
    classroom.rosterQuery.data?.filter((member) => member.membershipState === "ACTIVE").length ?? 0
  const pendingRosterCount =
    classroom.rosterQuery.data?.filter((member) => member.membershipState === "PENDING").length ?? 0
  const blockedRosterCount =
    classroom.rosterQuery.data?.filter((member) => member.membershipState === "BLOCKED").length ?? 0
  const rosterStatus = buildTeacherRosterStatus({
    hasSession: Boolean(session),
    isLoading:
      classroom.detailQuery.isLoading ||
      classroom.rosterQuery.isLoading ||
      filteredRosterQuery.isLoading ||
      classroom.rosterImportsQuery.isLoading,
    errorMessage:
      classroom.detailQuery.error ||
      classroom.rosterQuery.error ||
      filteredRosterQuery.error ||
      classroom.rosterImportsQuery.error
        ? mapTeacherApiErrorToMessage(
            classroom.detailQuery.error ??
              classroom.rosterQuery.error ??
              filteredRosterQuery.error ??
              classroom.rosterImportsQuery.error,
          )
        : null,
    totalCount: totalRosterCount,
    visibleCount: filteredRosterQuery.data?.length ?? 0,
    hasActiveFilter: statusFilter !== "ALL" || searchText.trim().length > 0,
  })

  const importPreview = {
    title: `${classroom.rosterImportsQuery.data?.length ?? 0} import job(s) currently queued`,
    message: `Queued roster actions are visible below for ${classroomDetail?.displayTitle ?? classroomDetail?.classroomTitle ?? "this classroom"}.`,
  }

  const rosterJobs = (classroom.rosterImportsQuery.data ?? []).map((job) => ({
    id: job.id,
    fileName: job.sourceFileName,
    status: job.status,
    appliedRows: job.appliedRows,
    totalRows: job.totalRows,
    canApplyReview: job.status === "REVIEW_REQUIRED",
  }))

  return (
    <TeacherClassroomRosterScreenContent
      hasSession={Boolean(session)}
      isLoading={
        classroom.detailQuery.isLoading ||
        classroom.rosterQuery.isLoading ||
        filteredRosterQuery.isLoading ||
        classroom.rosterImportsQuery.isLoading
      }
      loadErrorMessage={
        classroom.detailQuery.error ||
        classroom.rosterQuery.error ||
        filteredRosterQuery.error ||
        classroom.rosterImportsQuery.error
          ? mapTeacherApiErrorToMessage(
              classroom.detailQuery.error ??
                classroom.rosterQuery.error ??
                filteredRosterQuery.error ??
                classroom.rosterImportsQuery.error,
            )
          : null
      }
      rosterStatusBanner={rosterStatus}
      classroomTitle={
        classroomDetail?.classroomTitle ?? classroomDetail?.displayTitle ?? "Classroom"
      }
      classroomSummaryText={
        classroomDetail
          ? buildTeacherRosterResultSummary({
              totalCount: totalRosterCount,
              visibleCount: filteredRosterQuery.data?.length ?? 0,
              statusFilter,
              searchText,
            })
          : ""
      }
      totalRosterCount={totalRosterCount}
      activeRosterCount={activeRosterCount}
      pendingRosterCount={pendingRosterCount}
      blockedRosterCount={blockedRosterCount}
      routeLinks={{
        detail: classroomContext.detail,
        schedule: classroomContext.schedule,
        announcements: classroomContext.announcements,
      }}
      studentLookup={studentLookup}
      memberStatus={memberStatus}
      importSourceFileName={sourceFileName}
      importRowsText={rowsText}
      invalidImportRows={importDraft.invalidLines.length}
      parsedRowsCount={importDraft.rows.length}
      importPreviewTitle={importPreview.title}
      importPreviewMessage={importPreview.message}
      searchText={searchText}
      statusFilter={statusFilter}
      statusFilters={teacherRosterStatusFilters}
      rosterSummaryText={buildTeacherRosterResultSummary({
        totalCount: totalRosterCount,
        visibleCount: filteredRosterQuery.data?.length ?? 0,
        statusFilter,
        searchText,
      })}
      rosterMessage={rosterMessage}
      members={rosterMembers}
      jobs={rosterJobs}
      isCreateImportPending={createRosterImportMutation.isPending}
      isApplyImportPending={applyRosterImportMutation.isPending}
      addMutationError={addRosterMutation.error}
      updateMutationError={updateRosterMutation.error}
      removeMutationError={removeRosterMutation.error}
      applyImportMutationError={applyRosterImportMutation.error}
      isAddPending={addRosterMutation.isPending}
      addButtonDisabled={false}
      isRosterLoading={updateRosterMutation.isPending || removeRosterMutation.isPending}
      rosterImportLoading={classroom.rosterImportsQuery.isLoading}
      onSetStudentLookup={(value) => setStudentLookup(value)}
      onSetMemberStatus={setMemberStatus}
      onAddStudent={() => {
        addRosterMutation.mutate(
          buildTeacherRosterAddRequest({
            lookup: studentLookup,
            membershipStatus: memberStatus,
          }),
          {
            onSuccess: (member) => {
              setStudentLookup("")
              setMemberStatus("ACTIVE")
              setRosterMessage(`Added ${member.studentDisplayName} to the classroom.`)
            },
          },
        )
      }}
      onSetSearchText={setSearchText}
      onSetStatusFilter={setStatusFilter}
      onPerformMemberAction={(
        member,
        action: { kind: "REMOVE" | "UPDATE"; membershipStatus?: string },
      ) => {
        if (action.kind === "REMOVE") {
          Alert.alert(
            "Remove Student",
            `Remove ${member.studentDisplayName} from this classroom?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Remove",
                style: "destructive",
                onPress: () => {
                  removeRosterMutation.mutate(member.id, {
                    onSuccess: () => {
                      setRosterMessage(`Removed ${member.studentDisplayName} from this classroom.`)
                    },
                  })
                },
              },
            ],
          )
          return
        }

        if (action.kind === "UPDATE" && action.membershipStatus) {
          updateRosterMutation.mutate(
            {
              enrollmentId: member.id,
              membershipStatus: action.membershipStatus as never,
            },
            {
              onSuccess: () => {
                setRosterMessage(
                  `${member.studentDisplayName} is now ${action.membershipStatus?.toLowerCase()}.`,
                )
              },
            },
          )
        }
      }}
      onSetImportSourceFileName={setSourceFileName}
      onSetImportRows={setRowsText}
      onCreateImportJob={() => {
        createRosterImportMutation.mutate(
          {
            sourceFileName: sourceFileName.trim(),
            rowsText,
          },
          {
            onSuccess: (job) => {
              setRowsText("")
              setRosterMessage(
                `Created import job ${job.sourceFileName} with ${job.totalRows} row${job.totalRows === 1 ? "" : "s"}.`,
              )
            },
          },
        )
      }}
      onApplyReviewJob={(jobId) => {
        applyRosterImportMutation.mutate(jobId, {
          onSuccess: () => {
            setRosterMessage("Applied reviewed rows for this import.")
          },
        })
      }}
      onSetRosterMessage={(message) => {
        setRosterMessage(message)
      }}
      isAddStudentEnabled={totalRosterCount === 0}
    />
  )
}
