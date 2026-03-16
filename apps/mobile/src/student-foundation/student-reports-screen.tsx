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

export function StudentReportsScreen() {
  const { session } = useStudentSession()
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
    <StudentScreen
      title="Reports"
      subtitle="Understand your attendance quickly across all courses and subjects."
    >
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
      ) : reports.reportOverview ? (
        <>
          <StudentCard
            title={reportOverviewInsight?.title ?? "Attendance overview"}
            subtitle={reportOverviewInsight?.message ?? "Your overall attendance summary."}
          >
            <View style={styles.cardGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Overall Attendance</Text>
                <Text
                  style={[
                    styles.metricValue,
                    toneColorStyle(reportOverviewInsight?.tone ?? "primary"),
                  ]}
                >
                  {reports.reportOverview.attendancePercentage}%
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Tracked Classrooms</Text>
                <Text style={[styles.metricValue, styles.primaryTone]}>
                  {reports.reportOverview.trackedClassroomCount}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Present Sessions</Text>
                <Text style={[styles.metricValue, styles.successTone]}>
                  {reports.reportOverview.presentSessions}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Absent Sessions</Text>
                <Text style={[styles.metricValue, styles.dangerTone]}>
                  {reports.reportOverview.absentSessions}
                </Text>
              </View>
            </View>
            <Text style={styles.listMeta}>
              Total sessions: {reports.reportOverview.totalSessions}
            </Text>
            <Text style={styles.listMeta}>
              Last recorded session:{" "}
              {reports.reportOverview.lastSessionAt
                ? formatDateTime(reports.reportOverview.lastSessionAt)
                : "No attendance sessions yet"}
            </Text>
          </StudentCard>

          {reports.subjectReports.length ? (
            reports.subjectReports.map((subjectReport) => (
              <Link
                key={subjectReport.subjectId}
                href={studentRoutes.subjectReport(subjectReport.subjectId)}
                asChild
              >
                <Pressable style={styles.card}>
                  <Text style={styles.cardTitle}>{subjectReport.subjectTitle}</Text>
                  <Text style={styles.cardSubtitle}>
                    {subjectReport.subjectCode} · {subjectReport.classroomCount} classroom
                    {subjectReport.classroomCount === 1 ? "" : "s"}
                  </Text>
                  <View style={styles.cardBody}>
                    {(() => {
                      const insight = buildStudentAttendanceInsightModel({
                        attendancePercentage: subjectReport.attendancePercentage,
                        totalSessions: subjectReport.totalSessions,
                        presentSessions: subjectReport.presentSessions,
                        absentSessions: subjectReport.absentSessions,
                      })

                      return (
                        <>
                          <Text style={[styles.bodyText, toneColorStyle(insight.tone)]}>
                            {subjectReport.attendancePercentage}% attendance
                          </Text>
                          <Text style={styles.listMeta}>{insight.message}</Text>
                        </>
                      )
                    })()}
                    <Text style={styles.listMeta}>
                      Last session:{" "}
                      {subjectReport.lastSessionAt
                        ? formatDateTime(subjectReport.lastSessionAt)
                        : "No attendance sessions yet"}
                    </Text>
                    <Text style={styles.listMeta}>
                      Open this subject to compare attendance across classrooms.
                    </Text>
                  </View>
                </Pressable>
              </Link>
            ))
          ) : (
            <StudentEmptyCard label="Join a classroom and attend recorded sessions to unlock subject-wise attendance reports." />
          )}
        </>
      ) : null}
    </StudentScreen>
  )
}
