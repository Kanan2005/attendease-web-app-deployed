"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { startTransition, useEffect, useState } from "react"

import {
  buildAdminClassroomArchiveReadiness,
  buildAdminClassroomGovernanceImpactModel,
  buildAdminClassroomGovernanceSummaryMessage,
} from "../admin-classroom-governance"
import { webWorkflowQueryKeys } from "../web-workflows"

import { ClassroomGovernanceWorkspaceContent } from "./classroom-governance-content"
import { type AdminClassroomStatusFilter, bootstrap, styles } from "./shared"

export function AdminClassroomGovernanceWorkspace(props: {
  accessToken: string | null
}) {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminClassroomStatusFilter>("ALL")
  const [semesterId, setSemesterId] = useState("")
  const [submittedFilters, setSubmittedFilters] = useState<{
    query: string
    status: AdminClassroomStatusFilter
    semesterId: string
  }>({
    query: "",
    status: "ALL",
    semesterId: "",
  })
  const [selectedClassroomId, setSelectedClassroomId] = useState("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [actionReason, setActionReason] = useState(
    "Registrar reviewed classroom history, teacher ownership, and attendance impact before archiving.",
  )
  const [highRiskAcknowledged, setHighRiskAcknowledged] = useState(false)

  const semestersQuery = useQuery({
    queryKey: webWorkflowQueryKeys.semesters(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listSemesters(props.accessToken ?? ""),
  })

  const classroomsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminClassrooms({
      query: submittedFilters.query || undefined,
      status: submittedFilters.status === "ALL" ? undefined : submittedFilters.status,
      semesterId: submittedFilters.semesterId || undefined,
    }),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listAdminClassrooms(props.accessToken ?? "", {
        query: submittedFilters.query || undefined,
        status: submittedFilters.status === "ALL" ? undefined : submittedFilters.status,
        semesterId: submittedFilters.semesterId || undefined,
        limit: 12,
      }),
  })

  useEffect(() => {
    if (!classroomsQuery.data) {
      return
    }

    setStatusMessage(
      buildAdminClassroomGovernanceSummaryMessage(
        classroomsQuery.data.length,
        submittedFilters.query || "all classrooms",
      ),
    )
  }, [classroomsQuery.data, submittedFilters])

  useEffect(() => {
    if (!classroomsQuery.data) {
      return
    }

    if (classroomsQuery.data.length === 0) {
      setSelectedClassroomId("")
      return
    }

    if (classroomsQuery.data.some((classroom) => classroom.id === selectedClassroomId)) {
      return
    }

    startTransition(() => {
      setSelectedClassroomId(classroomsQuery.data[0]?.id ?? "")
    })
  }, [classroomsQuery.data, selectedClassroomId])

  const detailQuery = useQuery({
    queryKey: selectedClassroomId
      ? webWorkflowQueryKeys.adminClassroomDetail(selectedClassroomId)
      : ["web-workflows", "admin-classroom-detail", "none"],
    enabled: Boolean(props.accessToken && selectedClassroomId),
    queryFn: () =>
      bootstrap.authClient.getAdminClassroom(props.accessToken ?? "", selectedClassroomId),
  })

  const archiveClassroom = useMutation({
    mutationFn: async () => {
      if (!props.accessToken || !selectedClassroomId) {
        throw new Error("Select a classroom before you archive it.")
      }

      return bootstrap.authClient.archiveAdminClassroom(props.accessToken, selectedClassroomId, {
        reason: actionReason.trim(),
      })
    },
    onSuccess: async (archived) => {
      setHighRiskAcknowledged(false)
      setStatusMessage(`Archived ${archived.classroomTitle ?? archived.displayTitle}.`)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.adminClassrooms({
            query: submittedFilters.query || undefined,
            status: submittedFilters.status === "ALL" ? undefined : submittedFilters.status,
            semesterId: submittedFilters.semesterId || undefined,
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.adminClassroomDetail(archived.id),
        }),
      ])
    },
    onError: (error) => {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to archive the classroom safely.",
      )
    },
  })

  const archiveReadiness = detailQuery.data
    ? buildAdminClassroomArchiveReadiness({
        classroomStatus: detailQuery.data.status,
        liveAttendanceSessionCount: detailQuery.data.governance.liveAttendanceSessionCount,
        reason: actionReason,
        acknowledged: highRiskAcknowledged,
      })
    : null
  const governanceImpact = detailQuery.data
    ? buildAdminClassroomGovernanceImpactModel(detailQuery.data)
    : null

  return (
    <div style={styles.grid}>
      <ClassroomGovernanceWorkspaceContent
        accessToken={props.accessToken}
        query={query}
        statusFilter={statusFilter}
        semesterId={semesterId}
        semesters={semestersQuery.data}
        onQueryChange={setQuery}
        onStatusFilterChange={setStatusFilter}
        onSemesterChange={setSemesterId}
        onSearch={() =>
          setSubmittedFilters({
            query: query.trim(),
            status: statusFilter,
            semesterId,
          })
        }
        isSearching={classroomsQuery.isFetching}
        classroomsLoading={classroomsQuery.isLoading}
        classroomsData={classroomsQuery.data}
        classroomsError={classroomsQuery.error}
        classroomsErrorExists={classroomsQuery.isError}
        selectedClassroomId={selectedClassroomId}
        onSelectClassroom={setSelectedClassroomId}
        detailLoading={detailQuery.isLoading}
        detailData={detailQuery.data ?? null}
        detailError={detailQuery.error}
        detailErrorExists={detailQuery.isError}
        actionReason={actionReason}
        onActionReasonChange={setActionReason}
        highRiskAcknowledged={highRiskAcknowledged}
        onHighRiskAcknowledgedChange={setHighRiskAcknowledged}
        archiveReadiness={archiveReadiness}
        governanceImpact={governanceImpact}
        onArchive={() => archiveClassroom.mutate()}
        isArchiving={archiveClassroom.isPending}
        statusMessage={statusMessage}
      />
    </div>
  )
}
