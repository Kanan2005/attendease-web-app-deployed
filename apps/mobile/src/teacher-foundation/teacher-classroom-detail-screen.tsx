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
  useTeacherClassroomRosterQuery,
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
  useTeacherRemoveRosterMemberMutation,
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

export function TeacherClassroomDetailScreen(props: { classroomId: string }) {
  const { session } = useTeacherSession()
  const router = useRouter()
  const classroom = useTeacherClassroomDetailData(props.classroomId)
  const updateClassroomMutation = useTeacherUpdateClassroomMutation(props.classroomId)
  const archiveClassroomMutation = useTeacherArchiveClassroomMutation(props.classroomId)
  const resetJoinCodeMutation = useTeacherResetJoinCodeMutation(props.classroomId)
  const [isEditingCourseInfo, setIsEditingCourseInfo] = useState(false)
  const [courseInfoDraft, setCourseInfoDraft] = useState<ReturnType<
    typeof createTeacherClassroomEditDraft
  > | null>(null)
  const [joinCodeMessage, setJoinCodeMessage] = useState<string | null>(null)
  const [courseInfoMessage, setCourseInfoMessage] = useState<string | null>(null)
  const classroomContext = teacherRoutes.classroomContext(props.classroomId)
  const joinCodeAction = buildTeacherJoinCodeActionModel({
    joinCode: classroom.detailQuery.data?.activeJoinCode ?? null,
    isPending: resetJoinCodeMutation.isPending,
  })

  useEffect(() => {
    const detail = classroom.detailQuery.data

    if (!detail) {
      return
    }

    setCourseInfoDraft((currentDraft) => currentDraft ?? createTeacherClassroomEditDraft(detail))
  }, [classroom.detailQuery.data])

  const classroomDetail = classroom.detailQuery.data ?? null
  const canEditCourseInfo = classroomDetail?.permissions?.canEditCourseInfo ?? false
  const canArchiveClassroom = classroomDetail?.permissions?.canArchive ?? false
  const canLaunchBluetooth =
    classroomDetail?.status !== "ARCHIVED" && classroomDetail?.status !== "COMPLETED"
  const canRotateJoinCode =
    classroomDetail?.status !== "ARCHIVED" && (classroomDetail?.permissions?.canEdit ?? true)
  const hasCourseChanges =
    classroomDetail && courseInfoDraft
      ? hasTeacherClassroomEditChanges(classroomDetail, courseInfoDraft)
      : false

  return (
    <TeacherScreen
      title="Classroom Detail"
      subtitle="Course info, roster, schedule, updates, and Bluetooth launch stay together in one teacher-owned course hub."
    >
      {!session ? (
        <TeacherSessionSetupCard />
      ) : classroom.detailQuery.isLoading ||
        classroom.rosterQuery.isLoading ||
        classroom.scheduleQuery.isLoading ||
        classroom.announcementsQuery.isLoading ||
        classroom.lecturesQuery.isLoading ||
        classroom.rosterImportsQuery.isLoading ? (
        <TeacherLoadingCard label="Loading classroom hub" />
      ) : classroom.detailQuery.error ||
        classroom.rosterQuery.error ||
        classroom.scheduleQuery.error ||
        classroom.announcementsQuery.error ||
        classroom.lecturesQuery.error ||
        classroom.rosterImportsQuery.error ? (
        <TeacherErrorCard
          label={mapTeacherApiErrorToMessage(
            classroom.detailQuery.error ??
              classroom.rosterQuery.error ??
              classroom.scheduleQuery.error ??
              classroom.announcementsQuery.error ??
              classroom.lecturesQuery.error ??
              classroom.rosterImportsQuery.error,
          )}
        />
      ) : (
        <>
          <TeacherCard
            title={classroomDetail?.classroomTitle ?? classroomDetail?.displayTitle ?? "Classroom"}
            subtitle={`${classroomDetail?.courseCode ?? classroomDetail?.code ?? ""} · ${formatEnum(classroomDetail?.status ?? "DRAFT")}`}
          >
            <Text style={styles.listMeta}>
              {classroomDetail ? buildTeacherClassroomSupportingText(classroomDetail) : ""}
            </Text>
            <Text style={styles.listMeta}>Join code: {joinCodeAction.currentCodeLabel}</Text>
            <Text style={styles.listMeta}>
              Join code expiry:{" "}
              {classroomDetail?.activeJoinCode?.expiresAt
                ? formatDateTime(classroomDetail.activeJoinCode.expiresAt)
                : joinCodeAction.expiryLabel}
            </Text>
            <Text style={styles.listMeta}>
              Academic scope:{" "}
              {classroomDetail ? buildTeacherClassroomScopeSummary(classroomDetail) : "Classroom"}
            </Text>
            <Text style={styles.listMeta}>
              Default attendance mode:{" "}
              {formatEnum(classroomDetail?.defaultAttendanceMode ?? "QR_GPS")}
            </Text>
            <Text style={styles.listMeta}>Timezone: {classroomDetail?.timezone}</Text>
            <View style={styles.actionGrid}>
              {canLaunchBluetooth ? (
                <TeacherNavAction
                  href={classroomContext.bluetoothCreate}
                  label="Bluetooth Session"
                />
              ) : null}
              <TeacherNavAction href={classroomContext.roster} label="Roster" />
              <TeacherNavAction href={classroomContext.announcements} label="Announcements" />
              <TeacherNavAction href={classroomContext.schedule} label="Schedule" />
              <TeacherNavAction href={classroomContext.lectures} label="Lectures" />
            </View>
            {canRotateJoinCode ? (
              <Pressable
                style={styles.secondaryButton}
                disabled={resetJoinCodeMutation.isPending}
                onPress={() => {
                  setJoinCodeMessage(null)
                  resetJoinCodeMutation.mutate(undefined, {
                    onSuccess: (joinCode) => {
                      setJoinCodeMessage(`New join code: ${joinCode.code}`)
                    },
                  })
                }}
              >
                <Text style={styles.secondaryButtonLabel}>{joinCodeAction.resetButtonLabel}</Text>
              </Pressable>
            ) : null}
            <Text style={styles.listMeta}>{joinCodeAction.helperMessage}</Text>
            {joinCodeMessage ? <Text style={styles.successText}>{joinCodeMessage}</Text> : null}
            {resetJoinCodeMutation.error ? (
              <Text style={styles.errorText}>
                {mapTeacherApiErrorToMessage(resetJoinCodeMutation.error)}
              </Text>
            ) : null}
          </TeacherCard>

          <TeacherCard
            title="Course Info"
            subtitle={
              canEditCourseInfo
                ? "Update the classroom title and course code without leaving the teacher course hub."
                : "This classroom is read-only on this phone."
            }
          >
            <Text style={styles.listMeta}>
              {classroomDetail ? buildTeacherClassroomScopeSummary(classroomDetail) : ""}
            </Text>
            {canEditCourseInfo && courseInfoDraft ? (
              <>
                {!isEditingCourseInfo ? (
                  <View style={styles.actionGrid}>
                    <Pressable
                      style={styles.primaryButton}
                      onPress={() => {
                        setCourseInfoMessage(null)
                        setIsEditingCourseInfo(true)
                      }}
                    >
                      <Text style={styles.primaryButtonLabel}>Edit Course Info</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>Classroom title</Text>
                    <TextInput
                      value={courseInfoDraft.classroomTitle}
                      autoCapitalize="words"
                      placeholder="Applied Mathematics"
                      onChangeText={(value) =>
                        setCourseInfoDraft((currentDraft) =>
                          currentDraft
                            ? {
                                ...currentDraft,
                                classroomTitle: value,
                              }
                            : currentDraft,
                        )
                      }
                      style={styles.input}
                    />

                    <Text style={styles.fieldLabel}>Course code</Text>
                    <TextInput
                      value={courseInfoDraft.courseCode}
                      autoCapitalize="characters"
                      placeholder="CSE6-MATH-A"
                      onChangeText={(value) =>
                        setCourseInfoDraft((currentDraft) =>
                          currentDraft
                            ? {
                                ...currentDraft,
                                courseCode: value,
                              }
                            : currentDraft,
                        )
                      }
                      style={styles.input}
                    />

                    <View style={styles.actionGrid}>
                      <Pressable
                        style={[
                          styles.primaryButton,
                          updateClassroomMutation.isPending ||
                          !hasCourseChanges ||
                          courseInfoDraft.classroomTitle.trim().length < 3 ||
                          courseInfoDraft.courseCode.trim().length < 3
                            ? styles.disabledButton
                            : null,
                        ]}
                        disabled={
                          updateClassroomMutation.isPending ||
                          !hasCourseChanges ||
                          courseInfoDraft.classroomTitle.trim().length < 3 ||
                          courseInfoDraft.courseCode.trim().length < 3
                        }
                        onPress={() => {
                          if (!classroomDetail) {
                            return
                          }

                          setCourseInfoMessage(null)
                          updateClassroomMutation.mutate(
                            buildTeacherClassroomUpdateRequest(classroomDetail, courseInfoDraft),
                            {
                              onSuccess: (updated) => {
                                setCourseInfoDraft(createTeacherClassroomEditDraft(updated))
                                setCourseInfoMessage(
                                  `Saved ${updated.classroomTitle ?? updated.displayTitle}.`,
                                )
                                setIsEditingCourseInfo(false)
                              },
                            },
                          )
                        }}
                      >
                        <Text style={styles.primaryButtonLabel}>
                          {updateClassroomMutation.isPending ? "Saving..." : "Save Course Info"}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() => {
                          if (classroomDetail) {
                            setCourseInfoDraft(createTeacherClassroomEditDraft(classroomDetail))
                          }
                          setCourseInfoMessage(null)
                          setIsEditingCourseInfo(false)
                        }}
                      >
                        <Text style={styles.secondaryButtonLabel}>Cancel</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </>
            ) : (
              <>
                <Text style={styles.listMeta}>
                  Course info changes are controlled by classroom permissions from the backend.
                </Text>
                <Text style={styles.listMeta}>
                  Title: {classroomDetail?.classroomTitle ?? classroomDetail?.displayTitle ?? "—"}
                </Text>
                <Text style={styles.listMeta}>
                  Course code: {classroomDetail?.courseCode ?? classroomDetail?.code ?? "—"}
                </Text>
              </>
            )}
            {courseInfoMessage ? <Text style={styles.successText}>{courseInfoMessage}</Text> : null}
            {updateClassroomMutation.error ? (
              <Text style={styles.errorText}>
                {mapTeacherApiErrorToMessage(updateClassroomMutation.error)}
              </Text>
            ) : null}
          </TeacherCard>

          {canArchiveClassroom ? (
            <TeacherCard
              title="Archive Classroom"
              subtitle="Archive keeps attendance history safe while removing the classroom from active teaching work."
            >
              <Text style={styles.listMeta}>
                Archive when the course is finished or should no longer accept active classroom
                work.
              </Text>
              <Pressable
                style={[
                  styles.dangerButton,
                  archiveClassroomMutation.isPending ? styles.disabledButton : null,
                ]}
                disabled={archiveClassroomMutation.isPending}
                onPress={() => {
                  setCourseInfoMessage(null)
                  archiveClassroomMutation.mutate(undefined, {
                    onSuccess: (archived) => {
                      setCourseInfoDraft(createTeacherClassroomEditDraft(archived))
                      setCourseInfoMessage(
                        `Archived ${archived.classroomTitle ?? archived.displayTitle}.`,
                      )
                      setIsEditingCourseInfo(false)
                    },
                  })
                }}
              >
                <Text style={styles.primaryButtonLabel}>
                  {archiveClassroomMutation.isPending ? "Archiving..." : "Archive Classroom"}
                </Text>
              </Pressable>
              {archiveClassroomMutation.error ? (
                <Text style={styles.errorText}>
                  {mapTeacherApiErrorToMessage(archiveClassroomMutation.error)}
                </Text>
              ) : null}
              {classroomDetail?.status === "ARCHIVED" ? (
                <View style={styles.actionGrid}>
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => router.replace(teacherRoutes.classrooms)}
                  >
                    <Text style={styles.secondaryButtonLabel}>Back To Classrooms</Text>
                  </Pressable>
                </View>
              ) : null}
            </TeacherCard>
          ) : null}

          <TeacherCard
            title="Classroom Hub Preview"
            subtitle="Counts here come from the same live endpoints the dedicated classroom student, schedule, update, and lecture routes use."
          >
            <View style={styles.cardGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Roster Members</Text>
                <Text style={[styles.metricValue, styles.primaryTone]}>
                  {classroom.rosterQuery.data?.length ?? 0}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Announcements</Text>
                <Text style={[styles.metricValue, styles.successTone]}>
                  {classroom.announcementsQuery.data?.length ?? 0}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Lectures</Text>
                <Text style={[styles.metricValue, styles.warningTone]}>
                  {classroom.lecturesQuery.data?.length ?? 0}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Import Jobs</Text>
                <Text style={[styles.metricValue, styles.dangerTone]}>
                  {classroom.rosterImportsQuery.data?.length ?? 0}
                </Text>
              </View>
            </View>
          </TeacherCard>
        </>
      )}
    </TeacherScreen>
  )
}
