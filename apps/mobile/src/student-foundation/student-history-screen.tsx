import { createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"
import type { AttendanceMode, TrustedDeviceAttendanceReadyResponse } from "@attendease/contracts"
import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
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
  StudentBackButton,
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
  const c = getColors()
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
    <StudentScreen title="Attendance History" subtitle="Your attendance record.">
      <StudentBackButton label="Back to Attendance" />
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
            {/* Attendance Progress Bar */}
            <View style={{ gap: 6 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: "800",
                    color: toneColorStyle(historyInsight.tone).color,
                  }}
                >
                  {history.historySummary.attendancePercentage}%
                </Text>
                <Pressable
                  disabled={isRefreshing}
                  onPress={async () => {
                    setIsRefreshing(true)
                    try {
                      await refreshStudentExperience()
                    } finally {
                      setIsRefreshing(false)
                    }
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    opacity: isRefreshing ? 0.5 : 1,
                  }}
                >
                  <Ionicons name="refresh-outline" size={14} color={c.primary} />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: c.primary }}>
                    {isRefreshing ? "Refreshing…" : "Refresh"}
                  </Text>
                </Pressable>
              </View>
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: c.surfaceMuted,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 8,
                    borderRadius: 4,
                    width: `${Math.min(100, history.historySummary.attendancePercentage)}%`,
                    backgroundColor: toneColorStyle(historyInsight.tone).color,
                  }}
                />
              </View>
            </View>

            <View style={styles.cardGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Sessions</Text>
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
            {history.historySummary.lastRecordedAt ? (
              <Text style={styles.listMeta}>
                Last recorded: {formatDateTime(history.historySummary.lastRecordedAt)}
              </Text>
            ) : null}
          </StudentCard>
          <StudentCard title="Recent Records">
            {history.historyRows.map((item) => {
              const isPresent = item.statusTone === "success"
              return (
                <View
                  key={item.attendanceRecordId}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                    paddingVertical: 10,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: c.border,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: isPresent ? c.successSoft : c.dangerSoft,
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 2,
                    }}
                  >
                    <Ionicons
                      name={isPresent ? "checkmark-circle" : "close-circle"}
                      size={20}
                      color={isPresent ? c.success : c.danger}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.listTitle}>{item.title}</Text>
                    <Text style={styles.listMeta}>{item.subtitle}</Text>
                    <Text style={[styles.bodyText, toneColorStyle(item.statusTone)]}>
                      {item.statusLabel} · {item.timeLabel}
                    </Text>
                    <Text style={styles.listMeta}>{item.detailLabel}</Text>
                  </View>
                </View>
              )
            })}
          </StudentCard>
        </>
      ) : (
        <StudentEmptyCard label="No attendance records yet." />
      )}
    </StudentScreen>
  )
}
