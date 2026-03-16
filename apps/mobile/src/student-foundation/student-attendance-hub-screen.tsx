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

const env = loadMobileEnv(process.env as Record<string, string | undefined>)

export function StudentAttendanceHubScreen() {
  const { draft, session } = useStudentSession()
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
      subtitle="Choose QR or Bluetooth, then continue with the checks needed for attendance."
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
          <StudentCard
            title={attendance.gateModel.title}
            subtitle={attendance.gateModel.supportHint}
          >
            <Text style={[styles.bodyText, toneColorStyle(attendance.gateModel.tone)]}>
              {attendance.gateModel.message}
            </Text>
            <Text style={styles.listMeta}>
              Open sessions from live lecture data: {attendance.overview.totalOpenSessions}
            </Text>
            <Text style={styles.listMeta}>
              Recommended mode:{" "}
              {attendance.overview.recommendedMode
                ? formatAttendanceMode(attendance.overview.recommendedMode)
                : "Waiting for an open lecture"}
            </Text>
            {!attendance.gateModel.canContinue ? (
              <StudentNavAction href={studentRoutes.deviceStatus} label="Open Device Status" />
            ) : null}
          </StudentCard>

          <StudentCard
            title="Choose attendance mode"
            subtitle="Open the matching flow for your class, then refresh here if a teacher just started attendance."
          >
            <StudentStatusBanner status={refreshStatus} />
            <View style={styles.actionGrid}>
              <StudentNavAction
                href={studentRoutes.qrAttendance}
                label={`QR + GPS (${attendance.overview.qrReadyCount})`}
              />
              <StudentNavAction
                href={studentRoutes.bluetoothAttendance}
                label={`Bluetooth (${attendance.overview.bluetoothReadyCount})`}
              />
              <Pressable
                style={styles.secondaryButton}
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
              >
                <Text style={styles.secondaryButtonLabel}>
                  {isRefreshingAttendance ? "Refreshing..." : "Refresh live sessions"}
                </Text>
              </Pressable>
            </View>
          </StudentCard>

          <StudentCard
            title="Open Session Preview"
            subtitle="Sessions appear here once a teacher opens attendance for one of your classrooms."
          >
            {[...attendance.qrCandidates, ...attendance.bluetoothCandidates].length ? (
              [...attendance.qrCandidates, ...attendance.bluetoothCandidates].map((candidate) => (
                <AttendanceCandidateRow key={candidate.sessionId} candidate={candidate} selected />
              ))
            ) : (
              <StudentEmptyCard label="No lecture is currently marked as open for attendance." />
            )}
          </StudentCard>
        </>
      )}
    </StudentScreen>
  )
}
