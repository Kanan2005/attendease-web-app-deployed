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

export function TeacherClassroomRosterScreen(props: { classroomId: string }) {
  const { session } = useTeacherSession()
  const classroom = useTeacherClassroomDetailData(props.classroomId)
  const addRosterMutation = useTeacherAddRosterMemberMutation(props.classroomId)
  const updateRosterMutation = useTeacherUpdateRosterMemberMutation(props.classroomId)
  const removeRosterMutation = useTeacherRemoveRosterMemberMutation(props.classroomId)
  const createRosterImportMutation = useTeacherCreateRosterImportMutation(props.classroomId)
  const applyRosterImportMutation = useTeacherApplyRosterImportMutation(props.classroomId)
  const [studentLookup, setStudentLookup] = useState("")
  const [memberStatus, setMemberStatus] = useState<"ACTIVE" | "PENDING">("ACTIVE")
  const [searchText, setSearchText] = useState("")
  const [statusFilter, setStatusFilter] = useState<TeacherRosterStatusFilter>("ALL")
  const [sourceFileName, setSourceFileName] = useState("teacher-mobile-import.csv")
  const [rowsText, setRowsText] = useState("")
  const [rosterMessage, setRosterMessage] = useState<string | null>(null)
  const classroomContext = teacherRoutes.classroomContext(props.classroomId)
  const rosterFilters = buildTeacherRosterFilters({
    searchText,
    statusFilter,
  })
  const filteredRosterQuery = useTeacherClassroomRosterQuery(props.classroomId, rosterFilters)
  const importPreview = buildTeacherRosterImportPreview({
    rosterMemberCount: classroom.rosterQuery.data?.length ?? 0,
    importJobCount: classroom.rosterImportsQuery.data?.length ?? 0,
    reviewRequiredCount:
      classroom.rosterImportsQuery.data?.filter((job) => job.status === "REVIEW_REQUIRED").length ??
      0,
  })
  const importDraft = buildTeacherRosterImportDraftModel(rowsText)
  const classroomDetail = classroom.detailQuery.data ?? null
  const totalRosterCount = classroom.rosterQuery.data?.length ?? 0
  const activeRosterCount =
    classroom.rosterQuery.data?.filter((member) => member.membershipState === "ACTIVE").length ?? 0
  const pendingRosterCount =
    classroom.rosterQuery.data?.filter((member) => member.membershipState === "PENDING").length ?? 0
  const blockedRosterCount =
    classroom.rosterQuery.data?.filter((member) => member.membershipState === "BLOCKED").length ?? 0
  const rosterStatus = buildTeacherRosterStatus({
    hasSession: Boolean(session),
    isLoading:
      classroom.detailQuery.isLoading ||
      classroom.rosterQuery.isLoading ||
      filteredRosterQuery.isLoading ||
      classroom.rosterImportsQuery.isLoading,
    errorMessage:
      classroom.detailQuery.error ||
      classroom.rosterQuery.error ||
      filteredRosterQuery.error ||
      classroom.rosterImportsQuery.error
        ? mapTeacherApiErrorToMessage(
            classroom.detailQuery.error ??
              classroom.rosterQuery.error ??
              filteredRosterQuery.error ??
              classroom.rosterImportsQuery.error,
          )
        : null,
    totalCount: totalRosterCount,
    visibleCount: filteredRosterQuery.data?.length ?? 0,
    hasActiveFilter: statusFilter !== "ALL" || searchText.trim().length > 0,
  })

  return (
    <TeacherScreen
      title="Classroom Roster"
      subtitle="Keep students, enrollment state, and course context together from one classroom roster screen."
    >
      {!session ? (
        <TeacherSessionSetupCard />
      ) : classroom.detailQuery.isLoading ||
        classroom.rosterQuery.isLoading ||
        filteredRosterQuery.isLoading ||
        classroom.rosterImportsQuery.isLoading ? (
        <TeacherLoadingCard label="Loading classroom roster" />
      ) : classroom.detailQuery.error ||
        classroom.rosterQuery.error ||
        filteredRosterQuery.error ||
        classroom.rosterImportsQuery.error ? (
        <TeacherErrorCard
          label={mapTeacherApiErrorToMessage(
            classroom.detailQuery.error ??
              classroom.rosterQuery.error ??
              filteredRosterQuery.error ??
              classroom.rosterImportsQuery.error,
          )}
        />
      ) : (
        <>
          <TeacherStatusBanner status={rosterStatus} />

          <TeacherCard
            title={classroomDetail?.classroomTitle ?? classroomDetail?.displayTitle ?? "Classroom"}
            subtitle="Open course context, see current student counts, and keep the most common roster actions close."
          >
            <Text style={styles.listMeta}>
              {classroomDetail ? buildTeacherClassroomSupportingText(classroomDetail) : "Classroom"}
            </Text>
            <View style={styles.cardGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Students</Text>
                <Text style={[styles.metricValue, styles.primaryTone]}>{totalRosterCount}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Active</Text>
                <Text style={[styles.metricValue, styles.successTone]}>{activeRosterCount}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Pending</Text>
                <Text style={[styles.metricValue, styles.warningTone]}>{pendingRosterCount}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Blocked</Text>
                <Text style={[styles.metricValue, styles.dangerTone]}>{blockedRosterCount}</Text>
              </View>
            </View>
            <View style={styles.actionGrid}>
              <TeacherNavAction href={classroomContext.detail} label="Back To Course" />
              <TeacherNavAction href={classroomContext.schedule} label="Schedule" />
              <TeacherNavAction href={classroomContext.announcements} label="Updates" />
            </View>
          </TeacherCard>

          <TeacherCard
            title="Add Student"
            subtitle="Use email, roll number, university ID, or student identifier to add a student without leaving the classroom."
          >
            <Text style={styles.fieldLabel}>Student lookup</Text>
            <TextInput
              value={studentLookup}
              autoCapitalize="none"
              placeholder="student.one@attendease.dev or 23CS001"
              onChangeText={setStudentLookup}
              style={styles.input}
            />
            <Text style={styles.fieldLabel}>Enrollment state</Text>
            <View style={styles.actionGrid}>
              <Pressable
                style={[
                  styles.secondaryButton,
                  memberStatus === "ACTIVE" ? styles.selectedActionButton : null,
                ]}
                onPress={() => setMemberStatus("ACTIVE")}
              >
                <Text style={styles.secondaryButtonLabel}>
                  {memberStatus === "ACTIVE" ? "Active now" : "Mark active"}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.secondaryButton,
                  memberStatus === "PENDING" ? styles.selectedActionButton : null,
                ]}
                onPress={() => setMemberStatus("PENDING")}
              >
                <Text style={styles.secondaryButtonLabel}>
                  {memberStatus === "PENDING" ? "Pending review" : "Mark pending"}
                </Text>
              </Pressable>
            </View>
            <Pressable
              style={[
                styles.primaryButton,
                addRosterMutation.isPending || studentLookup.trim().length < 3
                  ? styles.disabledButton
                  : null,
              ]}
              disabled={addRosterMutation.isPending || studentLookup.trim().length < 3}
              onPress={() => {
                setRosterMessage(null)
                addRosterMutation.mutate(
                  buildTeacherRosterAddRequest({
                    lookup: studentLookup,
                    membershipStatus: memberStatus,
                  }),
                  {
                    onSuccess: (member) => {
                      setStudentLookup("")
                      setMemberStatus("ACTIVE")
                      setRosterMessage(`Added ${member.studentDisplayName} to the classroom.`)
                    },
                  },
                )
              }}
            >
              <Text style={styles.primaryButtonLabel}>
                {addRosterMutation.isPending ? "Adding..." : "Add Student"}
              </Text>
            </Pressable>
            {addRosterMutation.error ? (
              <Text style={styles.errorText}>
                {mapTeacherApiErrorToMessage(addRosterMutation.error)}
              </Text>
            ) : null}
          </TeacherCard>

          <TeacherCard
            title="Find Students"
            subtitle="Search by name, email, roll number, or university ID, then narrow the list with one status filter."
          >
            <TextInput
              value={searchText}
              autoCapitalize="none"
              placeholder="Search students"
              onChangeText={setSearchText}
              style={styles.input}
            />
            <View style={styles.actionGrid}>
              {teacherRosterStatusFilters.map((filter) => (
                <Pressable
                  key={filter}
                  style={[
                    styles.secondaryButton,
                    statusFilter === filter ? styles.selectedActionButton : null,
                  ]}
                  onPress={() => setStatusFilter(filter)}
                >
                  <Text style={styles.secondaryButtonLabel}>
                    {filter === "ALL" ? "All" : formatEnum(filter)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.listMeta}>
              {buildTeacherRosterResultSummary({
                totalCount: totalRosterCount,
                visibleCount: filteredRosterQuery.data?.length ?? 0,
                statusFilter,
                searchText,
              })}
            </Text>
          </TeacherCard>

          <TeacherCard
            title="Students"
            subtitle="Update enrollment state or remove a student without leaving the classroom."
          >
            {filteredRosterQuery.data?.length ? (
              filteredRosterQuery.data.map((member) => (
                <View key={member.id} style={styles.memberCard}>
                  <Text style={styles.listTitle}>{member.studentDisplayName}</Text>
                  <Text style={styles.listMeta}>
                    {buildTeacherRosterMemberIdentityText(member)}
                  </Text>
                  <Text style={styles.listMeta}>
                    {formatEnum(member.membershipState)} · Joined{" "}
                    {formatDateTime(member.memberSince)}
                  </Text>
                  <Text style={styles.listMeta}>
                    Attendance disabled: {member.attendanceDisabled ? "Yes" : "No"}
                  </Text>
                  <View style={styles.actionGrid}>
                    {buildTeacherRosterMemberActions(member).map((action) => (
                      <Pressable
                        key={`${member.id}-${action.label}`}
                        style={[
                          action.tone === "danger" ? styles.dangerButton : styles.secondaryButton,
                          updateRosterMutation.isPending || removeRosterMutation.isPending
                            ? styles.disabledButton
                            : null,
                        ]}
                        disabled={updateRosterMutation.isPending || removeRosterMutation.isPending}
                        onPress={() => {
                          setRosterMessage(null)

                          if (action.kind === "REMOVE") {
                            removeRosterMutation.mutate(member.id, {
                              onSuccess: () => {
                                setRosterMessage(
                                  `Removed ${member.studentDisplayName} from this classroom.`,
                                )
                              },
                            })
                            return
                          }

                          updateRosterMutation.mutate(
                            {
                              enrollmentId: member.id,
                              membershipStatus: action.membershipStatus,
                            },
                            {
                              onSuccess: () => {
                                setRosterMessage(
                                  `${member.studentDisplayName} is now ${formatEnum(
                                    action.membershipStatus,
                                  ).toLowerCase()}.`,
                                )
                              },
                            },
                          )
                        }}
                      >
                        <Text
                          style={
                            action.tone === "danger"
                              ? styles.primaryButtonLabel
                              : styles.secondaryButtonLabel
                          }
                        >
                          {action.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))
            ) : totalRosterCount > 0 ? (
              <TeacherEmptyCard label="No students match this search or status filter yet." />
            ) : (
              <TeacherEmptyCard label="No students are in this classroom yet." />
            )}
            {updateRosterMutation.error ? (
              <Text style={styles.errorText}>
                {mapTeacherApiErrorToMessage(updateRosterMutation.error)}
              </Text>
            ) : null}
            {removeRosterMutation.error ? (
              <Text style={styles.errorText}>
                {mapTeacherApiErrorToMessage(removeRosterMutation.error)}
              </Text>
            ) : null}
            {rosterMessage ? <Text style={styles.successText}>{rosterMessage}</Text> : null}
          </TeacherCard>

          <TeacherCard
            title="Bulk Import"
            subtitle="Normal roster work stays above. Use this only when you need to queue a larger student batch."
          >
            <Text style={styles.listMeta}>{importPreview.title}</Text>
            <Text style={styles.listMeta}>{importPreview.message}</Text>
            <TextInput
              value={sourceFileName}
              autoCapitalize="none"
              placeholder="teacher-mobile-import.csv"
              onChangeText={setSourceFileName}
              style={styles.input}
            />
            <TextInput
              value={rowsText}
              autoCapitalize="none"
              multiline
              placeholder="student.one@attendease.dev, Student One"
              onChangeText={setRowsText}
              style={[styles.input, styles.multilineInput]}
            />
            <Text style={styles.listMeta}>
              Parsed rows: {importDraft.rows.length} · Invalid lines:{" "}
              {importDraft.invalidLines.length}
            </Text>
            {importDraft.invalidLines.length ? (
              <Text style={styles.errorText}>
                Invalid lines will be ignored until the document-picker upload adapter lands.
              </Text>
            ) : null}
            <Pressable
              style={[
                styles.primaryButton,
                createRosterImportMutation.isPending ||
                sourceFileName.trim().length === 0 ||
                importDraft.rows.length === 0
                  ? styles.disabledButton
                  : null,
              ]}
              disabled={
                createRosterImportMutation.isPending ||
                sourceFileName.trim().length === 0 ||
                importDraft.rows.length === 0
              }
              onPress={() => {
                setRosterMessage(null)
                createRosterImportMutation.mutate(
                  {
                    sourceFileName: sourceFileName.trim(),
                    rowsText,
                  },
                  {
                    onSuccess: (job) => {
                      setRowsText("")
                      setRosterMessage(
                        `Created import job ${job.sourceFileName} with ${job.totalRows} row${job.totalRows === 1 ? "" : "s"}.`,
                      )
                    },
                  },
                )
              }}
            >
              <Text style={styles.primaryButtonLabel}>
                {createRosterImportMutation.isPending ? "Creating Import..." : "Create Import Job"}
              </Text>
            </Pressable>
            {createRosterImportMutation.error ? (
              <Text style={styles.errorText}>
                {mapTeacherApiErrorToMessage(createRosterImportMutation.error)}
              </Text>
            ) : null}
          </TeacherCard>

          {classroom.rosterImportsQuery.data?.length ? (
            <TeacherCard
              title="Roster Import Status"
              subtitle="Review queued jobs here when you need to follow up on a larger roster batch."
            >
              {classroom.rosterImportsQuery.data.map((job) => (
                <View key={job.id} style={styles.listRow}>
                  <Text style={styles.listTitle}>{job.sourceFileName}</Text>
                  <Text style={styles.listMeta}>
                    {formatEnum(job.status)} · {job.appliedRows}/{job.totalRows} applied
                  </Text>
                  {job.status === "REVIEW_REQUIRED" ? (
                    <Pressable
                      style={styles.secondaryButton}
                      disabled={applyRosterImportMutation.isPending}
                      onPress={() => {
                        setRosterMessage(null)
                        applyRosterImportMutation.mutate(job.id, {
                          onSuccess: () => {
                            setRosterMessage(`Applied reviewed rows for ${job.sourceFileName}.`)
                          },
                        })
                      }}
                    >
                      <Text style={styles.secondaryButtonLabel}>
                        {applyRosterImportMutation.isPending
                          ? "Applying..."
                          : "Apply Reviewed Rows"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {applyRosterImportMutation.error ? (
                <Text style={styles.errorText}>
                  {mapTeacherApiErrorToMessage(applyRosterImportMutation.error)}
                </Text>
              ) : null}
            </TeacherCard>
          ) : null}
        </>
      )}
    </TeacherScreen>
  )
}
