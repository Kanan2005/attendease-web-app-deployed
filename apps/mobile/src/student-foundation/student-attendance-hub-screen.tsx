import { createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"
import type { AttendanceMode, TrustedDeviceAttendanceReadyResponse } from "@attendease/contracts"
import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { Ionicons } from "@expo/vector-icons"
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
import Animated, { FadeInDown } from "react-native-reanimated"

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
  StudentProfileButton,
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

const env = loadMobileEnv(process.env as Record<string, string | undefined>)

export function StudentAttendanceHubScreen() {
  const { draft, session } = useStudentSession()
  const c = getColors()
  const attendance = useStudentAttendanceOverview()
  const activeClassroomIds = (attendance.classroomsQuery.data ?? [])
    .filter((classroom) => classroom.enrollmentStatus === "ACTIVE")
    .map((classroom) => classroom.id)
  const refreshAttendance = useStudentRefreshAction({
    classroomIds: activeClassroomIds,
    ...(draft.installId ? { installId: draft.installId } : {}),
  })
  const [isRefreshingAttendance, setIsRefreshingAttendance] = useState(false)
  const refreshStatus = buildStudentAttendanceRefreshStatus({
    isRefreshing: isRefreshingAttendance,
    openAttendanceCount: attendance.overview.totalOpenSessions,
    mode: "ALL",
  })

  return (
    <StudentScreen
      title="Mark Attendance"
      subtitle="Choose how to check in."
      headerRight={<StudentProfileButton />}
    >
      {!session ? (
        <StudentSessionSetupCard />
      ) : attendance.meQuery.isLoading || attendance.classroomsQuery.isLoading ? (
        <StudentLoadingCard label="Loading attendance entry" />
      ) : attendance.meQuery.error || attendance.classroomsQuery.error ? (
        <StudentErrorCard
          label={mapStudentApiErrorToMessage(
            attendance.meQuery.error ?? attendance.classroomsQuery.error,
          )}
        />
      ) : (
        <>
          {/* Status Banner */}
          <Animated.View entering={FadeInDown.duration(300)}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 14,
                borderRadius: 14,
                backgroundColor: attendance.gateModel.canContinue ? c.successSoft : c.dangerSoft,
                borderWidth: 1.5,
                borderColor: attendance.gateModel.canContinue ? c.successBorder : c.dangerBorder,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: attendance.gateModel.canContinue ? c.success + "20" : c.danger + "20",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={attendance.gateModel.canContinue ? "shield-checkmark" : "shield-outline"}
                  size={20}
                  color={attendance.gateModel.canContinue ? c.success : c.danger}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>
                  {attendance.gateModel.title}
                </Text>
                <Text style={{ fontSize: 12, color: c.textMuted, lineHeight: 17 }}>
                  {attendance.gateModel.message}
                </Text>
              </View>
              {attendance.overview.totalOpenSessions > 0 ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.danger, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" }} />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>
                    {attendance.overview.totalOpenSessions} Live
                  </Text>
                </View>
              ) : null}
            </View>
          </Animated.View>
          {!attendance.gateModel.canContinue ? (
            <StudentNavAction href={studentRoutes.deviceStatus} label="Fix Device Status" icon="phone-portrait-outline" />
          ) : null}

          {/* Mode Selection Cards */}
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }}>Choose mode</Text>
              <Pressable
                disabled={isRefreshingAttendance}
                onPress={() =>
                  void (async () => {
                    setIsRefreshingAttendance(true)
                    try {
                      await refreshAttendance()
                    } finally {
                      setIsRefreshingAttendance(false)
                    }
                  })()
                }
                style={{ flexDirection: "row", alignItems: "center", gap: 4, opacity: isRefreshingAttendance ? 0.5 : 1 }}
              >
                <Ionicons name="refresh-outline" size={14} color={c.primary} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: c.primary }}>
                  {isRefreshingAttendance ? "Refreshing…" : "Refresh"}
                </Text>
              </Pressable>
            </View>

            <Animated.View entering={FadeInDown.duration(350).delay(50)}>
              <Link href={studentRoutes.qrAttendance} asChild>
                <Pressable
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    padding: 16,
                    borderRadius: 14,
                    backgroundColor: c.surfaceRaised,
                    borderWidth: 1,
                    borderColor: attendance.overview.qrReadyCount > 0 ? c.borderAccent : c.border,
                    ...mobileTheme.shadow.soft,
                  }}
                >
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 14,
                      backgroundColor: c.primarySoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="qr-code-outline" size={26} color={c.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }}>QR + GPS</Text>
                    <Text style={{ fontSize: 13, color: c.textMuted }}>Scan QR code and verify location</Text>
                    {attendance.overview.qrReadyCount > 0 ? (
                      <Text style={{ fontSize: 12, fontWeight: "700", color: c.success }}>
                        {attendance.overview.qrReadyCount} session{attendance.overview.qrReadyCount === 1 ? "" : "s"} ready
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={c.textSubtle} />
                </Pressable>
              </Link>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(350).delay(120)}>
              <Link href={studentRoutes.bluetoothAttendance} asChild>
                <Pressable
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    padding: 16,
                    borderRadius: 14,
                    backgroundColor: c.surfaceRaised,
                    borderWidth: 1,
                    borderColor: attendance.overview.bluetoothReadyCount > 0 ? c.borderAccent : c.border,
                    ...mobileTheme.shadow.soft,
                  }}
                >
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 14,
                      backgroundColor: c.accentSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="bluetooth-outline" size={26} color={c.accent} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }}>Bluetooth</Text>
                    <Text style={{ fontSize: 13, color: c.textMuted }}>Auto-detect teacher's beacon nearby</Text>
                    {attendance.overview.bluetoothReadyCount > 0 ? (
                      <Text style={{ fontSize: 12, fontWeight: "700", color: c.success }}>
                        {attendance.overview.bluetoothReadyCount} session{attendance.overview.bluetoothReadyCount === 1 ? "" : "s"} ready
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={c.textSubtle} />
                </Pressable>
              </Link>
            </Animated.View>
          </View>

          {/* Live Sessions */}
          {[...attendance.qrCandidates, ...attendance.bluetoothCandidates].length > 0 ? (
            <Animated.View entering={FadeInDown.duration(350).delay(180)}>
              <StudentCard
                title="Live Sessions"
                subtitle="Active sessions from your classrooms."
              >
                {[...attendance.qrCandidates, ...attendance.bluetoothCandidates].map((candidate) => (
                  <AttendanceCandidateRow key={candidate.sessionId} candidate={candidate} selected />
                ))}
              </StudentCard>
            </Animated.View>
          ) : null}

          <StudentNavAction href={studentRoutes.history} label="View Attendance History" icon="time-outline" />
        </>
      )}
    </StudentScreen>
  )
}
