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

export function StudentProfileScreen() {
  const { session, signOut } = useStudentSession()
  const meQuery = useStudentMeQuery()
  const classroomsQuery = useStudentClassroomsQuery()
  const [draft, setDraft] = useState<StudentProfileDraft>(() => createStudentProfileDraft(null))
  const [initialDraft, setInitialDraft] = useState<StudentProfileDraft>(() =>
    createStudentProfileDraft(null),
  )
  const [initialized, setInitialized] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!meQuery.data || initialized) {
      return
    }

    const nextDraft = createStudentProfileDraft(meQuery.data.user)
    setDraft(nextDraft)
    setInitialDraft(nextDraft)
    setInitialized(true)
  }, [initialized, meQuery.data])

  const hasDraftChanges = hasStudentProfileDraftChanges(initialDraft, draft)
  const deviceStatus = buildStudentDeviceStatusSummaryModel(meQuery.data?.user.deviceTrust ?? null)
  const joinedClassroomCount =
    classroomsQuery.data?.filter((classroom) => classroom.enrollmentStatus === "ACTIVE").length ?? 0

  return (
    <StudentScreen
      title="Profile"
      subtitle="Check your account details, the name shown on this phone, and whether this phone can mark attendance."
    >
      {!session ? (
        <StudentSessionSetupCard />
      ) : meQuery.isLoading || classroomsQuery.isLoading ? (
        <StudentLoadingCard label="Loading your profile" />
      ) : meQuery.error || classroomsQuery.error ? (
        <StudentErrorCard
          label={mapStudentApiErrorToMessage(meQuery.error ?? classroomsQuery.error)}
        />
      ) : (
        <>
          <StudentCard
            title={meQuery.data?.user.displayName ?? "Student"}
            subtitle={meQuery.data?.user.email ?? ""}
          >
            <View style={styles.cardGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Joined Classrooms</Text>
                <Text style={[styles.metricValue, styles.primaryTone]}>{joinedClassroomCount}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Attendance Phone</Text>
                <Text style={[styles.metricValue, toneColorStyle(deviceStatus.tone)]}>
                  {deviceStatus.label}
                </Text>
              </View>
            </View>
            <Text style={styles.listMeta}>{deviceStatus.helperText}</Text>
            <StudentNavAction href={studentRoutes.deviceStatus} label="Open Device Status" />
          </StudentCard>

          <StudentCard
            title="Name on this phone"
            subtitle="Choose how your name appears in AttendEase on this phone."
          >
            <TextInput
              value={draft.displayName}
              autoCapitalize="words"
              placeholder="Full display name"
              onChangeText={(value) => {
                setSaveMessage(null)
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  displayName: value,
                }))
              }}
              style={styles.input}
            />
            <TextInput
              value={draft.preferredShortName}
              autoCapitalize="words"
              placeholder="Preferred short name"
              onChangeText={(value) => {
                setSaveMessage(null)
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  preferredShortName: value,
                }))
              }}
              style={styles.input}
            />
            <Text style={styles.listMeta}>
              Your email, classroom enrollments, and attendance-phone approval stay read-only.
            </Text>
            <View style={styles.actionGrid}>
              <Pressable
                style={styles.primaryButton}
                disabled={!hasDraftChanges}
                onPress={() => {
                  const nextDraft = normalizeStudentProfileDraft(draft)
                  setDraft(nextDraft)
                  setInitialDraft(nextDraft)
                  setSaveMessage(
                    "Saved on this phone. School records and attendance history stay unchanged.",
                  )
                }}
              >
                <Text style={styles.primaryButtonLabel}>Save On This Phone</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  setSaveMessage(null)
                  setDraft(initialDraft)
                }}
              >
                <Text style={styles.secondaryButtonLabel}>Reset Changes</Text>
              </Pressable>
            </View>
            {saveMessage ? <Text style={styles.successText}>{saveMessage}</Text> : null}
          </StudentCard>

          <StudentCard
            title="Account Actions"
            subtitle="Sign out if you need to switch accounts on this phone."
          >
            <Pressable style={styles.secondaryButton} onPress={signOut}>
              <Text style={styles.secondaryButtonLabel}>Sign Out</Text>
            </Pressable>
          </StudentCard>
        </>
      )}
    </StudentScreen>
  )
}
