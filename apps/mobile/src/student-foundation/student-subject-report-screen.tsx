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
  StudentCard,
  StudentDashboardSpotlightCard,
  StudentEmptyCard,
  StudentErrorCard,
  StudentLoadingCard,
  StudentNavAction,
  StudentQuickActions,
  StudentBackButton,
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

export function StudentSubjectReportScreen(props: { subjectId: string }) {
  const { session } = useStudentSession()
  const c = getColors()
  const report = useStudentSubjectReportData(props.subjectId)
  const subjectInsight = report.subjectReport
    ? buildStudentAttendanceInsightModel({
        attendancePercentage: report.subjectReport.attendancePercentage,
        totalSessions: report.subjectReport.totalSessions,
        presentSessions: report.subjectReport.presentSessions,
        absentSessions: report.subjectReport.absentSessions,
      })
    : null

  return (
    <StudentScreen
      title="Subject Report"
      subtitle="Attendance details for this subject."
    >
      <StudentBackButton label="Back" />
      {!session ? (
        <StudentSessionSetupCard />
      ) : report.subjectReportQuery.isLoading ? (
        <StudentLoadingCard label="Loading subject report" />
      ) : report.subjectReportQuery.error ? (
        <StudentErrorCard label={mapStudentApiErrorToMessage(report.subjectReportQuery.error)} />
      ) : !report.subjectReport ? (
        <StudentEmptyCard label="No data available yet." />
      ) : (
        <>
          <StudentCard
            title={report.subjectReport.subjectTitle}
            subtitle={`${report.subjectReport.subjectCode} · ${report.subjectReport.classroomCount} classroom${report.subjectReport.classroomCount === 1 ? "" : "s"}`}
          >
            {/* Progress Bar */}
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 32, fontWeight: "800", color: toneColorStyle(subjectInsight?.tone ?? "primary").color }}>
                  {report.subjectReport.attendancePercentage}%
                </Text>
                <Text style={{ fontSize: 13, color: c.textMuted }}>
                  {report.subjectReport.totalSessions} session{report.subjectReport.totalSessions === 1 ? "" : "s"}
                </Text>
              </View>
              <View style={{ height: 10, borderRadius: 5, backgroundColor: c.surfaceMuted, overflow: "hidden" }}>
                <View
                  style={{
                    height: 10,
                    borderRadius: 5,
                    width: `${Math.min(100, report.subjectReport.attendancePercentage)}%`,
                    backgroundColor: toneColorStyle(subjectInsight?.tone ?? "primary").color,
                  }}
                />
              </View>
              {subjectInsight?.message ? (
                <Text style={{ fontSize: 13, color: c.textMuted, lineHeight: 19 }}>
                  {subjectInsight.message}
                </Text>
              ) : null}
            </View>

            {/* Stats Row */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: c.successSoft,
                }}
              >
                <Ionicons name="checkmark-circle" size={18} color={c.success} />
                <View style={{ gap: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: c.success }}>
                    {report.subjectReport.presentSessions}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: c.success }}>Present</Text>
                </View>
              </View>
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: c.dangerSoft,
                }}
              >
                <Ionicons name="close-circle" size={18} color={c.danger} />
                <View style={{ gap: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: c.danger }}>
                    {report.subjectReport.absentSessions}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: c.danger }}>Absent</Text>
                </View>
              </View>
            </View>

            {report.subjectReport.lastSessionAt ? (
              <Text style={styles.listMeta}>
                Last session: {formatDateTime(report.subjectReport.lastSessionAt)}
              </Text>
            ) : null}
          </StudentCard>

          {report.subjectReport.classrooms.length > 0 ? (
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }}>
                Classrooms ({report.subjectReport.classrooms.length})
              </Text>
            </View>
          ) : null}
          {report.subjectReport.classrooms.map((card) => {
            const cardInsight = buildStudentAttendanceInsightModel({
              attendancePercentage: card.attendancePercentage,
              totalSessions: card.totalSessions,
              presentSessions: card.presentSessions,
              absentSessions: card.absentSessions,
            })
            const barColor = toneColorStyle(cardInsight.tone).color
            return (
              <StudentCard
                key={card.classroomId}
                title={card.classroomTitle}
                subtitle={card.classroomCode}
              >
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: barColor }}>
                      {card.attendancePercentage}%
                    </Text>
                    <Text style={{ fontSize: 12, color: c.textMuted }}>
                      {card.presentSessions}/{card.totalSessions} present
                    </Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surfaceMuted, overflow: "hidden" }}>
                    <View
                      style={{
                        height: 6,
                        borderRadius: 3,
                        width: `${Math.min(100, card.attendancePercentage)}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </View>
                </View>
                {card.lastSessionAt ? (
                  <Text style={styles.listMeta}>
                    Last session: {formatDateTime(card.lastSessionAt)}
                  </Text>
                ) : null}
              </StudentCard>
            )
          })}
        </>
      )}
    </StudentScreen>
  )
}
