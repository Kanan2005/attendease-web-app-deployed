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

export function StudentClassroomScheduleScreen(props: { classroomId: string }) {
  const { session } = useStudentSession()
  const classroom = useStudentClassroomDetailData(props.classroomId)
  const scheduleModel = buildStudentScheduleOverviewModel({
    schedule: classroom.scheduleQuery.data ?? null,
    lectures: classroom.lecturesQuery.data ?? [],
  })

  return (
    <StudentScreen
      title="Classroom Schedule"
      subtitle="Your weekly class schedule."
    >
      {!session ? (
        <StudentSessionSetupCard />
      ) : classroom.detailQuery.isLoading ||
        classroom.scheduleQuery.isLoading ||
        classroom.lecturesQuery.isLoading ? (
        <StudentLoadingCard label="Loading classroom schedule" />
      ) : classroom.detailQuery.error ||
        classroom.scheduleQuery.error ||
        classroom.lecturesQuery.error ? (
        <StudentErrorCard
          label={mapStudentApiErrorToMessage(
            classroom.detailQuery.error ??
              classroom.scheduleQuery.error ??
              classroom.lecturesQuery.error,
          )}
        />
      ) : (
        <>
          <StudentCard
            title={classroom.detailQuery.data?.displayTitle ?? "Classroom"}
          >
            <View style={styles.actionGrid}>
              <StudentNavAction
                href={studentRoutes.classroomDetail(props.classroomId)}
                label="Back To Classroom"
                icon="arrow-back-outline"
              />
              <StudentNavAction
                href={studentRoutes.classroomStream(props.classroomId)}
                label="Open Stream"
                icon="chatbubble-ellipses-outline"
              />
            </View>
          </StudentCard>

          <StudentCard
            title="Weekly Plan"
          >
            {scheduleModel.weeklyItems.length ? (
              scheduleModel.weeklyItems.map((item) => (
                <View key={item.id} style={styles.listRow}>
                  <Text style={styles.listTitle}>{item.weekdayLabel}</Text>
                  <Text style={styles.listMeta}>
                    {item.timeLabel}
                    {item.locationLabel ? ` · ${item.locationLabel}` : ""}
                  </Text>
                </View>
              ))
            ) : (
              <StudentEmptyCard label="No weekly slots yet." />
            )}
          </StudentCard>

          <StudentCard
            title="Exceptions"
            subtitle="Date-specific changes to the regular schedule."
          >
            {scheduleModel.exceptionItems.length ? (
              scheduleModel.exceptionItems.map((item) => (
                <View key={item.id} style={styles.listRow}>
                  <Text style={[styles.listTitle, toneColorStyle(item.tone)]}>{item.title}</Text>
                  <Text style={styles.listMeta}>
                    {item.effectiveDateLabel} · {item.timeLabel}
                    {item.locationLabel ? ` · ${item.locationLabel}` : ""}
                  </Text>
                  {item.reason ? <Text style={styles.bodyText}>{item.reason}</Text> : null}
                </View>
              ))
            ) : (
              <StudentEmptyCard label="No exceptions scheduled." />
            )}
          </StudentCard>

          <StudentCard
            title="Upcoming Lectures"
          >
            {scheduleModel.upcomingLectures.length ? (
              scheduleModel.upcomingLectures.map((lecture) => (
                <View key={lecture.id} style={styles.listRow}>
                  <Text style={styles.listTitle}>{lecture.title}</Text>
                  <Text style={styles.listMeta}>
                    {lecture.timeLabel} · {formatEnum(lecture.status)}
                  </Text>
                </View>
              ))
            ) : (
              <StudentEmptyCard label="No upcoming lectures." />
            )}
          </StudentCard>
        </>
      )}
    </StudentScreen>
  )
}
