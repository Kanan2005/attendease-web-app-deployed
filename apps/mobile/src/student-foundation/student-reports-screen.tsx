import { createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"
import type { AttendanceMode, TrustedDeviceAttendanceReadyResponse } from "@attendease/contracts"
import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { StatCard } from "@attendease/ui-mobile/animated"
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

export function StudentReportsScreen() {
  const { session } = useStudentSession()
  const c = getColors()
  const reports = useStudentReportsData()
  const reportStatus = buildStudentReportsStatus({
    hasSession: Boolean(session),
    isLoading: reports.overviewQuery.isLoading || reports.subjectReportsQuery.isLoading,
    subjectCount: reports.subjectReports.length,
    classroomCount: reports.reportOverview?.trackedClassroomCount ?? 0,
  })
  const reportOverviewInsight = reports.reportOverview
    ? buildStudentAttendanceInsightModel({
        attendancePercentage: reports.reportOverview.attendancePercentage,
        totalSessions: reports.reportOverview.totalSessions,
        presentSessions: reports.reportOverview.presentSessions,
        absentSessions: reports.reportOverview.absentSessions,
      })
    : null

  return (
    <StudentScreen title="Reports" subtitle="Attendance breakdown by subject.">
      <StudentStatusBanner status={reportStatus} />
      {!session ? (
        <StudentSessionSetupCard />
      ) : reports.overviewQuery.isLoading || reports.subjectReportsQuery.isLoading ? (
        <StudentLoadingCard label="Loading attendance reports" />
      ) : reports.overviewQuery.error || reports.subjectReportsQuery.error ? (
        <StudentErrorCard
          label={mapStudentApiErrorToMessage(
            reports.overviewQuery.error ?? reports.subjectReportsQuery.error,
          )}
        />
      ) : !reports.reportOverview && reports.subjectReports.length === 0 ? (
        <StudentEmptyCard label="No attendance data yet. Reports will appear after your first class session." />
      ) : reports.reportOverview ? (
        <>
          <StudentCard
            title={reportOverviewInsight?.title ?? "Attendance overview"}
            subtitle={reportOverviewInsight?.message ?? "Your overall attendance summary."}
          >
            {/* Progress Bar */}
            <View style={{ gap: 6 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: "800",
                    color: toneColorStyle(reportOverviewInsight?.tone ?? "primary").color,
                  }}
                >
                  {reports.reportOverview.attendancePercentage}%
                </Text>
                <Text style={{ fontSize: 13, color: c.textMuted }}>
                  {reports.reportOverview.totalSessions} session
                  {reports.reportOverview.totalSessions === 1 ? "" : "s"}
                </Text>
              </View>
              <View
                style={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: c.surfaceMuted,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 10,
                    borderRadius: 5,
                    width: `${Math.min(100, reports.reportOverview.attendancePercentage)}%`,
                    backgroundColor: toneColorStyle(reportOverviewInsight?.tone ?? "primary").color,
                  }}
                />
              </View>
            </View>

            <View style={styles.cardGrid}>
              <StatCard
                label="Classrooms"
                value={reports.reportOverview.trackedClassroomCount}
                tone="primary"
                index={0}
              />
              <StatCard
                label="Present"
                value={reports.reportOverview.presentSessions}
                tone="success"
                index={1}
              />
              <StatCard
                label="Absent"
                value={reports.reportOverview.absentSessions}
                tone="danger"
                index={2}
              />
            </View>
            {reports.reportOverview.lastSessionAt ? (
              <Text style={styles.listMeta}>
                Last recorded: {formatDateTime(reports.reportOverview.lastSessionAt)}
              </Text>
            ) : null}
          </StudentCard>

          {reports.subjectReports.length ? (
            <>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }}>
                  Subjects ({reports.subjectReports.length})
                </Text>
              </View>
              {reports.subjectReports.map((subjectReport) => {
                const insight = buildStudentAttendanceInsightModel({
                  attendancePercentage: subjectReport.attendancePercentage,
                  totalSessions: subjectReport.totalSessions,
                  presentSessions: subjectReport.presentSessions,
                  absentSessions: subjectReport.absentSessions,
                })
                const barColor = toneColorStyle(insight.tone).color
                return (
                  <Link
                    key={subjectReport.subjectId}
                    href={studentRoutes.subjectReport(subjectReport.subjectId)}
                    asChild
                  >
                    <Pressable style={styles.card}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: c.primarySoft,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons name="book-outline" size={22} color={c.primary} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.cardTitle}>{subjectReport.subjectTitle}</Text>
                          <Text style={styles.cardSubtitle}>
                            {subjectReport.subjectCode} · {subjectReport.classroomCount} classroom
                            {subjectReport.classroomCount === 1 ? "" : "s"}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end", gap: 2 }}>
                          <Text style={{ fontSize: 18, fontWeight: "800", color: barColor }}>
                            {subjectReport.attendancePercentage}%
                          </Text>
                          <Text style={{ fontSize: 11, color: c.textMuted }}>
                            {subjectReport.presentSessions}/{subjectReport.totalSessions}
                          </Text>
                        </View>
                      </View>
                      {/* Mini progress bar */}
                      <View
                        style={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: c.surfaceMuted,
                          overflow: "hidden",
                        }}
                      >
                        <View
                          style={{
                            height: 6,
                            borderRadius: 3,
                            width: `${Math.min(100, subjectReport.attendancePercentage)}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </View>
                    </Pressable>
                  </Link>
                )
              })}
            </>
          ) : (
            <StudentEmptyCard label="No report data yet." />
          )}
        </>
      ) : null}
    </StudentScreen>
  )
}
