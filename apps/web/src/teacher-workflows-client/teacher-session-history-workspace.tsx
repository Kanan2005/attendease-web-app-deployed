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
      <WebSectionCard
        title="Session review"
        description="Filter attendance sessions, open the saved student lists, and correct present or absent results without leaving the teacher portal."
      >
        {!props.accessToken ? (
          <WorkflowStateCard message="Sign in to review attendance sessions." />
        ) : (
          <div style={workflowStyles.grid}>
            <div style={workflowStyles.formGrid}>
              <WorkflowSelectField
                label="Classroom"
                value={filters.classroomId}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    classroomId: value,
                  }))
                }
                options={[
                  { value: "", label: "All classrooms" },
                  ...academicFilterOptions.classroomOptions,
                ]}
              />
              <WorkflowSelectField
                label="Class"
                value={filters.classId}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    classId: value,
                  }))
                }
                options={[
                  { value: "", label: "All classes" },
                  ...academicFilterOptions.classOptions,
                ]}
              />
              <WorkflowSelectField
                label="Section"
                value={filters.sectionId}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    sectionId: value,
                  }))
                }
                options={[
                  { value: "", label: "All sections" },
                  ...academicFilterOptions.sectionOptions,
                ]}
              />
              <WorkflowSelectField
                label="Subject"
                value={filters.subjectId}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    subjectId: value,
                  }))
                }
                options={[
                  { value: "", label: "All subjects" },
                  ...academicFilterOptions.subjectOptions,
                ]}
              />
              <WorkflowSelectField
                label="Session status"
                value={filters.status}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    status: value as AttendanceSessionStatus | "ALL",
                  }))
                }
                options={[
                  { value: "ALL", label: "All statuses" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "ENDED", label: "Ended" },
                  { value: "EXPIRED", label: "Expired" },
                  { value: "CANCELLED", label: "Cancelled" },
                ]}
              />
              <WorkflowSelectField
                label="Attendance mode"
                value={filters.mode}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    mode: value as AttendanceMode | "ALL",
                  }))
                }
                options={[
                  { value: "ALL", label: "All modes" },
                  { value: "QR_GPS", label: "QR + GPS" },
                  { value: "BLUETOOTH", label: "Bluetooth" },
                  { value: "MANUAL", label: "Manual" },
                ]}
              />
              <WorkflowField
                label="From date"
                value={filters.fromDate}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    fromDate: value,
                  }))
                }
                type="date"
              />
              <WorkflowField
                label="To date"
                value={filters.toDate}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    toDate: value,
                  }))
                }
                type="date"
              />
            </div>

            {classroomsQuery.isError ? (
              <WorkflowBanner
                tone="danger"
                message={mapTeacherWebReviewErrorToMessage(
                  classroomsQuery.error,
                  "AttendEase couldn't load the classroom filters.",
                )}
              />
            ) : null}

            <WorkflowSummaryGrid cards={historySummary.summaryCards} />

            <div style={workflowStyles.stateCard}>
              <strong style={{ display: "block", marginBottom: 8 }}>Current filter scope</strong>
              <div style={{ lineHeight: 1.7 }}>{historySummary.filterSummary}</div>
              <div style={{ marginTop: 10 }}>{historySummary.availabilityMessage}</div>
            </div>
          </div>
        )}
      </WebSectionCard>

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
          <WebSectionCard
            title="Sessions in view"
            description="Pick the saved session you want to review. Each card keeps the teaching context, final counts, and correction state together."
          >
            <div style={workflowStyles.grid}>
              {historyQuery.data?.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSessionId(session.id)}
                  style={{
                    ...workflowStyles.rowCard,
                    textAlign: "left",
                    cursor: "pointer",
                    borderColor:
                      selectedSessionId === session.id ? "#2563eb" : workflowStyles.rowCard.border,
                    background: selectedSessionId === session.id ? "#eff6ff" : "#ffffff",
                  }}
                >
                  <div style={workflowStyles.buttonRow}>
                    <WorkflowTonePill
                      label={session.status}
                      tone={toneForSessionState(session.status)}
                    />
                    <WorkflowTonePill
                      label={
                        session.editability.isEditable
                          ? "Corrections open"
                          : session.editability.state
                      }
                      tone={session.editability.isEditable ? "success" : "warning"}
                    />
                  </div>
                  <strong style={{ display: "block", marginTop: 10 }}>
                    {session.classroomDisplayTitle}
                  </strong>
                  <div style={{ color: "#475569", marginTop: 6 }}>
                    {session.lectureTitle ?? "Attendance session"} ·{" "}
                    {session.endedAt || session.startedAt || session.lectureDate
                      ? formatPortalDateTime(
                          session.endedAt ?? session.startedAt ?? session.lectureDate ?? "",
                        )
                      : "Time not recorded"}
                  </div>
                  <div style={{ color: "#64748b", marginTop: 6 }}>
                    {session.classCode} · {session.sectionTitle} · {session.subjectTitle}
                  </div>
                  <div style={{ color: "#64748b", marginTop: 6 }}>
                    {session.presentCount} present / {session.absentCount} absent ·{" "}
                    {formatTeacherWebAttendanceModeLabel(session.mode)}
                  </div>
                  <div style={{ color: "#64748b", marginTop: 6 }}>
                    {session.editability.isEditable
                      ? `Editable until ${session.editability.editableUntil ? formatPortalDateTime(session.editability.editableUntil) : "the window closes"}`
                      : "Read-only result"}
                  </div>
                </button>
              ))}
            </div>
          </WebSectionCard>

          <WebSectionCard
            title={detail ? `${detail.classroomDisplayTitle} session detail` : "Session detail"}
            description="Present and absent lists stay visible together so teachers can correct the saved attendance truth quickly."
          >
            {!selectedSessionId ? (
              <WorkflowStateCard message="Select a session to load detail and student rows." />
            ) : detailQuery.isLoading || studentsQuery.isLoading ? (
              <WorkflowStateCard message="Loading session detail..." />
            ) : detailQuery.isError || studentsQuery.isError ? (
              <WorkflowBanner
                tone="danger"
                message={mapTeacherWebReviewErrorToMessage(
                  detailQuery.error ?? studentsQuery.error,
                  "AttendEase couldn't load the selected session.",
                )}
              />
            ) : detail ? (
              <div style={workflowStyles.grid}>
                <WorkflowStatusCard
                  tone={detailStatus.tone}
                  title={detailStatus.title}
                  message={detailStatus.message}
                />

                <WorkflowSummaryGrid cards={detailOverview.summaryCards} />

                <div style={workflowStyles.rowCard}>
                  <div style={workflowStyles.buttonRow}>
                    <WorkflowTonePill
                      label={formatTeacherWebAttendanceModeLabel(detail.mode)}
                      tone="primary"
                    />
                    <WorkflowTonePill
                      label={detail.status}
                      tone={toneForSessionState(detail.status)}
                    />
                    <WorkflowTonePill
                      label={
                        detail.editability.isEditable
                          ? "Corrections open"
                          : detail.editability.state
                      }
                      tone={detail.editability.isEditable ? "success" : "warning"}
                    />
                  </div>
                  <div style={{ color: "#475569", marginTop: 12, lineHeight: 1.7 }}>
                    {detail.classroomCode} · {detail.classTitle} · {detail.sectionTitle} ·{" "}
                    {detail.subjectTitle}
                    <br />
                    {detail.lectureTitle ?? "Attendance session"} · Teacher:{" "}
                    {detail.teacherDisplayName}
                    <br />
                    {detailOverview.rosterSummary}
                    <br />
                    {detailOverview.timingSummary}
                  </div>
                  <div style={{ color: "#64748b", marginTop: 10, lineHeight: 1.7 }}>
                    {detailOverview.correctionSummary}
                    {detailOverview.securitySummary ? (
                      <>
                        <br />
                        {detailOverview.securitySummary}
                      </>
                    ) : null}
                  </div>
                </div>

                <div style={workflowStyles.buttonRow}>
                  <button
                    type="button"
                    onClick={() => saveManualEdits.mutate()}
                    disabled={
                      !detail.editability.isEditable ||
                      saveManualEdits.isPending ||
                      pendingChanges.length === 0
                    }
                    style={workflowStyles.primaryButton}
                  >
                    {saveManualEdits.isPending ? "Saving..." : "Save Attendance Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft(createAttendanceEditDraft(students))}
                    disabled={saveManualEdits.isPending || pendingChanges.length === 0}
                    style={workflowStyles.secondaryButton}
                  >
                    Reset corrections
                  </button>
                </div>

                {detail.editability.isEditable && pendingChanges.length > 0 ? (
                  <WorkflowBanner
                    tone="info"
                    message={`${pendingChanges.length} attendance change${pendingChanges.length === 1 ? "" : "s"} are ready to save.`}
                  />
                ) : null}

                <div style={workflowStyles.twoColumn}>
                  <WebSectionCard
                    title="Present students"
                    description={detailOverview.presentSectionSubtitle}
                  >
                    <div style={workflowStyles.grid}>
                      <div style={{ color: "#64748b" }}>{rosterModel.presentSummary}</div>
                      {rosterModel.presentRows.length === 0 ? (
                        <WorkflowStateCard message="No students are currently in the present list." />
                      ) : (
                        rosterModel.presentRows.map((row) => (
                          <div key={row.attendanceRecordId} style={workflowStyles.rowCard}>
                            <strong>{row.studentDisplayName}</strong>
                            <div style={{ color: "#64748b", marginTop: 6 }}>
                              {row.identityLabel}
                            </div>
                            <div style={{ color: "#475569", marginTop: 6 }}>
                              Last marked:{" "}
                              {row.markedAt ? formatPortalDateTime(row.markedAt) : "Not marked yet"}
                            </div>
                            {row.pendingChangeLabel ? (
                              <div style={{ color: "#1d4ed8", marginTop: 8 }}>
                                {row.pendingChangeLabel}
                              </div>
                            ) : null}
                            {row.actionTargetStatus ? (
                              <button
                                type="button"
                                disabled={!detail.editability.isEditable}
                                onClick={() =>
                                  setDraft((current) => ({
                                    ...current,
                                    [row.attendanceRecordId]:
                                      row.actionTargetStatus ?? row.effectiveStatus,
                                  }))
                                }
                                style={{
                                  ...workflowStyles.secondaryButton,
                                  marginTop: 12,
                                  ...(detail.editability.isEditable
                                    ? {}
                                    : { cursor: "not-allowed", opacity: 0.6 }),
                                }}
                              >
                                {row.actionLabel}
                              </button>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </WebSectionCard>

                  <WebSectionCard
                    title="Absent students"
                    description={detailOverview.absentSectionSubtitle}
                  >
                    <div style={workflowStyles.grid}>
                      <div style={{ color: "#64748b" }}>{rosterModel.absentSummary}</div>
                      {rosterModel.absentRows.length === 0 ? (
                        <WorkflowStateCard message="No students are currently in the absent list." />
                      ) : (
                        rosterModel.absentRows.map((row) => (
                          <div key={row.attendanceRecordId} style={workflowStyles.rowCard}>
                            <strong>{row.studentDisplayName}</strong>
                            <div style={{ color: "#64748b", marginTop: 6 }}>
                              {row.identityLabel}
                            </div>
                            <div style={{ color: "#475569", marginTop: 6 }}>
                              Last marked:{" "}
                              {row.markedAt ? formatPortalDateTime(row.markedAt) : "Not marked yet"}
                            </div>
                            {row.pendingChangeLabel ? (
                              <div style={{ color: "#1d4ed8", marginTop: 8 }}>
                                {row.pendingChangeLabel}
                              </div>
                            ) : null}
                            {row.actionTargetStatus ? (
                              <button
                                type="button"
                                disabled={!detail.editability.isEditable}
                                onClick={() =>
                                  setDraft((current) => ({
                                    ...current,
                                    [row.attendanceRecordId]:
                                      row.actionTargetStatus ?? row.effectiveStatus,
                                  }))
                                }
                                style={{
                                  ...workflowStyles.primaryButton,
                                  marginTop: 12,
                                  ...(detail.editability.isEditable
                                    ? {}
                                    : { cursor: "not-allowed", opacity: 0.6 }),
                                }}
                              >
                                {row.actionLabel}
                              </button>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </WebSectionCard>
                </div>
              </div>
            ) : null}
          </WebSectionCard>
        </div>
      )}

      {statusMessage ? <WorkflowBanner tone="info" message={statusMessage} /> : null}
    </div>
  )
}
