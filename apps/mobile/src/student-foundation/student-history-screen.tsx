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
  useStudentClassroomDetailData,
  useStudentClassroomsQuery,
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

export function StudentHistoryScreen() {
  const { session, draft } = useStudentSession()
  const history = useStudentAttendanceHistoryData()
  const refreshStudentExperience = useStudentRefreshAction({
    installId: draft.installId,
  })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const historyStatus = buildStudentHistoryRefreshStatus({
    isLoading: history.historyQuery.isLoading,
    isRefreshing,
    recordCount: history.historyRows.length,
  })
  const historyInsight = buildStudentAttendanceInsightModel({
    attendancePercentage: history.historySummary.attendancePercentage,
    totalSessions: history.historySummary.totalRecords,
    presentSessions: history.historySummary.presentCount,
    absentSessions: history.historySummary.absentCount,
  })

  return (
    <StudentScreen
      title="Attendance History"
      subtitle="Review your recent attendance record by course."
    >
      {session ? <StudentStatusBanner status={historyStatus} /> : null}
      {!session ? (
        <StudentSessionSetupCard />
      ) : history.historyQuery.isLoading ? (
        <StudentLoadingCard label="Loading your attendance history" />
      ) : history.historyQuery.error ? (
        <StudentErrorCard label={mapStudentApiErrorToMessage(history.historyQuery.error)} />
      ) : history.historyRows.length ? (
        <>
          <StudentCard title={historyInsight.title} subtitle={historyInsight.message}>
            <View style={styles.cardGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Attendance</Text>
                <Text style={[styles.metricValue, toneColorStyle(historyInsight.tone)]}>
                  {history.historySummary.attendancePercentage}%
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Recorded Sessions</Text>
                <Text style={[styles.metricValue, styles.primaryTone]}>
                  {history.historySummary.totalRecords}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Present</Text>
                <Text style={[styles.metricValue, styles.successTone]}>
                  {history.historySummary.presentCount}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Absent</Text>
                <Text style={[styles.metricValue, styles.dangerTone]}>
                  {history.historySummary.absentCount}
                </Text>
              </View>
            </View>
            <Text style={styles.listMeta}>
              Last recorded session:{" "}
              {history.historySummary.lastRecordedAt
                ? formatDateTime(history.historySummary.lastRecordedAt)
                : "No attendance has been marked yet"}
            </Text>
            <Pressable
              style={styles.secondaryButton}
              disabled={isRefreshing}
              onPress={async () => {
                setIsRefreshing(true)
                try {
                  await refreshStudentExperience()
                } finally {
                  setIsRefreshing(false)
                }
              }}
            >
              <Text style={styles.secondaryButtonLabel}>
                {isRefreshing ? "Refreshing..." : "Refresh History"}
              </Text>
            </Pressable>
          </StudentCard>
          <StudentCard
            title="Recent Records"
            subtitle="Each row shows whether you were present or absent for that class session."
          >
            {history.historyRows.map((item) => (
              <View key={item.attendanceRecordId} style={styles.listRow}>
                <Text style={styles.listTitle}>{item.title}</Text>
                <Text style={styles.listMeta}>{item.subtitle}</Text>
                <Text style={[styles.bodyText, toneColorStyle(item.statusTone)]}>
                  {item.statusLabel} · {item.timeLabel}
                </Text>
                <Text style={styles.listMeta}>{item.detailLabel}</Text>
              </View>
            ))}
          </StudentCard>
        </>
      ) : (
        <StudentEmptyCard label="Your marked class sessions will appear here after attendance is recorded." />
      )}
    </StudentScreen>
  )
}
