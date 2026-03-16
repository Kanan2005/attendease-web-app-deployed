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

export function TeacherBluetoothSessionCreateScreen(props: { preselectedClassroomId?: string }) {
  const { session } = useTeacherSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const bluetooth = useTeacherBluetoothCandidates()
  const createSessionMutation = useTeacherBluetoothSessionCreateMutation()
  const initialCandidateId =
    bluetooth.candidates.find((candidate) => candidate.classroomId === props.preselectedClassroomId)
      ?.sessionId ??
    bluetooth.candidates[0]?.sessionId ??
    ""
  const [selectedSessionId, setSelectedSessionId] = useState(initialCandidateId)
  const selectedCandidate =
    bluetooth.candidates.find((candidate) => candidate.sessionId === selectedSessionId) ?? null
  const selectedCandidateSessionId = selectedCandidate?.sessionId ?? ""
  const selectedCandidateDurationMinutes = selectedCandidate?.durationMinutes ?? 50
  const [durationMinutes, setDurationMinutes] = useState(
    selectedCandidate ? String(selectedCandidate.durationMinutes) : "50",
  )
  const sessionShell = buildTeacherBluetoothSessionShellSnapshot({
    candidate: selectedCandidate
      ? {
          ...selectedCandidate,
          durationMinutes: clampInteger(durationMinutes, selectedCandidate.durationMinutes, 1, 480),
        }
      : null,
    advertiserState: "READY",
  })
  const normalizedDurationMinutes = clampInteger(
    durationMinutes,
    selectedCandidateDurationMinutes,
    1,
    480,
  )
  const setupStatus = buildTeacherBluetoothSetupStatusModel({
    candidate: selectedCandidate,
    durationMinutes: normalizedDurationMinutes,
    isCreating: createSessionMutation.isPending,
    errorMessage: createSessionMutation.error
      ? mapTeacherApiErrorToMessage(createSessionMutation.error)
      : null,
  })
  const quickBackLink = selectedCandidate
    ? teacherRoutes.classroomDetail(selectedCandidate.classroomId)
    : teacherRoutes.classrooms
  const quickBackLabel = selectedCandidate ? "Back To Course" : "Classrooms"

  useEffect(() => {
    if (!selectedSessionId && initialCandidateId) {
      setSelectedSessionId(initialCandidateId)
    }
  }, [initialCandidateId, selectedSessionId])

  useEffect(() => {
    if (selectedCandidateSessionId) {
      setDurationMinutes(String(selectedCandidateDurationMinutes))
    }
  }, [selectedCandidateDurationMinutes, selectedCandidateSessionId])

  return (
    <TeacherScreen
      title="Bluetooth Session"
      subtitle="Teacher mobile creates the live Bluetooth session here, then hands off to the native advertiser controller."
    >
      {!session ? (
        <TeacherSessionSetupCard />
      ) : bluetooth.classroomsQuery.isLoading || bluetooth.lectureSets.isLoading ? (
        <TeacherLoadingCard label="Loading Bluetooth classroom context" />
      ) : bluetooth.classroomsQuery.error || bluetooth.lectureSets.error ? (
        <TeacherErrorCard
          label={mapTeacherApiErrorToMessage(
            bluetooth.classroomsQuery.error ?? bluetooth.lectureSets.error,
          )}
        />
      ) : (
        <>
          <TeacherStatusBanner
            status={{
              tone: setupStatus.stateTone,
              title: setupStatus.title,
              message: setupStatus.message,
            }}
          />

          <TeacherCard
            title="Session Setup"
            subtitle="Choose the classroom, confirm the class-session context, and start Bluetooth attendance from this phone."
          >
            <View style={styles.actionGrid}>
              <TeacherNavAction href={teacherRoutes.home} label="Teacher Home" />
              <TeacherNavAction href={quickBackLink} label={quickBackLabel} />
              <TeacherNavAction href={teacherRoutes.sessionHistory} label="Session History" />
            </View>
            <View style={styles.cardGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Classroom</Text>
                <Text style={[styles.metricValue, styles.primaryTone]}>
                  {selectedCandidate?.classroomTitle ?? "Choose one"}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Class Session</Text>
                <Text style={[styles.metricValue, styles.successTone]}>
                  {selectedCandidate?.lectureId ? "Linked" : "Classroom only"}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Duration</Text>
                <Text style={[styles.metricValue, styles.warningTone]}>
                  {selectedCandidate ? `${normalizedDurationMinutes}m` : "--"}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Rotation</Text>
                <Text style={[styles.metricValue, styles.dangerTone]}>
                  {selectedCandidate
                    ? `${selectedCandidate.bluetoothRotationWindowSeconds}s`
                    : "--"}
                </Text>
              </View>
            </View>
            <Text style={styles.fieldLabel}>Duration In Minutes</Text>
            <TextInput
              value={durationMinutes}
              autoCapitalize="none"
              keyboardType="number-pad"
              placeholder="Duration minutes"
              onChangeText={setDurationMinutes}
              style={styles.input}
            />
            <Text style={styles.listMeta}>
              {selectedCandidate?.lectureId
                ? `Class session: ${selectedCandidate.lectureTitle}`
                : "No class session is linked yet. Teacher mobile will still create a classroom attendance session."}
            </Text>
            <Text style={styles.bodyText}>
              Keep teacher mobile open in the foreground while students nearby mark Bluetooth
              attendance.
            </Text>
            {createSessionMutation.error ? (
              <Text style={styles.errorText}>
                {mapTeacherApiErrorToMessage(createSessionMutation.error)}
              </Text>
            ) : null}
          </TeacherCard>

          <TeacherCard
            title="Choose Classroom"
            subtitle="Open class sessions appear first. If no class session is linked yet, you can still start Bluetooth attendance from classroom context."
          >
            {bluetooth.candidates.length ? (
              bluetooth.candidates.map((candidate) => (
                <Pressable
                  key={candidate.sessionId}
                  style={[
                    styles.selectionCard,
                    selectedSessionId === candidate.sessionId ? styles.selectionCardActive : null,
                  ]}
                  onPress={() => setSelectedSessionId(candidate.sessionId)}
                >
                  <Text style={styles.listTitle}>{candidate.classroomTitle}</Text>
                  <Text style={styles.listMeta}>{candidate.lectureTitle}</Text>
                  <Text style={styles.listMeta}>
                    {formatEnum(candidate.status)} · Suggested duration {candidate.durationMinutes}{" "}
                    min
                    {" · "}Rotation {candidate.bluetoothRotationWindowSeconds}s
                  </Text>
                </Pressable>
              ))
            ) : (
              <TeacherEmptyCard label="No classroom candidates are available for Bluetooth attendance yet." />
            )}
          </TeacherCard>

          {selectedCandidate ? (
            <TeacherCard
              title="Start Bluetooth Attendance"
              subtitle="AttendEase creates the backend session first, then opens the active teacher control screen for Bluetooth broadcast."
            >
              <Text style={styles.bodyText}>{sessionShell.message}</Text>
              <Pressable
                style={[
                  styles.primaryButton,
                  !sessionShell.canOpenActiveShell || createSessionMutation.isPending
                    ? styles.disabledButton
                    : null,
                ]}
                disabled={!sessionShell.canOpenActiveShell || createSessionMutation.isPending}
                onPress={() => {
                  if (!selectedCandidate) {
                    return
                  }

                  void createSessionMutation
                    .mutateAsync({
                      classroomId: selectedCandidate.classroomId,
                      ...(selectedCandidate.lectureId
                        ? { lectureId: selectedCandidate.lectureId }
                        : {}),
                      sessionDurationMinutes: normalizedDurationMinutes,
                    })
                    .then(async (created) => {
                      queryClient.setQueryData(
                        teacherQueryKeys.bluetoothRuntime(created.session.id),
                        created,
                      )
                      await invalidateTeacherExperienceQueries(queryClient, {
                        classroomId: created.session.classroomId,
                        sessionId: created.session.id,
                      })
                      router.push(
                        teacherRoutes.bluetoothActive({
                          sessionId: created.session.id,
                          classroomId: created.session.classroomId,
                          classroomTitle: selectedCandidate.classroomTitle,
                          lectureTitle: selectedCandidate.lectureTitle,
                          durationMinutes: String(normalizedDurationMinutes),
                          rotationWindowSeconds: String(
                            created.session.bluetoothRotationWindowSeconds ??
                              selectedCandidate.bluetoothRotationWindowSeconds,
                          ),
                        }),
                      )
                    })
                }}
              >
                <Text style={styles.primaryButtonLabel}>{setupStatus.startLabel}</Text>
              </Pressable>
            </TeacherCard>
          ) : null}
        </>
      )}
    </TeacherScreen>
  )
}
