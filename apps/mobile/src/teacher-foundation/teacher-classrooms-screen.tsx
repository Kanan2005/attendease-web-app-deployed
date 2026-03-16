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

export function TeacherClassroomsScreen() {
  const { session } = useTeacherSession()
  const router = useRouter()
  const classroomsQuery = useTeacherClassroomsQuery()
  const assignmentsQuery = useTeacherAssignmentsQuery()
  const createClassroomMutation = useTeacherCreateClassroomMutation()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createMessage, setCreateMessage] = useState<string | null>(null)
  const createScopeOptions = buildTeacherClassroomScopeOptions(assignmentsQuery.data ?? [])
  const [createDraft, setCreateDraft] = useState(() => createTeacherClassroomCreateDraft())
  const canCreateClassroom = (assignmentsQuery.data ?? []).some(
    (assignment) => assignment.canSelfCreateCourseOffering,
  )
  const classroomsError = classroomsQuery.error ?? assignmentsQuery.error
  const classroomsStatus = buildTeacherClassroomsStatus({
    hasSession: Boolean(session),
    isLoading: classroomsQuery.isLoading || assignmentsQuery.isLoading,
    errorMessage: classroomsError ? mapTeacherApiErrorToMessage(classroomsError) : null,
    classroomCount: classroomsQuery.data?.length ?? 0,
    canCreateClassroom,
  })

  useEffect(() => {
    if (!createScopeOptions.length) {
      return
    }

    if (createScopeOptions.some((option) => option.key === createDraft.selectedScopeKey)) {
      return
    }

    setCreateDraft((currentDraft) => ({
      ...currentDraft,
      selectedScopeKey: createScopeOptions[0]?.key ?? "",
    }))
  }, [createDraft.selectedScopeKey, createScopeOptions])

  return (
    <TeacherScreen
      title="Classrooms"
      subtitle="Create classrooms, update course info, and keep roster, schedule, and Bluetooth attendance close to the course list."
    >
      {!session ? (
        <TeacherSessionSetupCard />
      ) : classroomsQuery.isLoading || assignmentsQuery.isLoading ? (
        <TeacherLoadingCard label="Loading teacher classrooms" />
      ) : classroomsError ? (
        <TeacherErrorCard label={mapTeacherApiErrorToMessage(classroomsError)} />
      ) : (
        <>
          <TeacherStatusBanner status={classroomsStatus} />

          <TeacherCard
            title="Manage Classrooms"
            subtitle="Open an existing classroom or create a new one from an approved teaching scope."
          >
            <View style={styles.actionGrid}>
              {canCreateClassroom ? (
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => {
                    setCreateMessage(null)
                    setIsCreateOpen((current) => !current)
                  }}
                >
                  <Text style={styles.primaryButtonLabel}>
                    {isCreateOpen ? "Close Create" : "Create Classroom"}
                  </Text>
                </Pressable>
              ) : null}
              <TeacherNavAction href={teacherRoutes.home} label="Teacher Home" />
            </View>
            {createMessage ? <Text style={styles.successText}>{createMessage}</Text> : null}
            {!canCreateClassroom ? (
              <Text style={styles.listMeta}>
                This teacher account can manage assigned classrooms, but classroom creation is not
                enabled for any current teaching scope.
              </Text>
            ) : null}
          </TeacherCard>

          {isCreateOpen ? (
            <TeacherCard
              title="Create Classroom"
              subtitle="Pick one teaching scope, then enter a course name and course code. AttendEase keeps the rest of the defaults ready."
            >
              {createScopeOptions.length ? (
                <>
                  <Text style={styles.fieldLabel}>Teaching scope</Text>
                  <View style={styles.optionGrid}>
                    {createScopeOptions.map((option) => {
                      const isSelected = option.key === createDraft.selectedScopeKey

                      return (
                        <Pressable
                          key={option.key}
                          style={[
                            styles.selectionCard,
                            isSelected ? styles.selectionCardActive : null,
                          ]}
                          onPress={() =>
                            setCreateDraft((currentDraft) => ({
                              ...currentDraft,
                              selectedScopeKey: option.key,
                            }))
                          }
                        >
                          <Text style={styles.listTitle}>{option.title}</Text>
                          <Text style={styles.listMeta}>{option.supportingText}</Text>
                        </Pressable>
                      )
                    })}
                  </View>

                  <Text style={styles.fieldLabel}>Classroom title</Text>
                  <TextInput
                    value={createDraft.classroomTitle}
                    autoCapitalize="words"
                    placeholder="Applied Mathematics"
                    onChangeText={(value) =>
                      setCreateDraft((currentDraft) => ({
                        ...currentDraft,
                        classroomTitle: value,
                      }))
                    }
                    style={styles.input}
                  />

                  <Text style={styles.fieldLabel}>Course code</Text>
                  <TextInput
                    value={createDraft.courseCode}
                    autoCapitalize="characters"
                    placeholder="CSE6-MATH-A"
                    onChangeText={(value) =>
                      setCreateDraft((currentDraft) => ({
                        ...currentDraft,
                        courseCode: value,
                      }))
                    }
                    style={styles.input}
                  />

                  <View style={styles.actionGrid}>
                    <Pressable
                      style={[
                        styles.primaryButton,
                        createClassroomMutation.isPending ||
                        createDraft.classroomTitle.trim().length < 3 ||
                        createDraft.courseCode.trim().length < 3
                          ? styles.disabledButton
                          : null,
                      ]}
                      disabled={
                        createClassroomMutation.isPending ||
                        createDraft.classroomTitle.trim().length < 3 ||
                        createDraft.courseCode.trim().length < 3
                      }
                      onPress={() => {
                        setCreateMessage(null)
                        createClassroomMutation.mutate(
                          buildTeacherClassroomCreateRequest(createScopeOptions, createDraft),
                          {
                            onSuccess: (created) => {
                              setCreateMessage(
                                `Created ${created.classroomTitle ?? created.displayTitle}.`,
                              )
                              setIsCreateOpen(false)
                              setCreateDraft(
                                createTeacherClassroomCreateDraft(createScopeOptions[0]?.key ?? ""),
                              )
                              router.push(teacherRoutes.classroomDetail(created.id))
                            },
                          },
                        )
                      }}
                    >
                      <Text style={styles.primaryButtonLabel}>
                        {createClassroomMutation.isPending ? "Creating..." : "Create Classroom"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => {
                        setCreateMessage(null)
                        setIsCreateOpen(false)
                        setCreateDraft(
                          createTeacherClassroomCreateDraft(createScopeOptions[0]?.key ?? ""),
                        )
                      }}
                    >
                      <Text style={styles.secondaryButtonLabel}>Cancel</Text>
                    </Pressable>
                  </View>
                  {createClassroomMutation.error ? (
                    <Text style={styles.errorText}>
                      {mapTeacherApiErrorToMessage(createClassroomMutation.error)}
                    </Text>
                  ) : null}
                </>
              ) : (
                <TeacherEmptyCard label="No create-ready teaching scope is available for this teacher account yet." />
              )}
            </TeacherCard>
          ) : null}

          <TeacherCard
            title="Classroom List"
            subtitle="Each classroom keeps course info, roster, schedule, and Bluetooth session launch close together."
          >
            {classroomsQuery.data?.length ? (
              classroomsQuery.data.map((classroom) => {
                const classroomContext = teacherRoutes.classroomContext(classroom.id)
                const canLaunchBluetooth =
                  classroom.status !== "ARCHIVED" && classroom.status !== "COMPLETED"

                return (
                  <View key={classroom.id} style={styles.highlightCard}>
                    <Text style={styles.listTitle}>
                      {classroom.classroomTitle ?? classroom.displayTitle}
                    </Text>
                    <Text style={styles.listMeta}>
                      {(classroom.courseCode ?? classroom.code).toUpperCase()} ·{" "}
                      {formatEnum(classroom.status)}
                    </Text>
                    <Text style={styles.listMeta}>
                      {buildTeacherClassroomSupportingText(classroom)}
                    </Text>
                    <Text style={styles.listMeta}>
                      Join code: {classroom.activeJoinCode?.code ?? "No live join code"}
                    </Text>
                    <Text style={styles.listMeta}>
                      {classroom.permissions?.canEditCourseInfo
                        ? "Course info can be updated from this phone."
                        : "Course info is read-only for this classroom."}
                    </Text>
                    <View style={styles.actionGrid}>
                      <TeacherNavAction href={classroomContext.detail} label="Open Course" />
                      {canLaunchBluetooth ? (
                        <TeacherNavAction
                          href={classroomContext.bluetoothCreate}
                          label="Bluetooth"
                        />
                      ) : null}
                      <TeacherNavAction href={classroomContext.roster} label="Students" />
                      <TeacherNavAction href={classroomContext.schedule} label="Schedule" />
                    </View>
                  </View>
                )
              })
            ) : (
              <TeacherEmptyCard label="No classrooms are ready yet for this teacher account." />
            )}
          </TeacherCard>
        </>
      )}
    </TeacherScreen>
  )
}
