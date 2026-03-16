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
import { TeacherSessionStudentSection } from "./session-review-screens"
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

const env = loadMobileEnv(process.env as Record<string, string | undefined>)
const authClient = createAuthApiClient({
  baseUrl: env.EXPO_PUBLIC_API_URL,
})

export function TeacherBluetoothActiveSessionScreen(props: {
  sessionId: string
  classroomId: string
  classroomTitle: string
  lectureTitle?: string
  durationMinutes: string
  rotationWindowSeconds: string
}) {
  const { session } = useTeacherSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const classroomContext = teacherRoutes.classroomContext(props.classroomId)
  const runtime = useTeacherBluetoothRuntime(props.sessionId)
  const sessionQuery = useTeacherBluetoothSessionQuery(props.sessionId)
  const studentsQuery = useTeacherAttendanceSessionStudentsQuery(props.sessionId, {
    refetchInterval: getMobileAttendanceSessionPollInterval(sessionQuery.data ?? null),
  })
  const advertiser = useTeacherBluetoothAdvertiser(runtime ?? null)
  const endSessionMutation = useMutation({
    mutationFn: async () =>
      authClient.endAttendanceSession(getTeacherAccessToken(session), props.sessionId),
    onSuccess: async () => {
      await advertiser.stop()
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId: props.classroomId,
        sessionId: props.sessionId,
      })
      router.replace(teacherRoutes.sessionDetail(props.sessionId))
    },
  })
  const effectiveAdvertiserState = runtime
    ? advertiser.state === "IDLE"
      ? "READY"
      : advertiser.state
    : "FAILED"
  const recoveryModel = buildTeacherBluetoothRecoveryModel({
    advertiserState: effectiveAdvertiserState,
    errorMessage: advertiser.errorMessage,
    availability: advertiser.availability,
  })
  const endSessionModel = buildTeacherBluetoothEndSessionModel({
    requestState:
      sessionQuery.data?.status !== "ACTIVE"
        ? "ENDED"
        : endSessionMutation.isPending
          ? "ENDING"
          : endSessionMutation.error
            ? "FAILED"
            : "IDLE",
  })
  const displayDurationMinutes =
    sessionQuery.data?.durationSeconds && sessionQuery.data.durationSeconds > 0
      ? Math.round(sessionQuery.data.durationSeconds / 60)
      : clampInteger(props.durationMinutes, 50, 1, 480)
  const displayRotationWindowSeconds =
    sessionQuery.data?.bluetoothRotationWindowSeconds ??
    clampInteger(props.rotationWindowSeconds, 10, 5, 180)
  const snapshot = buildTeacherBluetoothSessionShellSnapshot({
    candidate: {
      sessionId: props.sessionId,
      classroomId: props.classroomId,
      classroomTitle: props.classroomTitle,
      lectureId: null,
      lectureTitle: props.lectureTitle ?? "Lecture details",
      durationMinutes: displayDurationMinutes,
      bluetoothRotationWindowSeconds: displayRotationWindowSeconds,
      status: sessionQuery.data?.status === "ACTIVE" ? "OPEN_FOR_ATTENDANCE" : "SHELL_ONLY",
    },
    advertiserState: effectiveAdvertiserState,
  })
  const controlModel = buildTeacherBluetoothControlModel(effectiveAdvertiserState)
  const activeStatus = buildTeacherBluetoothActiveStatusModel({
    advertiserState: effectiveAdvertiserState,
    sessionStatus: sessionQuery.data?.status ?? null,
    presentCount: sessionQuery.data?.presentCount ?? 0,
  })
  const liveRosterModel = buildTeacherSessionRosterModel({
    students: studentsQuery.data ?? [],
    isEditable: false,
  })

  return (
    <TeacherScreen
      title="Active Bluetooth Session"
      subtitle="Keep Bluetooth attendance live, review the phone broadcast state, and close the session cleanly from one place."
    >
      {!session ? (
        <TeacherSessionSetupCard />
      ) : sessionQuery.isLoading ? (
        <TeacherLoadingCard label="Loading Bluetooth session state" />
      ) : sessionQuery.error ? (
        <TeacherErrorCard label={mapTeacherApiErrorToMessage(sessionQuery.error)} />
      ) : (
        <>
          <TeacherStatusBanner
            status={{
              tone: activeStatus.stateTone,
              title: activeStatus.title,
              message: activeStatus.message,
            }}
          />

          <TeacherCard
            title="Live Session"
            subtitle={
              props.lectureTitle?.length ? props.lectureTitle : "Classroom attendance session"
            }
          >
            <Text style={styles.listMeta}>{props.classroomTitle}</Text>
            <View style={styles.cardGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Present</Text>
                <Text style={[styles.metricValue, styles.successTone]}>
                  {sessionQuery.data?.presentCount ?? 0}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Session Status</Text>
                <Text style={[styles.metricValue, toneColorStyle(activeStatus.stateTone)]}>
                  {formatEnum(sessionQuery.data?.status ?? "UNKNOWN")}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Duration</Text>
                <Text style={[styles.metricValue, styles.warningTone]}>
                  {displayDurationMinutes}m
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Rotation</Text>
                <Text style={[styles.metricValue, styles.primaryTone]}>
                  {displayRotationWindowSeconds}s
                </Text>
              </View>
            </View>
            <Text style={[styles.bodyText, toneColorStyle(snapshot.stateTone)]}>
              {snapshot.title}
            </Text>
            <Text style={styles.bodyText}>{snapshot.message}</Text>
            {advertiser.errorMessage ? (
              <Text style={styles.errorText}>{advertiser.errorMessage}</Text>
            ) : null}
            {!runtime ? (
              <Text style={styles.errorText}>
                Bluetooth advertiser config is missing from local runtime cache. Recreate the
                session from the teacher Bluetooth create route.
              </Text>
            ) : null}
            {advertiser.lastPayload ? (
              <Text style={styles.listMeta}>Current BLE payload: {advertiser.lastPayload}</Text>
            ) : null}
          </TeacherCard>

          <TeacherCard
            title="Live Student List"
            subtitle="Present students update here while Bluetooth attendance stays open. Corrections unlock after the session ends."
          >
            {studentsQuery.isLoading ? (
              <TeacherLoadingCard label="Loading live student list" />
            ) : studentsQuery.error ? (
              <TeacherErrorCard label={mapTeacherApiErrorToMessage(studentsQuery.error)} />
            ) : (
              <>
                <Text style={styles.listMeta}>{liveRosterModel.presentSummary}</Text>
                <TeacherSessionStudentSection
                  title="Marked Present"
                  subtitle="Students who have already checked in nearby."
                  rows={liveRosterModel.presentRows}
                  emptyLabel="No students are marked present yet."
                />
                <TeacherSessionStudentSection
                  title="Still Absent"
                  subtitle="Students who have not marked attendance yet."
                  rows={liveRosterModel.absentRows}
                  emptyLabel="No absent students are left in this session."
                />
                <View style={styles.actionGrid}>
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => void studentsQuery.refetch()}
                  >
                    <Text style={styles.secondaryButtonLabel}>Refresh Student List</Text>
                  </Pressable>
                </View>
              </>
            )}
          </TeacherCard>

          <TeacherCard
            title="Broadcast Controls"
            subtitle="Nearby students can only detect this attendance session while the teacher-phone broadcast stays live."
          >
            <Text style={styles.listMeta}>{controlModel.helperMessage}</Text>
            <View style={styles.actionGrid}>
              <Pressable
                style={[
                  styles.primaryButton,
                  !controlModel.canStart ? styles.disabledButton : null,
                ]}
                disabled={!controlModel.canStart}
                onPress={() => {
                  void advertiser.start()
                }}
              >
                <Text style={styles.primaryButtonLabel}>{controlModel.startLabel}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.secondaryButton,
                  !controlModel.canStop ? styles.disabledSecondaryButton : null,
                ]}
                disabled={!controlModel.canStop}
                onPress={() => {
                  void advertiser.stop()
                }}
              >
                <Text style={styles.secondaryButtonLabel}>{controlModel.stopLabel}</Text>
              </Pressable>
              {recoveryModel.shouldRefreshBluetooth ? (
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    void advertiser.refreshAvailability()
                  }}
                >
                  <Text style={styles.secondaryButtonLabel}>Refresh Bluetooth</Text>
                </Pressable>
              ) : null}
            </View>
          </TeacherCard>

          <TeacherCard
            title="End Session"
            subtitle="Close Bluetooth attendance when everyone nearby has finished checking in."
          >
            <Text style={styles.listMeta}>{endSessionModel.helperMessage}</Text>
            <View style={styles.actionGrid}>
              <Pressable
                style={[
                  styles.dangerButton,
                  endSessionModel.buttonDisabled ? styles.disabledButton : null,
                ]}
                disabled={endSessionModel.buttonDisabled}
                onPress={() => {
                  void endSessionMutation.mutateAsync()
                }}
              >
                <Text style={styles.primaryButtonLabel}>{endSessionModel.buttonLabel}</Text>
              </Pressable>
            </View>
            {endSessionMutation.error ? (
              <Text style={styles.errorText}>
                {mapTeacherApiErrorToMessage(endSessionMutation.error)}
              </Text>
            ) : null}
          </TeacherCard>

          {recoveryModel.shouldShow ? (
            <TeacherCard title={recoveryModel.title} subtitle={recoveryModel.message}>
              <Text style={[styles.bodyText, toneColorStyle(recoveryModel.stateTone)]}>
                {recoveryModel.message}
              </Text>
              <View style={styles.actionGrid}>
                {recoveryModel.shouldRetryBroadcast ? (
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => {
                      void advertiser.start()
                    }}
                  >
                    <Text style={styles.primaryButtonLabel}>Retry Broadcast</Text>
                  </Pressable>
                ) : null}
                {recoveryModel.shouldOfferEndSession ? (
                  <Pressable
                    style={[
                      styles.dangerButton,
                      endSessionModel.buttonDisabled ? styles.disabledButton : null,
                    ]}
                    disabled={endSessionModel.buttonDisabled}
                    onPress={() => {
                      void endSessionMutation.mutateAsync()
                    }}
                  >
                    <Text style={styles.primaryButtonLabel}>{endSessionModel.buttonLabel}</Text>
                  </Pressable>
                ) : null}
              </View>
            </TeacherCard>
          ) : null}

          <TeacherCard
            title="After This Session"
            subtitle="Teacher mobile keeps setup, live control, and session history connected without leaving Bluetooth ownership unclear."
          >
            <Text style={styles.bodyText}>
              This route owns advertiser health, live session polling, and clean teardown. When you
              end the session successfully, AttendEase opens the saved session detail automatically.
            </Text>
            <View style={styles.actionGrid}>
              <TeacherNavAction href={classroomContext.bluetoothCreate} label="Back To Setup" />
              <TeacherNavAction href={teacherRoutes.sessionHistory} label="Session History" />
              <TeacherNavAction href={classroomContext.detail} label="Classroom Detail" />
            </View>
          </TeacherCard>
        </>
      )}
    </TeacherScreen>
  )
}
