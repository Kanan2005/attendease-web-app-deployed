"use client"

import type { AdminUpdateStudentStatusRequest } from "@attendease/contracts"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { startTransition, useEffect, useState } from "react"

import {
  buildAdminStudentManagementSummaryMessage,
  buildAdminStudentStatusActionLabel,
  buildAdminStudentStatusActionReadiness,
} from "../admin-student-management"
import { webWorkflowQueryKeys } from "../web-workflows"

import { type AdminStudentStatusFilter, bootstrap } from "./shared"
import { StudentManagementWorkspaceContent } from "./student-management-content"

type AdminStudentNextStatus = AdminUpdateStudentStatusRequest["nextStatus"]

type ActionReadiness = ReturnType<typeof buildAdminStudentStatusActionReadiness>

export function AdminStudentManagementWorkspace(props: { accessToken: string | null }) {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const [accountStatus, setAccountStatus] = useState<AdminStudentStatusFilter>("ALL")
  const [submittedFilters, setSubmittedFilters] = useState<{
    query: string
    accountStatus: AdminStudentStatusFilter
  }>({
    query: "",
    accountStatus: "ALL",
  })
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [actionReason, setActionReason] = useState(
    "Support verified the request and reviewed the student's classroom and device context.",
  )
  const [highRiskAcknowledged, setHighRiskAcknowledged] = useState(false)

  const studentsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminStudents({
      query: submittedFilters.query || undefined,
      accountStatus:
        submittedFilters.accountStatus === "ALL" ? undefined : submittedFilters.accountStatus,
    }),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listStudentSupportCases(props.accessToken ?? "", {
        query: submittedFilters.query || undefined,
        accountStatus:
          submittedFilters.accountStatus === "ALL" ? undefined : submittedFilters.accountStatus,
        limit: 12,
      }),
  })

  useEffect(() => {
    if (!studentsQuery.data) {
      return
    }

    setStatusMessage(
      buildAdminStudentManagementSummaryMessage(
        studentsQuery.data.length,
        submittedFilters.query || "all students",
      ),
    )
  }, [studentsQuery.data, submittedFilters])

  useEffect(() => {
    if (!studentsQuery.data) {
      return
    }

    if (studentsQuery.data.length === 0) {
      setSelectedStudentId("")
      return
    }

    if (studentsQuery.data.some((record) => record.student.id === selectedStudentId)) {
      return
    }

    startTransition(() => {
      setSelectedStudentId(studentsQuery.data[0]?.student.id ?? "")
    })
  }, [selectedStudentId, studentsQuery.data])

  const detailQuery = useQuery({
    queryKey: selectedStudentId
      ? webWorkflowQueryKeys.adminStudentDetail(selectedStudentId)
      : ["web-workflows", "admin-student-detail", "none"],
    enabled: Boolean(props.accessToken && selectedStudentId),
    queryFn: () =>
      bootstrap.authClient.getStudentSupportCase(props.accessToken ?? "", selectedStudentId),
  })

  const updateStudentStatus = useMutation({
    mutationFn: async (nextStatus: AdminStudentNextStatus) => {
      if (!props.accessToken || !selectedStudentId) {
        throw new Error("Select a student support case before you change account access.")
      }

      return bootstrap.authClient.updateAdminStudentStatus(props.accessToken, selectedStudentId, {
        nextStatus,
        reason: actionReason.trim(),
      })
    },
    onSuccess: async (result, nextStatus) => {
      setHighRiskAcknowledged(false)
      setStatusMessage(
        `${buildAdminStudentStatusActionLabel(nextStatus)} saved for ${
          result.student.student.displayName
        }. Revoked ${result.revokedSessionCount} active session${
          result.revokedSessionCount === 1 ? "" : "s"
        }.`,
      )
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.adminStudents({
            query: submittedFilters.query || undefined,
            accountStatus:
              submittedFilters.accountStatus === "ALL" ? undefined : submittedFilters.accountStatus,
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: webWorkflowQueryKeys.adminStudentDetail(result.student.student.id),
        }),
      ])
    },
    onError: (error) => {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to change the student account state.",
      )
    },
  })

  const detail = detailQuery.data
  const actionOptions = detail
    ? [
        detail.actions.canReactivate ? "ACTIVE" : null,
        detail.actions.canDeactivate ? "BLOCKED" : null,
        detail.actions.canArchive ? "ARCHIVED" : null,
      ].filter((value): value is AdminStudentNextStatus => value !== null)
    : []

  const actionReadinessByStatus = actionOptions.reduce<
    Partial<Record<AdminStudentNextStatus, ActionReadiness>>
  >((acc, nextStatus) => {
    if (!detail) {
      return acc
    }

    acc[nextStatus] = buildAdminStudentStatusActionReadiness({
      currentStatus: detail.student.status,
      nextStatus,
      reason: actionReason,
      acknowledged: highRiskAcknowledged,
    })

    return acc
  }, {})

  return (
    <StudentManagementWorkspaceContent
      accessToken={props.accessToken}
      query={query}
      accountStatus={accountStatus}
      onQueryChange={setQuery}
      onAccountStatusChange={setAccountStatus}
      onSearch={() =>
        setSubmittedFilters({
          query: query.trim(),
          accountStatus,
        })
      }
      isSearching={studentsQuery.isFetching}
      studentsLoading={studentsQuery.isLoading}
      studentsData={studentsQuery.data}
      studentsError={studentsQuery.error}
      studentsErrorExists={studentsQuery.isError}
      selectedStudentId={selectedStudentId}
      onSelectStudent={setSelectedStudentId}
      detailLoading={detailQuery.isLoading}
      detailData={detailQuery.data ?? null}
      detailError={detailQuery.error}
      detailErrorExists={detailQuery.isError}
      actionReason={actionReason}
      onReasonChange={setActionReason}
      highRiskAcknowledged={highRiskAcknowledged}
      onHighRiskAcknowledgedChange={setHighRiskAcknowledged}
      actionOptions={actionOptions}
      actionReadinessByStatus={actionReadinessByStatus}
      onApplyStatus={(nextStatus) => updateStudentStatus.mutate(nextStatus)}
      isApplyingStatus={updateStudentStatus.isPending}
      statusMessage={statusMessage}
    />
  )
}
