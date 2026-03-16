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

export function TeacherReportsScreen() {
  const { session } = useTeacherSession()
  const [selectedClassroomId, setSelectedClassroomId] = useState("")
  const [selectedSubjectId, setSelectedSubjectId] = useState("")
  const reports = useTeacherFilteredReportsData({
    ...(selectedClassroomId ? { classroomId: selectedClassroomId } : {}),
    ...(selectedSubjectId ? { subjectId: selectedSubjectId } : {}),
  })
  const reportsStatus = buildTeacherReportsStatus({
    hasSession: Boolean(session),
    isLoading:
      reports.classroomsQuery.isLoading ||
      reports.daywiseQuery.isLoading ||
      reports.subjectwiseQuery.isLoading ||
      reports.studentPercentagesQuery.isLoading ||
      reports.subjectOptionsQuery.isLoading,
    errorMessage:
      reports.classroomsQuery.error ||
      reports.daywiseQuery.error ||
      reports.subjectwiseQuery.error ||
      reports.studentPercentagesQuery.error ||
      reports.subjectOptionsQuery.error
        ? mapTeacherApiErrorToMessage(
            reports.classroomsQuery.error ??
              reports.daywiseQuery.error ??
              reports.subjectwiseQuery.error ??
              reports.studentPercentagesQuery.error ??
              reports.subjectOptionsQuery.error,
          )
        : null,
    hasAnyData: reports.model.hasAnyData,
    hasClassroomFilter: Boolean(selectedClassroomId),
    hasSubjectFilter: Boolean(selectedSubjectId),
    followUpCount: reports.model.studentRows.filter(
      (row) =>
        row.followUpLabel === "Needs follow-up" || row.followUpLabel === "Immediate follow-up",
    ).length,
  })

  useEffect(() => {
    if (
      selectedClassroomId &&
      !reports.filterOptions.classroomOptions.some((option) => option.value === selectedClassroomId)
    ) {
      setSelectedClassroomId("")
    }
  }, [reports.filterOptions.classroomOptions, selectedClassroomId])

  useEffect(() => {
    if (
      selectedSubjectId &&
      !reports.filterOptions.subjectOptions.some((option) => option.value === selectedSubjectId)
    ) {
      setSelectedSubjectId("")
    }
  }, [reports.filterOptions.subjectOptions, selectedSubjectId])

  return (
    <TeacherScreen
      title="Reports"
      subtitle="Review attendance trends, follow-up risk, and export-ready totals without leaving teacher mobile."
    >
      {!session ? (
        <TeacherSessionSetupCard />
      ) : reports.classroomsQuery.isLoading ||
        reports.daywiseQuery.isLoading ||
        reports.subjectwiseQuery.isLoading ||
        reports.studentPercentagesQuery.isLoading ||
        reports.subjectOptionsQuery.isLoading ? (
        <TeacherLoadingCard label="Loading teacher reports" />
      ) : reports.classroomsQuery.error ||
        reports.daywiseQuery.error ||
        reports.subjectwiseQuery.error ||
        reports.studentPercentagesQuery.error ||
        reports.subjectOptionsQuery.error ? (
        <TeacherErrorCard
          label={mapTeacherApiErrorToMessage(
            reports.classroomsQuery.error ??
              reports.daywiseQuery.error ??
              reports.subjectwiseQuery.error ??
              reports.studentPercentagesQuery.error ??
              reports.subjectOptionsQuery.error,
          )}
        />
      ) : (
        <>
          <TeacherStatusBanner status={reportsStatus} />

          <TeacherCard
            title="Filters"
            subtitle="Choose the classroom and subject you want to review, then keep exports close when you need a file."
          >
            <Text style={styles.listMeta}>Classroom</Text>
            <View style={styles.actionGrid}>
              <Pressable
                style={[
                  styles.secondaryButton,
                  !selectedClassroomId ? styles.selectedActionButton : null,
                ]}
                onPress={() => setSelectedClassroomId("")}
              >
                <Text style={styles.secondaryButtonLabel}>All Classrooms</Text>
              </Pressable>
              {reports.filterOptions.classroomOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.secondaryButton,
                    selectedClassroomId === option.value ? styles.selectedActionButton : null,
                  ]}
                  onPress={() => setSelectedClassroomId(option.value)}
                >
                  <Text style={styles.secondaryButtonLabel}>{option.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.listMeta}>Subject</Text>
            <View style={styles.actionGrid}>
              <Pressable
                style={[
                  styles.secondaryButton,
                  !selectedSubjectId ? styles.selectedActionButton : null,
                ]}
                onPress={() => setSelectedSubjectId("")}
              >
                <Text style={styles.secondaryButtonLabel}>All Subjects</Text>
              </Pressable>
              {reports.filterOptions.subjectOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.secondaryButton,
                    selectedSubjectId === option.value ? styles.selectedActionButton : null,
                  ]}
                  onPress={() => setSelectedSubjectId(option.value)}
                >
                  <Text style={styles.secondaryButtonLabel}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.actionGrid}>
              <TeacherNavAction href={teacherRoutes.exports} label="Open Exports" />
            </View>
          </TeacherCard>

          <TeacherCard title="Overview" subtitle={reports.model.availabilityMessage}>
            <View style={styles.cardGrid}>
              {reports.model.summaryCards.map((card) => (
                <View key={card.label} style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{card.label}</Text>
                  <Text style={[styles.metricValue, toneColorStyle(card.tone)]}>{card.value}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.listMeta}>{reports.model.filterSummary}</Text>
            <Text style={styles.listMeta}>{reports.model.subjectSummary}</Text>
            <Text style={styles.listMeta}>{reports.model.studentSummary}</Text>
            <Text style={styles.listMeta}>{reports.model.daywiseSummary}</Text>
            <View style={styles.actionGrid}>
              <TeacherNavAction href={teacherRoutes.exports} label="Queue Export" />
              <TeacherNavAction href={teacherRoutes.sessionHistory} label="Session History" />
            </View>
          </TeacherCard>

          <TeacherCard
            title="Subject View"
            subtitle="Review each classroom and subject combination with one attendance summary card."
          >
            {reports.model.subjectRows.length ? (
              reports.model.subjectRows.map((row) => (
                <View key={`${row.classroomId}-${row.subjectId}`} style={styles.highlightCard}>
                  <Text style={styles.listTitle}>{row.subjectTitle}</Text>
                  <Text style={styles.listMeta}>
                    {row.classroomTitle} · {row.attendanceLabel}
                  </Text>
                  <Text style={[styles.listMeta, toneColorStyle(row.tone)]}>
                    {row.sessionSummary}
                  </Text>
                  <Text style={styles.listMeta}>{row.lastActivityLabel}</Text>
                </View>
              ))
            ) : (
              <TeacherEmptyCard label="No subject-wise report rows are available for the current filters." />
            )}
          </TeacherCard>

          <TeacherCard
            title="Student Follow-Up"
            subtitle="Use the student list to spot strong attendance first and follow-up work next."
          >
            {reports.model.studentRows.length ? (
              reports.model.studentRows.map((row) => (
                <View key={`${row.classroomId}-${row.studentId}`} style={styles.highlightCard}>
                  <Text style={styles.listTitle}>{row.studentDisplayName}</Text>
                  <Text style={styles.listMeta}>
                    {row.classroomTitle} · {row.subjectTitle} · {row.attendanceLabel}
                  </Text>
                  <Text style={[styles.listMeta, toneColorStyle(row.tone)]}>
                    {row.followUpLabel}
                  </Text>
                  <Text style={styles.listMeta}>{row.sessionSummary}</Text>
                  <Text style={styles.listMeta}>
                    {row.lastSessionAt
                      ? `Last class session ${formatDateTime(row.lastSessionAt)}`
                      : "No recent class session recorded"}
                  </Text>
                </View>
              ))
            ) : (
              <TeacherEmptyCard label="No student percentage rows are available for the current filters." />
            )}
          </TeacherCard>

          <TeacherCard
            title="Day-wise Trend"
            subtitle="Scan recent teaching days quickly before you decide whether to correct a session or export the data."
          >
            {reports.model.daywiseRows.length ? (
              reports.model.daywiseRows.map((row) => (
                <View key={`${row.classroomId}-${row.attendanceDate}`} style={styles.highlightCard}>
                  <Text style={styles.listTitle}>{row.classroomTitle}</Text>
                  <Text style={styles.listMeta}>
                    {formatDateTime(row.attendanceDate)} · {row.attendanceLabel}
                  </Text>
                  <Text style={[styles.listMeta, toneColorStyle(row.tone)]}>
                    {row.sessionSummary}
                  </Text>
                  <Text style={styles.listMeta}>{row.lastActivityLabel}</Text>
                </View>
              ))
            ) : (
              <TeacherEmptyCard label="No day-wise attendance rows are available for the current filters." />
            )}

            <View style={styles.actionGrid}>
              <TeacherNavAction href={teacherRoutes.exports} label="Open Exports" />
              <TeacherNavAction href={teacherRoutes.home} label="Home" />
            </View>
          </TeacherCard>
        </>
      )}
    </TeacherScreen>
  )
}
