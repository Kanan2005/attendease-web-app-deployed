"use client"

import type { ClassroomRosterMemberSummary } from "@attendease/contracts"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import {
  buildTeacherWebRosterAddRequest,
  buildTeacherWebRosterFilters,
  buildTeacherWebRosterResultSummary,
} from "../teacher-roster-management"
import { webWorkflowQueryKeys } from "../web-workflows"

import { WorkflowBanner, WorkflowStateCard, bootstrap, workflowStyles } from "./shared"
import {
  TeacherRosterAddStudentCard,
  TeacherRosterFiltersCard,
} from "./teacher-roster-workspace/add-and-filter-cards"
import { TeacherRosterHeaderSummary } from "./teacher-roster-workspace/header-summary"
import { TeacherRosterStudentsCard } from "./teacher-roster-workspace/students-card"

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
      <TeacherRosterHeaderSummary
        classroom={classroom}
        visibleCount={rosterMembers.length}
        pendingCount={pendingCount}
        blockedCount={blockedCount}
        loading={rosterQuery.isLoading}
      />

      <div style={workflowStyles.twoColumn}>
        <TeacherRosterAddStudentCard
          studentLookup={studentLookup}
          newMemberStatus={newMemberStatus}
          addPending={addMember.isPending}
          setStudentLookup={setStudentLookup}
          setNewMemberStatus={setNewMemberStatus}
          onAdd={() => addMember.mutate()}
        />
        <TeacherRosterFiltersCard
          search={search}
          statusFilter={statusFilter}
          loading={rosterQuery.isLoading}
          rosterSummary={rosterSummary}
          activeCount={activeCount}
          setSearch={setSearch}
          setStatusFilter={setStatusFilter}
        />
      </div>

      <TeacherRosterStudentsCard
        members={rosterQuery.data}
        loading={rosterQuery.isLoading}
        error={rosterQuery.error}
        rosterSummary={rosterSummary}
        updatePending={updateMember.isPending}
        removePending={removeMember.isPending}
        onUpdate={(input) => updateMember.mutate(input)}
        onRemove={(enrollmentId) => removeMember.mutate(enrollmentId)}
      />

      {statusMessage ? <WorkflowBanner tone="info" message={statusMessage} /> : null}
    </div>
  )
}
