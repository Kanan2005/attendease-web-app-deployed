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

export function TeacherExportsScreen() {
  const { session } = useTeacherSession()
  const classroomsQuery = useTeacherClassroomsQuery()
  const sessionsQuery = useTeacherAttendanceSessionsQuery()
  const exportJobsQuery = useTeacherExportJobsQuery()
  const createExportJobMutation = useTeacherCreateExportJobMutation()
  const exportAvailability = useTeacherExportAvailability()
  const [selectedFormat, setSelectedFormat] = useState<ExportJobType>(
    (exportAvailability.supportedFormats[0] as ExportJobType | undefined) ?? "SESSION_PDF",
  )
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [selectedClassroomId, setSelectedClassroomId] = useState("")
  const exportRequest = buildTeacherExportRequestModel({
    availability: exportAvailability,
    selectedFormat,
    requestState: createExportJobMutation.isPending ? "SUBMITTING" : "IDLE",
  })
  const sessionExports = selectedFormat === "SESSION_PDF" || selectedFormat === "SESSION_CSV"
  const recentSessions =
    sessionsQuery.data?.filter((sessionItem) => sessionItem.status !== "ACTIVE") ?? []

  useEffect(() => {
    if (!selectedClassroomId && classroomsQuery.data?.[0]?.id) {
      setSelectedClassroomId(classroomsQuery.data[0].id)
    }
  }, [classroomsQuery.data, selectedClassroomId])

  useEffect(() => {
    if (!selectedSessionId && recentSessions[0]?.id) {
      setSelectedSessionId(recentSessions[0].id)
    }
  }, [recentSessions, selectedSessionId])

  const canSubmitExport =
    !exportRequest.buttonDisabled &&
    !createExportJobMutation.isPending &&
    (!sessionExports || Boolean(selectedSessionId))

  async function submitExportRequest() {
    if (!canSubmitExport) {
      return
    }

    await createExportJobMutation.mutateAsync(
      sessionExports
        ? {
            jobType: selectedFormat,
            sessionId: selectedSessionId,
          }
        : {
            jobType: selectedFormat,
            filters: selectedClassroomId ? { classroomId: selectedClassroomId } : {},
          },
    )
  }

  return (
    <TeacherScreen
      title="Exports"
      subtitle="Queue attendance exports and keep an eye on delivery from your phone."
    >
      {!session ? (
        <TeacherSessionSetupCard />
      ) : (
        <>
          <TeacherCard title="Export Requests" subtitle={exportAvailability.title}>
            <Text style={styles.bodyText}>{exportAvailability.message}</Text>
            <Text style={styles.listMeta}>{exportRequest.helperMessage}</Text>
            {createExportJobMutation.error ? (
              <TeacherErrorCard
                label={mapTeacherApiErrorToMessage(createExportJobMutation.error)}
              />
            ) : null}
            <View style={styles.actionGrid}>
              {exportAvailability.supportedFormats.map((format) => (
                <Pressable
                  key={format}
                  style={[
                    styles.secondaryButton,
                    selectedFormat === format ? styles.selectedActionButton : null,
                  ]}
                  onPress={() => setSelectedFormat(format as ExportJobType)}
                >
                  <Text style={styles.secondaryButtonLabel}>{format}</Text>
                </Pressable>
              ))}
            </View>
            {sessionExports ? (
              <View style={styles.cardGrid}>
                {sessionsQuery.isLoading ? (
                  <TeacherLoadingCard label="Loading recent sessions for export..." />
                ) : sessionsQuery.error ? (
                  <TeacherErrorCard label={mapTeacherApiErrorToMessage(sessionsQuery.error)} />
                ) : recentSessions.length ? (
                  recentSessions.slice(0, 4).map((sessionItem) => (
                    <Pressable
                      key={sessionItem.id}
                      style={[
                        styles.secondaryButton,
                        selectedSessionId === sessionItem.id ? styles.selectedActionButton : null,
                      ]}
                      onPress={() => setSelectedSessionId(sessionItem.id)}
                    >
                      <Text style={styles.secondaryButtonLabel}>
                        {sessionItem.classroomDisplayTitle}
                      </Text>
                      <Text style={styles.listMeta}>{sessionItem.status}</Text>
                    </Pressable>
                  ))
                ) : (
                  <TeacherEmptyCard label="Create or end a classroom session before requesting a session export." />
                )}
              </View>
            ) : (
              <View style={styles.cardGrid}>
                {classroomsQuery.isLoading ? (
                  <TeacherLoadingCard label="Loading classroom filters..." />
                ) : classroomsQuery.error ? (
                  <TeacherErrorCard label={mapTeacherApiErrorToMessage(classroomsQuery.error)} />
                ) : classroomsQuery.data?.length ? (
                  classroomsQuery.data.slice(0, 4).map((classroom) => (
                    <Pressable
                      key={classroom.id}
                      style={[
                        styles.secondaryButton,
                        selectedClassroomId === classroom.id ? styles.selectedActionButton : null,
                      ]}
                      onPress={() => setSelectedClassroomId(classroom.id)}
                    >
                      <Text style={styles.secondaryButtonLabel}>{classroom.displayTitle}</Text>
                      <Text style={styles.listMeta}>{classroom.code}</Text>
                    </Pressable>
                  ))
                ) : (
                  <TeacherEmptyCard label="No classrooms are available for report-based exports." />
                )}
              </View>
            )}
            <Pressable
              style={[styles.primaryButton, !canSubmitExport ? styles.disabledButton : null]}
              disabled={!canSubmitExport}
              onPress={() => {
                void submitExportRequest()
              }}
            >
              <Text style={styles.primaryButtonLabel}>{exportRequest.buttonLabel}</Text>
            </Pressable>
          </TeacherCard>

          <TeacherCard
            title="Export Jobs"
            subtitle="Completed jobs expose signed download URLs from the shared backend."
          >
            {exportJobsQuery.isLoading ? (
              <TeacherLoadingCard label="Loading export jobs..." />
            ) : exportJobsQuery.error ? (
              <TeacherErrorCard label={mapTeacherApiErrorToMessage(exportJobsQuery.error)} />
            ) : exportJobsQuery.data?.length ? (
              exportJobsQuery.data.map((job) => {
                return (
                  <View key={job.id} style={styles.listRow}>
                    <Text style={styles.listTitle}>{job.jobType}</Text>
                    <Text style={styles.listMeta}>
                      {job.status} · {job.courseOfferingDisplayTitle ?? "All classrooms"}
                    </Text>
                    {job.latestReadyDownloadUrl ? (
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() => {
                          void Linking.openURL(job.latestReadyDownloadUrl ?? "")
                        }}
                      >
                        <Text style={styles.secondaryButtonLabel}>Open Download</Text>
                      </Pressable>
                    ) : null}
                  </View>
                )
              })
            ) : (
              <TeacherEmptyCard label="No export jobs have been requested yet." />
            )}
            <View style={styles.actionGrid}>
              <TeacherNavAction href={teacherRoutes.reports} label="Back To Reports" />
              <TeacherNavAction href={teacherRoutes.home} label="Home" />
            </View>
          </TeacherCard>
        </>
      )}
    </TeacherScreen>
  )
}
