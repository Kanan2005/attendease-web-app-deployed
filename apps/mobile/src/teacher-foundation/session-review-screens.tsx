import { createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"
import type {
  AttendanceSessionDetail,
  AttendanceSessionStudentSummary,
  ClassroomDetail,
  ClassroomRosterListQuery,
  ClassroomRosterMemberSummary,
  ExportJobType,
  LectureSummary,
  TeacherReportFilters,
} from "@attendease/contracts"
import {
  buildAttendanceCorrectionSaveMessage,
  buildAttendanceEditChanges,
  createAttendanceEditDraft,
  getAttendanceCorrectionReviewPollInterval,
  updateAttendanceEditDraft,
} from "@attendease/domain"
import { mobileTheme } from "@attendease/ui-mobile"
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import { buildTeacherSchedulingPreview } from "../academic-management"
import {
  getMobileAttendanceListPollInterval,
  getMobileAttendanceSessionPollInterval,
} from "../attendance-live"
import {
  useTeacherBluetoothAdvertiser,
  useTeacherBluetoothRuntime,
  useTeacherBluetoothSessionCreateMutation,
  useTeacherBluetoothSessionQuery,
} from "../bluetooth-attendance"
import { buildTeacherRosterImportPreview } from "../classroom-communications"
import { mobileEntryRoutes } from "../mobile-entry-models"
import {
  buildTeacherClassroomCreateRequest,
  buildTeacherClassroomScopeOptions,
  buildTeacherClassroomScopeSummary,
  buildTeacherClassroomSupportingText,
  buildTeacherClassroomUpdateRequest,
  createTeacherClassroomCreateDraft,
  createTeacherClassroomEditDraft,
  hasTeacherClassroomEditChanges,
} from "../teacher-classroom-management"
import {
  type TeacherCardTone,
  type TeacherDashboardActionModel,
  buildTeacherDashboardModel,
  buildTeacherRecentSessionTimeline,
  buildTeacherSessionHistoryPreview,
  mapTeacherApiErrorToMessage,
} from "../teacher-models"
import {
  type TeacherSessionRosterRowModel,
  buildTeacherBluetoothActiveStatusModel,
  buildTeacherBluetoothCandidates,
  buildTeacherBluetoothControlModel,
  buildTeacherBluetoothEndSessionModel,
  buildTeacherBluetoothRecoveryModel,
  buildTeacherBluetoothSessionShellSnapshot,
  buildTeacherBluetoothSetupStatusModel,
  buildTeacherExportAvailabilityModel,
  buildTeacherExportRequestModel,
  buildTeacherJoinCodeActionModel,
  buildTeacherReportFilterOptions,
  buildTeacherReportOverviewModel,
  buildTeacherRosterImportDraftModel,
  buildTeacherSessionDetailOverviewModel,
  buildTeacherSessionDetailStatusModel,
  buildTeacherSessionRosterModel,
} from "../teacher-operational"
import {
  buildTeacherInvalidationKeys,
  invalidateTeacherExperienceQueries,
  teacherQueryKeys,
} from "../teacher-query"
import {
  type TeacherRosterStatusFilter,
  buildTeacherRosterAddRequest,
  buildTeacherRosterFilters,
  buildTeacherRosterMemberActions,
  buildTeacherRosterMemberIdentityText,
  buildTeacherRosterResultSummary,
  teacherRosterStatusFilters,
} from "../teacher-roster-management"
import { teacherRoutes } from "../teacher-routes"
import {
  type TeacherScheduleDraft,
  addTeacherScheduleExceptionDraft,
  addTeacherWeeklySlotDraft,
  buildTeacherScheduleSaveRequest,
  createTeacherScheduleDraft,
  removeTeacherWeeklySlotDraft,
  updateTeacherScheduleExceptionDraft,
  updateTeacherWeeklySlotDraft,
} from "../teacher-schedule-draft"
import {
  buildTeacherLoginRequest,
  getTeacherAccessToken,
  useTeacherSession,
} from "../teacher-session"
import {
  buildTeacherClassroomsStatus,
  buildTeacherDashboardStatus,
  buildTeacherReportsStatus,
  buildTeacherRosterStatus,
  buildTeacherSessionHistoryStatus,
} from "../teacher-view-state"

import {
  useTeacherAddRosterMemberMutation,
  useTeacherApplyRosterImportMutation,
  useTeacherArchiveClassroomMutation,
  useTeacherAssignmentsQuery,
  useTeacherAttendanceSessionDetailQuery,
  useTeacherAttendanceSessionStudentsQuery,
  useTeacherAttendanceSessionsQuery,
  useTeacherBluetoothCandidates,
  useTeacherClassroomDetailData,
  useTeacherClassroomsQuery,
  useTeacherCreateAnnouncementMutation,
  useTeacherCreateClassroomMutation,
  useTeacherCreateExportJobMutation,
  useTeacherCreateLectureMutation,
  useTeacherCreateRosterImportMutation,
  useTeacherDashboardData,
  useTeacherExportAvailability,
  useTeacherExportJobsQuery,
  useTeacherFilteredReportsData,
  useTeacherResetJoinCodeMutation,
  useTeacherSaveScheduleMutation,
  useTeacherUpdateAttendanceSessionMutation,
  useTeacherUpdateClassroomMutation,
  useTeacherUpdateRosterMemberMutation,
} from "./queries"
import {
  TeacherCard,
  TeacherEmptyCard,
  TeacherErrorCard,
  TeacherLoadingCard,
  TeacherNavAction,
  TeacherScreen,
  TeacherSessionSetupCard,
  TeacherStatusBanner,
  clampInteger,
  formatDateTime,
  formatEnum,
  formatMinutes,
  formatWeekday,
  resolveTeacherDashboardActionHref,
  statusCardToneStyle,
  styles,
  toneColorStyle,
} from "./shared-ui"

export function TeacherSessionHistoryScreen() {
  const { session } = useTeacherSession()
  const historyQuery = useTeacherAttendanceSessionsQuery()
  const liveSessions = (historyQuery.data ?? []).filter(
    (sessionItem) => sessionItem.status === "ACTIVE",
  )
  const pastSessions = (historyQuery.data ?? []).filter(
    (sessionItem) => sessionItem.status !== "ACTIVE",
  )
  const correctionOpenCount = pastSessions.filter(
    (sessionItem) => sessionItem.editability.isEditable,
  ).length
  const historyStatus = buildTeacherSessionHistoryStatus({
    hasSession: Boolean(session),
    isLoading: historyQuery.isLoading,
    errorMessage: historyQuery.error ? mapTeacherApiErrorToMessage(historyQuery.error) : null,
    totalCount: historyQuery.data?.length ?? 0,
    liveCount: liveSessions.length,
    correctionOpenCount,
  })

  return (
    <TeacherScreen
      title="Session History"
      subtitle="Open live attendance quickly, review saved results, and jump into corrections without leaving teacher mobile."
    >
      {!session ? (
        <TeacherSessionSetupCard />
      ) : historyQuery.isLoading ? (
        <TeacherLoadingCard label="Loading attendance session history" />
      ) : historyQuery.error ? (
        <TeacherErrorCard label={mapTeacherApiErrorToMessage(historyQuery.error)} />
      ) : historyQuery.data?.length ? (
        <>
          <TeacherStatusBanner status={historyStatus} />

          <TeacherCard
            title="At A Glance"
            subtitle="Live sessions, correction windows, and saved totals stay visible before you drill into one class."
          >
            <View style={styles.cardGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Live</Text>
                <Text style={[styles.metricValue, styles.successTone]}>{liveSessions.length}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Corrections Open</Text>
                <Text style={[styles.metricValue, styles.warningTone]}>{correctionOpenCount}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Saved Sessions</Text>
                <Text style={[styles.metricValue, styles.primaryTone]}>{pastSessions.length}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Students Marked</Text>
                <Text style={[styles.metricValue, styles.primaryTone]}>
                  {(historyQuery.data ?? []).reduce(
                    (sum, sessionItem) => sum + sessionItem.presentCount,
                    0,
                  )}
                </Text>
              </View>
            </View>
            <Text style={styles.listMeta}>
              {correctionOpenCount > 0
                ? `${correctionOpenCount} saved session${correctionOpenCount === 1 ? "" : "s"} can still be corrected from this phone.`
                : "Saved sessions are ready to review whenever you need attendance proof or a quick check."}
            </Text>
          </TeacherCard>

          {liveSessions.length ? (
            <TeacherCard
              title="Live Now"
              subtitle="Use live rows to see who is already marked before you end Bluetooth attendance."
            >
              {liveSessions.map((sessionItem) => (
                <View key={sessionItem.id} style={styles.highlightCard}>
                  <Text style={styles.listTitle}>{sessionItem.classroomDisplayTitle}</Text>
                  <Text style={styles.listMeta}>
                    {sessionItem.lectureTitle ?? "Attendance session"} ·{" "}
                    {formatEnum(sessionItem.mode)}
                  </Text>
                  <Text style={styles.listMeta}>
                    {sessionItem.presentCount} present · {sessionItem.absentCount} absent
                  </Text>
                  <Text style={styles.listMeta}>
                    Started{" "}
                    {formatDateTime(
                      sessionItem.startedAt ??
                        sessionItem.lectureDate ??
                        sessionItem.scheduledEndAt ??
                        new Date().toISOString(),
                    )}
                  </Text>
                  <Text style={styles.listMeta}>
                    Bluetooth attendance is still live. End the session before making corrections.
                  </Text>
                  <View style={styles.actionGrid}>
                    <TeacherNavAction
                      href={teacherRoutes.sessionDetail(sessionItem.id)}
                      label="Open Live Session"
                      variant="primary"
                    />
                  </View>
                </View>
              ))}
            </TeacherCard>
          ) : null}

          {pastSessions.length ? (
            <TeacherCard
              title="Recently Saved"
              subtitle="Review final present or absent lists, then correct a saved session only while the edit window is still open."
            >
              {pastSessions.map((sessionItem) => (
                <View key={sessionItem.id} style={styles.highlightCard}>
                  <Text style={styles.listTitle}>{sessionItem.classroomDisplayTitle}</Text>
                  <Text style={styles.listMeta}>
                    {sessionItem.lectureTitle ?? "Attendance session"} ·{" "}
                    {formatEnum(sessionItem.mode)}
                  </Text>
                  <Text style={styles.listMeta}>
                    {sessionItem.presentCount} present · {sessionItem.absentCount} absent
                  </Text>
                  <Text style={styles.listMeta}>
                    Ended{" "}
                    {formatDateTime(
                      sessionItem.endedAt ??
                        sessionItem.startedAt ??
                        sessionItem.lectureDate ??
                        new Date().toISOString(),
                    )}
                  </Text>
                  <Text
                    style={[
                      styles.listMeta,
                      sessionItem.editability.isEditable ? styles.warningTone : styles.primaryTone,
                    ]}
                  >
                    {sessionItem.editability.isEditable
                      ? `Corrections open until ${sessionItem.editableUntil ? formatDateTime(sessionItem.editableUntil) : "the window closes"}.`
                      : "Read-only final result."}
                  </Text>
                  <View style={styles.actionGrid}>
                    <TeacherNavAction
                      href={teacherRoutes.sessionDetail(sessionItem.id)}
                      label={
                        sessionItem.editability.isEditable
                          ? "Review And Correct"
                          : "Review Final Result"
                      }
                    />
                  </View>
                </View>
              ))}
            </TeacherCard>
          ) : null}

          <TeacherCard
            title="Next Step"
            subtitle="Return home or jump back into classrooms when you are ready for the next session."
          >
            <View style={styles.actionGrid}>
              <TeacherNavAction href={teacherRoutes.home} label="Home" />
              <TeacherNavAction href={teacherRoutes.classrooms} label="Classrooms" />
              <TeacherNavAction href={teacherRoutes.reports} label="Reports" />
            </View>
          </TeacherCard>
        </>
      ) : (
        <>
          <TeacherStatusBanner status={historyStatus} />
          <TeacherEmptyCard label="No attendance sessions are available for this teacher scope yet." />
        </>
      )}
    </TeacherScreen>
  )
}

export function TeacherSessionDetailScreen(props: { sessionId: string }) {
  const { session } = useTeacherSession()
  const queryClient = useQueryClient()
  const detailQuery = useTeacherAttendanceSessionDetailQuery(props.sessionId, {
    refetchInterval: (query) => getAttendanceCorrectionReviewPollInterval(query.state.data ?? null),
  })
  const studentsQuery = useTeacherAttendanceSessionStudentsQuery(props.sessionId, {
    refetchInterval: getAttendanceCorrectionReviewPollInterval(detailQuery.data ?? null),
  })
  const updateAttendanceMutation = useTeacherUpdateAttendanceSessionMutation(props.sessionId)
  const [draft, setDraft] = useState<Record<string, "PRESENT" | "ABSENT">>({})
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const students = studentsQuery.data ?? []
  const pendingChanges = buildAttendanceEditChanges(students, draft)
  const detailStatus = buildTeacherSessionDetailStatusModel({
    sessionStatus: detailQuery.data?.status ?? null,
    editability: detailQuery.data?.editability ?? null,
    pendingChangeCount: pendingChanges.length,
  })
  const rosterModel = buildTeacherSessionRosterModel({
    students,
    draft,
    isEditable: detailQuery.data?.editability.isEditable ?? false,
  })
  const detailOverview = buildTeacherSessionDetailOverviewModel({
    session: detailQuery.data ?? null,
    pendingChangeCount: pendingChanges.length,
  })

  useEffect(() => {
    if (!studentsQuery.data) {
      return
    }

    setDraft(createAttendanceEditDraft(studentsQuery.data))
  }, [studentsQuery.data])

  return (
    <TeacherScreen
      title="Session Detail"
      subtitle="Review final attendance quickly, then correct present or absent counts from one clean session screen."
    >
      {!session ? (
        <TeacherSessionSetupCard />
      ) : detailQuery.isLoading || studentsQuery.isLoading ? (
        <TeacherLoadingCard label="Loading session detail" />
      ) : detailQuery.error || studentsQuery.error ? (
        <TeacherErrorCard
          label={mapTeacherApiErrorToMessage(detailQuery.error ?? studentsQuery.error)}
        />
      ) : detailQuery.data ? (
        <>
          <TeacherStatusBanner
            status={{
              tone: detailStatus.stateTone,
              title: detailStatus.title,
              message: detailStatus.message,
            }}
          />

          <TeacherCard
            title={detailQuery.data.classroomDisplayTitle}
            subtitle={`${formatEnum(detailQuery.data.mode)} · ${formatEnum(detailQuery.data.status)}`}
          >
            <Text style={styles.listMeta}>
              {detailQuery.data.lectureTitle?.length
                ? detailQuery.data.lectureTitle
                : "Attendance session"}
            </Text>
            <View style={styles.cardGrid}>
              {detailOverview.summaryCards.map((card) => (
                <View key={card.label} style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{card.label}</Text>
                  <Text style={[styles.metricValue, toneColorStyle(card.tone)]}>{card.value}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.bodyText}>{detailOverview.rosterSummary}</Text>
            <Text style={styles.listMeta}>
              Teacher: {detailQuery.data.teacherDisplayName} · {detailQuery.data.subjectCode}
            </Text>
            <Text style={styles.listMeta}>{detailOverview.timingSummary}</Text>
            <Text style={styles.listMeta}>
              Risk signals stay informational only: {detailQuery.data.suspiciousAttemptCount}
            </Text>
          </TeacherCard>

          <TeacherCard title="Present Students" subtitle={detailOverview.presentSectionSubtitle}>
            <Text style={styles.listMeta}>{rosterModel.presentSummary}</Text>
            <TeacherSessionStudentSection
              title="Present"
              subtitle={detailOverview.presentSectionSubtitle}
              rows={rosterModel.presentRows}
              emptyLabel="No students are currently marked present."
              isEditable={detailQuery.data.editability.isEditable}
              onToggleStatus={(row) => {
                if (row.actionTargetStatus !== "PRESENT" && row.actionTargetStatus !== "ABSENT") {
                  return
                }

                const nextStatus = row.actionTargetStatus

                setDraft((current) =>
                  updateAttendanceEditDraft(current, row.attendanceRecordId, nextStatus),
                )
              }}
            />
          </TeacherCard>

          <TeacherCard title="Absent Students" subtitle={detailOverview.absentSectionSubtitle}>
            <Text style={styles.listMeta}>{rosterModel.absentSummary}</Text>
            <TeacherSessionStudentSection
              title="Absent"
              subtitle={detailOverview.absentSectionSubtitle}
              rows={rosterModel.absentRows}
              emptyLabel="No students are currently marked absent."
              isEditable={detailQuery.data.editability.isEditable}
              onToggleStatus={(row) => {
                if (row.actionTargetStatus !== "PRESENT" && row.actionTargetStatus !== "ABSENT") {
                  return
                }

                const nextStatus = row.actionTargetStatus

                setDraft((current) =>
                  updateAttendanceEditDraft(current, row.attendanceRecordId, nextStatus),
                )
              }}
            />
          </TeacherCard>

          <TeacherCard
            title="Corrections"
            subtitle={
              detailQuery.data.editability.isEditable
                ? "Review the grouped present and absent lists, then save once when the result is right."
                : detailQuery.data.status === "ACTIVE"
                  ? "Bluetooth attendance is still live. End the session before manual corrections."
                  : "This attendance session is now read-only."
            }
          >
            <Text style={styles.listMeta}>{detailOverview.correctionSummary}</Text>
            {statusMessage ? <Text style={styles.bodyText}>{statusMessage}</Text> : null}
            {updateAttendanceMutation.error ? (
              <Text style={styles.errorText}>
                {mapTeacherApiErrorToMessage(updateAttendanceMutation.error)}
              </Text>
            ) : null}
            <View style={styles.actionGrid}>
              <Pressable
                style={[
                  styles.primaryButton,
                  !detailQuery.data.editability.isEditable ||
                  updateAttendanceMutation.isPending ||
                  pendingChanges.length === 0
                    ? styles.disabledButton
                    : null,
                ]}
                disabled={
                  !detailQuery.data.editability.isEditable ||
                  updateAttendanceMutation.isPending ||
                  pendingChanges.length === 0
                }
                onPress={() => {
                  void updateAttendanceMutation
                    .mutateAsync({
                      changes: pendingChanges,
                    })
                    .then(async (result) => {
                      setStatusMessage(
                        buildAttendanceCorrectionSaveMessage(result.appliedChangeCount),
                      )
                      setDraft(createAttendanceEditDraft(result.students))
                      queryClient.setQueryData(
                        teacherQueryKeys.sessionDetail(props.sessionId),
                        result.session,
                      )
                      queryClient.setQueryData(
                        teacherQueryKeys.sessionStudents(props.sessionId),
                        result.students,
                      )
                    })
                }}
              >
                <Text style={styles.primaryButtonLabel}>
                  {updateAttendanceMutation.isPending ? "Saving..." : "Save Attendance Changes"}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.secondaryButton,
                  pendingChanges.length === 0 ? styles.disabledSecondaryButton : null,
                ]}
                disabled={pendingChanges.length === 0}
                onPress={() => {
                  setDraft(createAttendanceEditDraft(students))
                  setStatusMessage("Reset the local edit draft back to the saved session state.")
                }}
              >
                <Text style={styles.secondaryButtonLabel}>Reset Draft</Text>
              </Pressable>
            </View>
          </TeacherCard>

          <TeacherCard
            title="Navigation"
            subtitle="Keep session history, reports, and teacher home close while you review final attendance."
          >
            <View style={styles.actionGrid}>
              <TeacherNavAction href={teacherRoutes.sessionHistory} label="Session History" />
              <TeacherNavAction href={teacherRoutes.reports} label="Reports" />
              <TeacherNavAction href={teacherRoutes.home} label="Home" />
            </View>
          </TeacherCard>
        </>
      ) : (
        <TeacherEmptyCard label="Session detail is unavailable for this attendance session." />
      )}
    </TeacherScreen>
  )
}

export function TeacherSessionStudentSection(props: {
  title: string
  subtitle: string
  rows: TeacherSessionRosterRowModel[]
  emptyLabel: string
  isEditable?: boolean
  onToggleStatus?: (row: TeacherSessionRosterRowModel) => void
}) {
  return (
    <View style={styles.sessionSection}>
      <Text style={styles.sectionTitle}>{props.title}</Text>
      <Text style={styles.listMeta}>{props.subtitle}</Text>
      {props.rows.length ? (
        props.rows.map((row) => (
          <View key={row.attendanceRecordId} style={styles.sessionStudentCard}>
            <View style={styles.sessionStudentHeader}>
              <Text style={styles.listTitle}>{row.studentDisplayName}</Text>
              <View
                style={[
                  styles.statusChip,
                  row.statusTone === "success"
                    ? styles.successChip
                    : row.statusTone === "warning"
                      ? styles.warningChip
                      : row.statusTone === "danger"
                        ? styles.dangerChip
                        : styles.primaryChip,
                ]}
              >
                <Text style={styles.statusChipText}>
                  {row.effectiveStatus === "PRESENT" ? "Present" : "Absent"}
                </Text>
              </View>
            </View>
            <Text style={styles.listMeta}>{row.identityLabel}</Text>
            <Text style={styles.listMeta}>
              {row.markedAt
                ? `Last marked ${formatDateTime(row.markedAt)}`
                : row.effectiveStatus === "PRESENT"
                  ? "Ready to count as present once you save."
                  : "No attendance mark recorded yet."}
            </Text>
            {row.pendingChangeLabel ? (
              <Text style={styles.pendingText}>{row.pendingChangeLabel}</Text>
            ) : null}
            {props.isEditable && row.actionLabel && props.onToggleStatus ? (
              <View style={styles.actionGrid}>
                <Pressable
                  style={[
                    row.actionTargetStatus === "ABSENT"
                      ? styles.dangerButton
                      : styles.secondaryButton,
                    row.pendingChangeLabel ? styles.selectedActionButton : null,
                  ]}
                  onPress={() => props.onToggleStatus?.(row)}
                >
                  <Text
                    style={
                      row.actionTargetStatus === "ABSENT"
                        ? styles.primaryButtonLabel
                        : styles.secondaryButtonLabel
                    }
                  >
                    {row.actionLabel}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))
      ) : (
        <Text style={styles.listMeta}>{props.emptyLabel}</Text>
      )}
    </View>
  )
}
