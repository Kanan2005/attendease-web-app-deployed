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

export function TeacherDashboardScreen() {
  const { session } = useTeacherSession()
  const dashboard = useTeacherDashboardData()
  const firstClassroom = dashboard.classroomsQuery.data?.[0] ?? null
  const firstClassroomContext = firstClassroom
    ? teacherRoutes.classroomContext(firstClassroom.id)
    : null
  const dashboardError =
    dashboard.meQuery.error ??
    dashboard.assignmentsQuery.error ??
    dashboard.classroomsQuery.error ??
    dashboard.sessionsQuery.error
  const isLoading =
    dashboard.meQuery.isLoading ||
    dashboard.assignmentsQuery.isLoading ||
    dashboard.classroomsQuery.isLoading ||
    dashboard.sessionsQuery.isLoading
  const dashboardStatus = buildTeacherDashboardStatus({
    hasSession: Boolean(session),
    isLoading,
    errorMessage: dashboardError ? mapTeacherApiErrorToMessage(dashboardError) : null,
    classroomCount: dashboard.classroomsQuery.data?.length ?? 0,
    liveSessionCount: dashboard.model.recentSessions.filter((sessionItem) => sessionItem.isLive)
      .length,
    canCreateClassroom: dashboard.model.canCreateClassroom,
  })

  return (
    <TeacherScreen
      title={dashboard.model.greeting}
      subtitle="Run Bluetooth attendance, open classrooms, and keep session history close from one teacher home."
    >
      {!session ? (
        <TeacherSessionSetupCard />
      ) : isLoading ? (
        <TeacherLoadingCard label="Loading teacher home" />
      ) : dashboardError ? (
        <TeacherErrorCard label={mapTeacherApiErrorToMessage(dashboardError)} />
      ) : (
        <>
          <TeacherStatusBanner status={dashboardStatus} />

          <TeacherCard
            title={dashboard.model.spotlight.title}
            subtitle={dashboard.model.spotlight.message}
          >
            <View style={styles.actionGrid}>
              <TeacherNavAction
                href={resolveTeacherDashboardActionHref(
                  dashboard.model.spotlight.primaryAction,
                  firstClassroomContext,
                )}
                label={dashboard.model.spotlight.primaryAction.label}
                variant="primary"
              />
              {dashboard.model.spotlight.secondaryAction ? (
                <TeacherNavAction
                  href={resolveTeacherDashboardActionHref(
                    dashboard.model.spotlight.secondaryAction,
                    firstClassroomContext,
                  )}
                  label={dashboard.model.spotlight.secondaryAction.label}
                />
              ) : null}
            </View>
          </TeacherCard>

          <TeacherCard
            title="Go To"
            subtitle="Bluetooth attendance, classrooms, history, reports, and exports stay one tap away."
          >
            <View style={styles.actionGrid}>
              <TeacherNavAction
                href={
                  firstClassroomContext
                    ? firstClassroomContext.bluetoothCreate
                    : teacherRoutes.bluetoothCreate
                }
                label="Bluetooth Session"
                variant="primary"
              />
              <TeacherNavAction href={teacherRoutes.sessionHistory} label="Session History" />
              <TeacherNavAction href={teacherRoutes.classrooms} label="Classrooms" />
              <TeacherNavAction href={teacherRoutes.reports} label="Reports" />
              <TeacherNavAction href={teacherRoutes.exports} label="Exports" />
            </View>
          </TeacherCard>

          <TeacherCard
            title="Today At A Glance"
            subtitle="Stay oriented before class starts or while attendance is already live."
          >
            <View style={styles.cardGrid}>
              {dashboard.model.summaryCards.map((card) => (
                <View key={card.label} style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{card.label}</Text>
                  <Text style={[styles.metricValue, toneColorStyle(card.tone)]}>{card.value}</Text>
                </View>
              ))}
            </View>
          </TeacherCard>

          <TeacherCard
            title="Classrooms"
            subtitle="Open a classroom to manage students, schedule, stream updates, and Bluetooth attendance."
          >
            {dashboard.model.classroomHighlights.length ? (
              <>
                {dashboard.model.classroomHighlights.map((classroom) => {
                  const classroomContext = teacherRoutes.classroomContext(classroom.classroomId)

                  return (
                    <View key={classroom.classroomId} style={styles.highlightCard}>
                      <Text style={styles.listTitle}>{classroom.title}</Text>
                      <Text style={styles.listMeta}>{classroom.supportingText}</Text>
                      <Text style={styles.listMeta}>{classroom.sessionStateLabel}</Text>
                      <Text style={styles.listMeta}>{classroom.joinCodeLabel}</Text>
                      <View style={styles.actionGrid}>
                        <TeacherNavAction href={classroomContext.detail} label="Open" />
                        <TeacherNavAction
                          href={classroomContext.bluetoothCreate}
                          label="Bluetooth"
                        />
                        <TeacherNavAction href={classroomContext.roster} label="Roster" />
                        <TeacherNavAction href={classroomContext.schedule} label="Schedule" />
                      </View>
                    </View>
                  )
                })}
                <View style={styles.actionGrid}>
                  <TeacherNavAction href={teacherRoutes.classrooms} label="All Classrooms" />
                </View>
                {dashboard.model.canCreateClassroom ? (
                  <Text style={styles.listMeta}>
                    You can also create a classroom from the classroom list when you need a new
                    teaching space.
                  </Text>
                ) : null}
              </>
            ) : (
              <TeacherEmptyCard label="No classrooms are ready yet. Open Classrooms to review your assigned teaching spaces." />
            )}
          </TeacherCard>

          <TeacherCard
            title="Recent Sessions"
            subtitle="Jump back into a live session or review recent attendance counts."
          >
            {dashboard.model.recentSessions.length ? (
              dashboard.model.recentSessions.map((item) => (
                <Link key={item.id} href={teacherRoutes.sessionDetail(item.id)} asChild>
                  <Pressable style={styles.linkRow}>
                    <Text style={styles.listTitle}>{item.classroomTitle}</Text>
                    <Text style={styles.listMeta}>
                      {item.title} · {formatEnum(item.mode)} · {formatEnum(item.status)}
                    </Text>
                    <Text style={styles.listMeta}>
                      {item.presentCount} present / {item.absentCount} absent ·{" "}
                      {formatDateTime(item.timestamp)}
                    </Text>
                  </Pressable>
                </Link>
              ))
            ) : (
              <TeacherEmptyCard label="No attendance sessions yet. Start Bluetooth attendance when class begins." />
            )}
            <View style={styles.actionGrid}>
              <TeacherNavAction href={teacherRoutes.sessionHistory} label="Open Session History" />
            </View>
          </TeacherCard>
        </>
      )}
    </TeacherScreen>
  )
}
