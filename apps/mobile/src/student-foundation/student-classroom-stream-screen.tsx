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

export function StudentClassroomStreamScreen(props: { classroomId: string }) {
  const { session } = useStudentSession()
  const classroom = useStudentClassroomDetailData(props.classroomId)
  const streamQuery = useStudentClassroomAnnouncementsQuery(props.classroomId, 20)

  return (
    <StudentScreen
      title="Classroom Stream"
      subtitle="Student-visible classroom announcements are shown here in reverse chronological order."
    >
      {!session ? (
        <StudentSessionSetupCard />
      ) : classroom.detailQuery.isLoading || streamQuery.isLoading ? (
        <StudentLoadingCard label="Loading classroom stream" />
      ) : classroom.detailQuery.error || streamQuery.error ? (
        <StudentErrorCard
          label={mapStudentApiErrorToMessage(classroom.detailQuery.error ?? streamQuery.error)}
        />
      ) : (
        <>
          <StudentCard
            title={classroom.detailQuery.data?.displayTitle ?? "Classroom"}
            subtitle="Teacher-only posts stay hidden from this student route."
          >
            <View style={styles.actionGrid}>
              <StudentNavAction
                href={studentRoutes.classroomDetail(props.classroomId)}
                label="Back To Classroom"
              />
              <StudentNavAction
                href={studentRoutes.classroomSchedule(props.classroomId)}
                label="Open Schedule"
              />
            </View>
          </StudentCard>
          {streamQuery.data?.length ? (
            <StudentCard
              title="Announcement Feed"
              subtitle="Roster-import results and notify-on-post announcements will also appear here when student-visible."
            >
              {streamQuery.data.map((announcement) => (
                <AnnouncementRow key={announcement.id} announcement={announcement} />
              ))}
            </StudentCard>
          ) : (
            <StudentEmptyCard label="No student-visible announcements are available for this classroom yet." />
          )}
        </>
      )}
    </StudentScreen>
  )
}
