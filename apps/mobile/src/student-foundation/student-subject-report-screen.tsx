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

export function StudentSubjectReportScreen(props: { subjectId: string }) {
  const { session } = useStudentSession()
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
      subtitle="Review your attendance for this subject and each classroom you attend it in."
    >
      {!session ? (
        <StudentSessionSetupCard />
      ) : report.subjectReportQuery.isLoading ? (
        <StudentLoadingCard label="Loading subject report" />
      ) : report.subjectReportQuery.error ? (
        <StudentErrorCard label={mapStudentApiErrorToMessage(report.subjectReportQuery.error)} />
      ) : !report.subjectReport ? (
        <StudentEmptyCard label="No report data is available for this subject yet." />
      ) : (
        <>
          <StudentCard
            title={report.subjectReport.subjectTitle}
            subtitle={`${report.subjectReport.subjectCode} · ${report.subjectReport.classroomCount} classroom${report.subjectReport.classroomCount === 1 ? "" : "s"}`}
          >
            <View style={styles.cardGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Attendance</Text>
                <Text
                  style={[styles.metricValue, toneColorStyle(subjectInsight?.tone ?? "primary")]}
                >
                  {report.subjectReport.attendancePercentage}%
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total sessions</Text>
                <Text style={[styles.metricValue, styles.primaryTone]}>
                  {report.subjectReport.totalSessions}
                </Text>
              </View>
            </View>
            <Text style={styles.listMeta}>{subjectInsight?.message}</Text>
            <Text style={styles.listMeta}>
              Present sessions: {report.subjectReport.presentSessions}
            </Text>
            <Text style={styles.listMeta}>
              Absent sessions: {report.subjectReport.absentSessions}
            </Text>
            <Text style={styles.listMeta}>
              Last recorded session:{" "}
              {report.subjectReport.lastSessionAt
                ? formatDateTime(report.subjectReport.lastSessionAt)
                : "No attendance sessions yet"}
            </Text>
          </StudentCard>

          {report.subjectReport.classrooms.map((card) => (
            <StudentCard
              key={card.classroomId}
              title={card.classroomTitle}
              subtitle={`${card.classroomCode} attendance summary`}
            >
              <Text
                style={[
                  styles.bodyText,
                  toneColorStyle(
                    buildStudentAttendanceInsightModel({
                      attendancePercentage: card.attendancePercentage,
                      totalSessions: card.totalSessions,
                      presentSessions: card.presentSessions,
                      absentSessions: card.absentSessions,
                    }).tone,
                  ),
                ]}
              >
                {card.attendancePercentage}% attendance
              </Text>
              <Text style={styles.listMeta}>
                Present in {card.presentSessions} of {card.totalSessions} sessions
              </Text>
              <Text style={styles.listMeta}>Absent sessions: {card.absentSessions}</Text>
              <Text style={styles.listMeta}>
                Last session:{" "}
                {card.lastSessionAt
                  ? formatDateTime(card.lastSessionAt)
                  : "No attendance sessions yet"}
              </Text>
            </StudentCard>
          ))}
        </>
      )}
    </StudentScreen>
  )
}
