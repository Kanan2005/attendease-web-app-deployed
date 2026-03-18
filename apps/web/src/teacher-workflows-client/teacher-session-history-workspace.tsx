"use client"

import type {
  AttendanceMode,
  AttendanceSessionStatus,
  AttendanceSessionStudentSummary,
} from "@attendease/contracts"
import {
  buildAttendanceCorrectionSaveMessage,
  buildAttendanceEditChanges,
  createAttendanceEditDraft,
  getAttendanceCorrectionReviewPollInterval,
} from "@attendease/domain"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useEffect, useState } from "react"

import { webTheme } from "@attendease/ui-web"
import {
  type TeacherWebHistoryFilterDraft,
  buildTeacherWebAcademicFilterOptions,
  buildTeacherWebFilterSummary,
  buildTeacherWebHistoryQueryFilters,
  buildTeacherWebSessionDetailOverviewModel,
  buildTeacherWebSessionDetailStatusModel,
  buildTeacherWebSessionHistorySummaryModel,
  buildTeacherWebSessionRosterModel,
  createTeacherWebHistoryFilterDraft,
  mapTeacherWebReviewErrorToMessage,
} from "../teacher-review-workflows"
import { getTeacherSessionHistoryPollInterval, webWorkflowQueryKeys } from "../web-workflows"

import {
  WorkflowBanner,
  WorkflowStateCard,
  bootstrap,
  findSelectedFilterLabel,
  workflowStyles,
} from "./shared"
import { TeacherSessionHistoryFiltersPanel } from "./teacher-session-history-workspace/filters-panel"
import { TeacherSessionHistoryDetail } from "./teacher-session-history-workspace/session-detail"
import { TeacherSessionHistoryList } from "./teacher-session-history-workspace/session-list"

export function TeacherSessionHistoryWorkspace(props: {
  accessToken: string | null
}) {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState(() => createTeacherWebHistoryFilterDraft())
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, AttendanceSessionStudentSummary["status"]>>({})

  const classroomsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classrooms(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listClassrooms(props.accessToken ?? ""),
  })
  const academicFilterOptions = buildTeacherWebAcademicFilterOptions(classroomsQuery.data ?? [])
  const historyFilters = buildTeacherWebHistoryQueryFilters(filters)
  const filterSummary = buildTeacherWebFilterSummary({
    classroom: findSelectedFilterLabel(academicFilterOptions.classroomOptions, filters.classroomId),
    class: findSelectedFilterLabel(academicFilterOptions.classOptions, filters.classId),
    section: findSelectedFilterLabel(academicFilterOptions.sectionOptions, filters.sectionId),
    subject: findSelectedFilterLabel(academicFilterOptions.subjectOptions, filters.subjectId),
    fromDate: filters.fromDate || null,
    toDate: filters.toDate || null,
  })

  const historyQuery = useQuery({
    queryKey: webWorkflowQueryKeys.sessionHistory(historyFilters),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listAttendanceSessions(props.accessToken ?? "", historyFilters),
    refetchInterval: (query) => getTeacherSessionHistoryPollInterval(query.state.data ?? null),
  })

  useEffect(() => {
    if (!historyQuery.data?.length) {
      setSelectedSessionId("")
      return
    }

    const selectedStillExists = historyQuery.data.some(
      (session) => session.id === selectedSessionId,
    )

    if (!selectedStillExists) {
      setSelectedSessionId(historyQuery.data[0]?.id ?? "")
    }
  }, [historyQuery.data, selectedSessionId])

  const selectedHistorySession =
    historyQuery.data?.find((session) => session.id === selectedSessionId) ?? null

  const detailQuery = useQuery({
    queryKey: webWorkflowQueryKeys.attendanceSession(selectedSessionId),
    enabled: Boolean(props.accessToken && selectedSessionId),
    queryFn: () =>
      bootstrap.authClient.getAttendanceSessionDetail(props.accessToken ?? "", selectedSessionId),
    refetchInterval: (query) =>
      getAttendanceCorrectionReviewPollInterval(query.state.data ?? selectedHistorySession),
  })

  const studentsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.attendanceSessionStudents(selectedSessionId),
    enabled: Boolean(props.accessToken && selectedSessionId),
    queryFn: () =>
      bootstrap.authClient.listAttendanceSessionStudents(
        props.accessToken ?? "",
        selectedSessionId,
      ),
    refetchInterval: getAttendanceCorrectionReviewPollInterval(
      detailQuery.data ?? selectedHistorySession,
    ),
  })

  useEffect(() => {
    if (!studentsQuery.data) {
      return
    }

    setDraft(createAttendanceEditDraft(studentsQuery.data))
  }, [studentsQuery.data])

  const saveManualEdits = useMutation({
    mutationFn: async () => {
      if (!props.accessToken || !selectedSessionId || !studentsQuery.data) {
        throw new Error(
          "Manual attendance edits require a selected session and loaded student rows.",
        )
      }

      const changes = buildAttendanceEditChanges(studentsQuery.data, draft)

      if (changes.length === 0) {
        throw new Error("No attendance changes are waiting to be saved.")
      }

      return bootstrap.authClient.updateAttendanceSessionAttendance(
        props.accessToken,
        selectedSessionId,
        { changes },
      )
    },
    onSuccess: async (result) => {
      setStatusMessage(buildAttendanceCorrectionSaveMessage(result.appliedChangeCount))
      setDraft(createAttendanceEditDraft(result.students))
      queryClient.setQueryData(
        webWorkflowQueryKeys.attendanceSession(selectedSessionId),
        result.session,
      )
      queryClient.setQueryData(
        webWorkflowQueryKeys.attendanceSessionStudents(selectedSessionId),
        result.students,
      )
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["web-workflows", "session-history"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["web-workflows", "teacher-daywise-reports"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["web-workflows", "teacher-subjectwise-reports"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["web-workflows", "teacher-student-percentage-reports"],
        }),
      ])
    },
    onError: (error) => {
      setStatusMessage(
        mapTeacherWebReviewErrorToMessage(
          error,
          "AttendEase couldn't save the attendance changes.",
        ),
      )
    },
  })

  const detail = detailQuery.data
  const students = studentsQuery.data ?? []
  const pendingChanges = buildAttendanceEditChanges(students, draft)
  const historySummary = buildTeacherWebSessionHistorySummaryModel({
    sessions: historyQuery.data ?? [],
    filterSummary,
  })
  const rosterModel = buildTeacherWebSessionRosterModel({
    students,
    draft,
    isEditable: Boolean(detail?.editability.isEditable),
  })
  const detailOverview = buildTeacherWebSessionDetailOverviewModel({
    session: detail ?? null,
    roster: rosterModel,
    pendingChangeCount: pendingChanges.length,
  })
  const detailStatus = buildTeacherWebSessionDetailStatusModel({
    session: detail ?? null,
    pendingChangeCount: pendingChanges.length,
  })

  return (
    <div style={workflowStyles.grid}>
      <Link
        href="/teacher/classrooms"
        className="ui-back-link"
        style={{ fontSize: 13, color: webTheme.colors.textMuted, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <span aria-hidden>←</span> Back to classrooms
      </Link>

      <div style={{ marginBottom: 16 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: webTheme.colors.text,
            letterSpacing: "-0.02em",
          }}
        >
          Attendance sessions
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: webTheme.colors.textMuted }}>
          Filter by classroom, view records, and save corrections before the edit window closes.
        </p>
      </div>
      <TeacherSessionHistoryFiltersPanel
        accessToken={props.accessToken}
        filters={filters}
        setFilters={setFilters}
        academicFilterOptions={academicFilterOptions}
        classroomsError={classroomsQuery.error}
        errorMessage={
          classroomsQuery.isError
            ? mapTeacherWebReviewErrorToMessage(
                classroomsQuery.error,
                "AttendEase couldn't load the classroom filters.",
              )
            : null
        }
        historySummary={historySummary}
      />

      {!props.accessToken ? null : historyQuery.isLoading ? (
        <WorkflowStateCard message="Loading attendance sessions..." />
      ) : historyQuery.isError ? (
        <WorkflowBanner
          tone="danger"
          message={mapTeacherWebReviewErrorToMessage(
            historyQuery.error,
            "AttendEase couldn't load the attendance sessions.",
          )}
        />
      ) : historyQuery.data && historyQuery.data.length === 0 ? (
        <WorkflowStateCard message="No attendance sessions matched the current history filters." />
      ) : (
        <div style={workflowStyles.twoColumn}>
          <TeacherSessionHistoryList
            sessions={historyQuery.data ?? []}
            selectedSessionId={selectedSessionId}
            setSelectedSessionId={setSelectedSessionId}
          />

          <TeacherSessionHistoryDetail
            selectedSessionId={selectedSessionId}
            detailLoading={detailQuery.isLoading}
            studentsLoading={studentsQuery.isLoading}
            detailError={detailQuery.error}
            studentsError={studentsQuery.error}
            detail={detail ?? null}
            rosterModel={rosterModel}
            detailOverview={detailOverview}
            detailStatus={detailStatus}
            pendingChangesLength={pendingChanges.length}
            savePending={saveManualEdits.isPending}
            canSave={Boolean(detail?.editability.isEditable) && pendingChanges.length > 0}
            statusMessage={mapTeacherWebReviewErrorToMessage(
              detailQuery.error ?? studentsQuery.error,
              "AttendEase couldn't load the selected session.",
            )}
            onSave={() => saveManualEdits.mutate()}
            onReset={() => setDraft(createAttendanceEditDraft(students))}
            onToggleStatus={(attendanceRecordId, nextStatus) =>
              setDraft((current) => ({
                ...current,
                [attendanceRecordId]: nextStatus,
              }))
            }
          />
        </div>
      )}

      {statusMessage ? <WorkflowBanner tone="info" message={statusMessage} /> : null}
    </div>
  )
}
