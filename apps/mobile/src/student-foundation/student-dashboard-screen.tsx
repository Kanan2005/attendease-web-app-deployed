import { createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"
import type { AttendanceMode, TrustedDeviceAttendanceReadyResponse } from "@attendease/contracts"
import { mobileTheme } from "@attendease/ui-mobile"
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "expo-router"
import { useEffect, useState } from "react"
import type { ComponentType, ReactNode } from "react"
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import { getMobileAttendanceListPollInterval } from "../attendance-live"
import {
  buildStudentBluetoothDetectionBanner,
  buildStudentBluetoothScannerBanner,
  buildStudentBluetoothSubmissionBanner,
  describeBluetoothSignalStrength,
  mapBluetoothAvailabilityToPermissionState,
  resolveSelectedBluetoothDetection,
  usePreferredBluetoothDetection,
  useStudentBluetoothMarkAttendanceMutation,
  useStudentBluetoothScanner,
} from "../bluetooth-attendance"
import { buildStudentAttendanceGateModel, createMobileDeviceTrustBootstrap } from "../device-trust"
import { mobileEntryRoutes } from "../mobile-entry-models"
import {
  type StudentAttendancePermissionState,
  type StudentQrLocationSnapshot,
  type StudentQrLocationState,
  buildStudentAttendanceControllerSnapshot,
  buildStudentBluetoothAttendanceErrorBanner,
  buildStudentBluetoothMarkRequest,
  buildStudentQrAttendanceErrorBanner,
  buildStudentQrLocationBanner,
  buildStudentQrMarkRequest,
  buildStudentQrScanBanner,
  resolveStudentQrCameraPermissionState,
  studentAttendancePermissionStateValues,
} from "../student-attendance"
import {
  type CardTone,
  type StudentDashboardActionModel,
  buildStudentDashboardModel,
  buildStudentLectureTimeline,
  mapStudentApiErrorToMessage,
} from "../student-models"
import {
  buildStudentInvalidationKeys,
  invalidateStudentExperienceQueries,
  requireStudentAccessToken,
  studentQueryKeys,
  useStudentRefreshAction,
} from "../student-query"
import { studentRoutes } from "../student-routes"
import { useStudentSession } from "../student-session"
import {
  type StudentScreenStatus,
  buildStudentAttendanceRefreshStatus,
  buildStudentDashboardStatus,
  buildStudentHistoryRefreshStatus,
  buildStudentJoinBanner,
  buildStudentReportsStatus,
} from "../student-view-state"
import {
  type StudentAttendanceCandidate,
  type StudentProfileDraft,
  buildStudentAttendanceCandidates,
  buildStudentAttendanceHistoryRows,
  buildStudentAttendanceHistorySummaryModel,
  buildStudentAttendanceInsightModel,
  buildStudentAttendanceOverviewModel,
  buildStudentClassroomDetailSummaryModel,
  buildStudentCourseDiscoveryCards,
  buildStudentDeviceStatusSummaryModel,
  buildStudentReportOverviewModel,
  buildStudentScheduleOverviewModel,
  buildStudentSubjectReportModel,
  buildStudentSubjectReportSummaryModel,
  createStudentProfileDraft,
  hasStudentProfileDraftChanges,
  normalizeStudentProfileDraft,
} from "../student-workflow-models"

import {
  useStudentAttendanceController,
  useStudentAttendanceHistoryData,
  useStudentAttendanceOverview,
  useStudentAttendanceReadyQuery,
  useStudentClassroomAnnouncementsQuery,
  useStudentClassroomDetailData,
  useStudentClassroomsQuery,
  useStudentCourseDiscoveryData,
  useStudentDashboardData,
  useStudentJoinClassroomMutation,
  useStudentLiveAttendanceSessionsQuery,
  useStudentMeQuery,
  useStudentQrMarkAttendanceMutation,
  useStudentReportsData,
  useStudentSubjectReportData,
} from "./queries"
import {
  AnnouncementRow,
  AttendanceCandidateRow,
  StudentCard,
  StudentDashboardSpotlightCard,
  StudentEmptyCard,
  StudentErrorCard,
  StudentLoadingCard,
  StudentNavAction,
  StudentQuickActions,
  StudentScreen,
  StudentSessionSetupCard,
  StudentStatusBanner,
  formatAttendanceMode,
  formatDateTime,
  formatEnum,
  resolveStudentDashboardActionHref,
  spotlightToneStyle,
  styles,
  toneColorStyle,
} from "./shared-ui"

export function StudentDashboardScreen() {
  const { session } = useStudentSession()
  const dashboard = useStudentDashboardData()
  const attendance = useStudentAttendanceOverview()
  const dashboardModel = buildStudentDashboardModel({
    me: dashboard.meQuery.data ?? null,
    classrooms: dashboard.classroomsQuery.data ?? [],
    recentTimeline: dashboard.recentTimelineQuery.timeline,
    attendanceOverview: attendance.overview,
    attendanceGate: attendance.gateModel,
  })
  const openAttendanceCandidates = [
    ...attendance.qrCandidates,
    ...attendance.bluetoothCandidates,
  ].sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
  const dashboardStatus = buildStudentDashboardStatus({
    hasSession: Boolean(session),
    isLoading:
      dashboard.meQuery.isLoading ||
      dashboard.classroomsQuery.isLoading ||
      attendance.attendanceReadyQuery.isLoading,
    errorMessage:
      dashboard.meQuery.error ||
      dashboard.classroomsQuery.error ||
      dashboard.recentTimelineQuery.error
        ? mapStudentApiErrorToMessage(
            dashboard.meQuery.error ??
              dashboard.classroomsQuery.error ??
              dashboard.recentTimelineQuery.error,
          )
        : null,
    classroomCount: dashboard.classroomsQuery.data?.length ?? 0,
    recentLectureCount: dashboardModel.recentTimeline.length,
    openAttendanceCount: attendance.overview.totalOpenSessions,
    attendanceBlocked: Boolean(session) && !attendance.gateModel.canContinue,
  })

  return (
    <StudentScreen
      title={dashboardModel.greeting}
      subtitle="See your classrooms, attendance windows, and progress in one place."
    >
      <StudentStatusBanner status={dashboardStatus} />
      {!session ? (
        <StudentSessionSetupCard />
      ) : dashboard.meQuery.isLoading ||
        dashboard.classroomsQuery.isLoading ||
        attendance.attendanceReadyQuery.isLoading ? (
        <StudentLoadingCard label="Loading your home" />
      ) : dashboard.meQuery.error ||
        dashboard.classroomsQuery.error ||
        dashboard.recentTimelineQuery.error ? (
        <StudentErrorCard
          label={mapStudentApiErrorToMessage(
            dashboard.meQuery.error ??
              dashboard.classroomsQuery.error ??
              dashboard.recentTimelineQuery.error,
          )}
        />
      ) : (
        <>
          <StudentDashboardSpotlightCard spotlight={dashboardModel.spotlight} />

          {attendance.gateModel.canContinue && openAttendanceCandidates.length > 0 ? (
            <StudentCard
              title="Open attendance now"
              subtitle="Choose the classroom that is ready right now, then move straight into marking attendance."
            >
              {openAttendanceCandidates.slice(0, 4).map((candidate) => (
                <AttendanceCandidateRow
                  key={`${candidate.mode}:${candidate.sessionId}`}
                  candidate={candidate}
                  selected={false}
                />
              ))}
              <View style={styles.actionGrid}>
                <StudentNavAction href={studentRoutes.attendance} label="Open attendance" />
              </View>
            </StudentCard>
          ) : null}

          <StudentCard
            title="Your classrooms"
            subtitle="Open a classroom to check updates, schedule, and subject attendance."
          >
            {dashboardModel.classroomHighlights.length > 0 ? (
              dashboardModel.classroomHighlights.slice(0, 3).map((classroom) => (
                <Link
                  key={classroom.classroomId}
                  href={studentRoutes.classroomDetail(classroom.classroomId)}
                  asChild
                >
                  <Pressable style={styles.linkRow}>
                    <Text style={[styles.listTitle, toneColorStyle(classroom.tone)]}>
                      {classroom.title}
                    </Text>
                    <Text style={styles.listMeta}>{classroom.supportingText}</Text>
                  </Pressable>
                </Link>
              ))
            ) : (
              <StudentEmptyCard label="Join a classroom to unlock updates, schedule, attendance, and reports." />
            )}
            {dashboardModel.classroomHighlights.length > 0 ? (
              <View style={styles.actionGrid}>
                <StudentNavAction href={studentRoutes.classrooms} label="All classrooms" />
              </View>
            ) : null}
          </StudentCard>

          <StudentCard
            title="Today at a glance"
            subtitle="Keep an eye on classroom access, attendance windows, and device status."
          >
            <View style={styles.cardGrid}>
              {dashboardModel.summaryCards.map((card) => (
                <View key={card.label} style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{card.label}</Text>
                  <Text style={[styles.metricValue, toneColorStyle(card.tone)]}>{card.value}</Text>
                </View>
              ))}
            </View>
          </StudentCard>

          <StudentQuickActions />

          <StudentCard
            title="Recent updates"
            subtitle="Review recent class sessions and updates from your joined classrooms."
          >
            {dashboardModel.recentTimeline.length === 0 ? (
              <StudentEmptyCard label="No recent classroom activity is available yet." />
            ) : (
              dashboardModel.recentTimeline.map((item) => (
                <View key={item.id} style={styles.listRow}>
                  <Text style={styles.listTitle}>{item.title}</Text>
                  <Text style={styles.listMeta}>
                    {item.classroomTitle} · {formatDateTime(item.timestamp)} ·{" "}
                    {formatEnum(item.status)}
                  </Text>
                </View>
              ))
            )}
          </StudentCard>
        </>
      )}
    </StudentScreen>
  )
}
