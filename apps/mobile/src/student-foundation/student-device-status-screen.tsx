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

export function StudentDeviceStatusScreen() {
  const { session } = useStudentSession()
  const meQuery = useStudentMeQuery()
  const attendanceReadyQuery = useStudentAttendanceReadyQuery()
  const gateModel = buildStudentAttendanceGateModel({
    deviceTrust: meQuery.data?.user.deviceTrust ?? null,
    attendanceReady: attendanceReadyQuery.data ?? null,
  })

  return (
    <StudentScreen
      title="Device Status"
      subtitle="AttendEase allows one attendance phone per student. Check whether this phone can mark attendance and what to do next."
    >
      {!session ? (
        <StudentSessionSetupCard />
      ) : meQuery.isLoading ? (
        <StudentLoadingCard label="Checking device trust" />
      ) : meQuery.error ? (
        <StudentErrorCard label={mapStudentApiErrorToMessage(meQuery.error)} />
      ) : (
        <>
          <StudentCard title={gateModel.title} subtitle={gateModel.supportHint}>
            <Text style={[styles.bodyText, toneColorStyle(gateModel.tone)]}>
              {gateModel.message}
            </Text>
            <Text style={styles.listMeta}>
              Attendance on this phone: {gateModel.canContinue ? "Ready" : "Needs attention"}
            </Text>
            <Text style={styles.listMeta}>
              Phone status:{" "}
              {buildStudentDeviceStatusSummaryModel(meQuery.data?.user.deviceTrust ?? null).label}
            </Text>
            <View style={styles.actionGrid}>
              <StudentNavAction href={studentRoutes.attendance} label="Open Attendance" />
              <StudentNavAction href={studentRoutes.profile} label="Open Profile" />
            </View>
          </StudentCard>

          <StudentCard
            title="Attendance Access"
            subtitle="This is the same live approval check used by QR and Bluetooth attendance."
          >
            {attendanceReadyQuery.isLoading ? (
              <StudentLoadingCard label="Validating trusted attendance device" compact />
            ) : attendanceReadyQuery.data ? (
              <>
                <Text style={styles.listMeta}>Ready: yes</Text>
                <Text style={styles.listMeta}>
                  Approved phone: {attendanceReadyQuery.data.device.platform}
                </Text>
                <Text style={styles.listMeta}>
                  Approval state: {formatEnum(attendanceReadyQuery.data.binding.status)}
                </Text>
              </>
            ) : attendanceReadyQuery.error ? (
              <Text style={styles.errorText}>
                {mapStudentApiErrorToMessage(attendanceReadyQuery.error)}
              </Text>
            ) : (
              <Text style={styles.listMeta}>
                Sign in on your attendance phone to check approval details.
              </Text>
            )}
          </StudentCard>
        </>
      )}
    </StudentScreen>
  )
}
