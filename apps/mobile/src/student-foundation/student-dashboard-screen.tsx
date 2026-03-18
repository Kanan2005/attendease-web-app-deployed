import { createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"
import type { AttendanceMode, TrustedDeviceAttendanceReadyResponse } from "@attendease/contracts"
import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "expo-router"
import { useEffect, useState } from "react"
import type React from "react"
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
  useStudentClassroomAnnouncementsQuery,
  useStudentClassroomDetailData,
  useStudentClassroomsQuery,
  useStudentCourseDiscoveryData,
  useStudentDashboardData,
  useStudentDeviceRegistrationMutation,
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
  StudentProfileButton,
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
  const { session, deviceReady } = useStudentSession()
  const c = getColors()
  const dashboard = useStudentDashboardData()
  const attendance = useStudentAttendanceOverview()
  const deviceRegistration = useStudentDeviceRegistrationMutation()

  // Trigger device registration once when session + device identity are ready.
  // This confirms/creates the binding post-login so the device is trusted.
  useEffect(() => {
    if (session && deviceReady && !deviceRegistration.isPending && !deviceRegistration.isSuccess) {
      deviceRegistration.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, deviceReady])
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
      subtitle="Your classrooms, attendance, and progress at a glance."
      headerRight={<StudentProfileButton />}
    >
      <StudentStatusBanner status={dashboardStatus} />
      {!attendance.gateModel.canContinue && session && !dashboard.meQuery.isLoading ? (
        <Animated.View entering={FadeInDown.duration(350).delay(50)}>
          <View
            style={{
              backgroundColor: c.warningSoft,
              borderRadius: 14,
              padding: 14,
              gap: 8,
              borderWidth: 1.5,
              borderColor: c.warningBorder,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.warning + "20", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="shield-outline" size={20} color={c.warning} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>
                {attendance.gateModel.title}
              </Text>
              <Text style={{ fontSize: 12, color: c.textMuted, lineHeight: 17 }}>
                {attendance.gateModel.supportHint}
              </Text>
            </View>
            <Link href={studentRoutes.deviceStatus} asChild>
              <Pressable style={{ paddingHorizontal: 12, paddingVertical: 7, backgroundColor: c.warning + "20", borderRadius: 10, borderWidth: 1, borderColor: c.warning + "40" }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: c.warning }}>Fix</Text>
              </Pressable>
            </Link>
          </View>
        </Animated.View>
      ) : null}
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
            <Animated.View entering={FadeInDown.duration(400).delay(100)}>
              <View style={{
                borderRadius: 16,
                backgroundColor: c.dangerSoft,
                borderWidth: 1.5,
                borderColor: c.dangerBorder,
                padding: 16,
                gap: 12,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.danger }} />
                  <Text style={{ fontSize: 16, fontWeight: "800", color: c.text }}>
                    Live now
                  </Text>
                  <Text style={{ fontSize: 13, color: c.textMuted }}>
                    {openAttendanceCandidates.length} session{openAttendanceCandidates.length === 1 ? '' : 's'}
                  </Text>
                </View>
                {openAttendanceCandidates.slice(0, 3).map((candidate, i) => {
                  const isQr = candidate.mode === "QR_GPS"
                  return (
                    <Animated.View key={`${candidate.mode}:${candidate.sessionId}`} entering={FadeInDown.duration(300).delay(150 + i * 80)}>
                      <Link
                        href={isQr
                          ? studentRoutes.qrAttendanceFromClassroom(candidate.classroomId ?? "")
                          : studentRoutes.bluetoothAttendanceFromClassroom(candidate.classroomId ?? "")
                        }
                        asChild
                      >
                        <Pressable
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                            padding: 12,
                            borderRadius: 12,
                            backgroundColor: c.surfaceRaised,
                            borderWidth: 1,
                            borderColor: c.border,
                          }}
                        >
                          <View
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 12,
                              backgroundColor: isQr ? c.primarySoft : c.accentSoft,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Ionicons name={isQr ? "qr-code-outline" : "bluetooth-outline"} size={20} color={isQr ? c.primary : c.accent} />
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }} numberOfLines={1}>
                              {candidate.classroomTitle}
                            </Text>
                            <Text style={{ fontSize: 12, color: c.textMuted }} numberOfLines={1}>
                              {formatAttendanceMode(candidate.mode)} · {formatDateTime(candidate.timestamp)}
                            </Text>
                          </View>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              backgroundColor: c.danger,
                              borderRadius: 10,
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>Mark</Text>
                            <Ionicons name="arrow-forward" size={12} color="#fff" />
                          </View>
                        </Pressable>
                      </Link>
                    </Animated.View>
                  )
                })}
              </View>
            </Animated.View>
          ) : null}

          <StudentQuickActions />

          <StudentCard
            title={`Your classrooms (${dashboardModel.classroomHighlights.length})`}
          >
            {dashboardModel.classroomHighlights.length > 0 ? (
              dashboardModel.classroomHighlights.slice(0, 4).map((classroom, i) => {
                const initial = classroom.title.charAt(0).toUpperCase()
                return (
                  <Link
                    key={classroom.classroomId}
                    href={studentRoutes.classroomDetail(classroom.classroomId)}
                    asChild
                  >
                    <Pressable
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        paddingVertical: 12,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: c.border,
                      }}
                    >
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          backgroundColor: classroom.tone === "success" ? c.successSoft : c.primarySoft,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "800",
                            color: classroom.tone === "success" ? c.success : c.primary,
                          }}
                        >
                          {initial}
                        </Text>
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 15, fontWeight: "600", color: c.text }} numberOfLines={1}>
                          {classroom.title}
                        </Text>
                        <Text style={{ fontSize: 12, color: c.textMuted }} numberOfLines={1}>
                          {classroom.supportingText}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={c.textSubtle} />
                    </Pressable>
                  </Link>
                )
              })
            ) : (
              <StudentEmptyCard label="No classrooms yet. Tap Join to get started." />
            )}
            {dashboardModel.classroomHighlights.length > 0 ? (
              <View style={[styles.actionGrid, { marginTop: 4 }]}>
                <StudentNavAction href={studentRoutes.classrooms} label="All classrooms" icon="library-outline" />
                <StudentNavAction href={studentRoutes.join} label="Join new" icon="enter-outline" />
              </View>
            ) : null}
          </StudentCard>

          <StudentCard title="Today at a glance">
            <View style={styles.cardGrid}>
              {dashboardModel.summaryCards.map((card) => {
                const iconName: React.ComponentProps<typeof Ionicons>["name"] =
                  card.label.toLowerCase().includes("class") ? "library-outline"
                  : card.label.toLowerCase().includes("present") ? "checkmark-circle-outline"
                  : card.label.toLowerCase().includes("absent") ? "close-circle-outline"
                  : card.label.toLowerCase().includes("session") ? "time-outline"
                  : "stats-chart-outline"
                return (
                  <View key={card.label} style={styles.metricCard}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name={iconName} size={13} color={c.textSubtle} />
                      <Text style={styles.metricLabel}>{card.label}</Text>
                    </View>
                    <Text style={[styles.metricValue, toneColorStyle(card.tone)]}>{card.value}</Text>
                  </View>
                )
              })}
            </View>
          </StudentCard>

          <StudentCard title="Recent activity">
            {dashboardModel.recentTimeline.length === 0 ? (
              <StudentEmptyCard label="No recent activity yet." />
            ) : (
              dashboardModel.recentTimeline.map((item) => {
                const isCompleted = item.status === "COMPLETED"
                const isCancelled = item.status === "CANCELLED"
                const iconName: React.ComponentProps<typeof Ionicons>["name"] = isCompleted ? "checkmark-circle" : isCancelled ? "close-circle" : "time-outline"
                const iconColor = isCompleted ? c.success : isCancelled ? c.danger : c.primary
                const iconBg = isCompleted ? c.successSoft : isCancelled ? c.dangerSoft : c.primarySoft
                return (
                  <View key={item.id} style={styles.timelineRow}>
                    <View style={[styles.timelineIcon, { backgroundColor: iconBg }]}>
                      <Ionicons name={iconName} size={16} color={iconColor} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.listTitle}>{item.title}</Text>
                      <Text style={styles.listMeta}>
                        {item.classroomTitle} · {formatDateTime(item.timestamp)}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: "600", color: iconColor }}>
                        {formatEnum(item.status)}
                      </Text>
                    </View>
                  </View>
                )
              })
            )}
          </StudentCard>
        </>
      )}
    </StudentScreen>
  )
}
