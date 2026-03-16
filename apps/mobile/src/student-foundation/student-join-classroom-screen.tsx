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
  useStudentClassroomAnnouncementsQuery,
  useStudentClassroomDetailData,
  useStudentClassroomsQuery,
  useStudentCourseDiscoveryData,
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

export function StudentJoinClassroomScreen() {
  const { session } = useStudentSession()
  const [code, setCode] = useState("")
  const [lastJoinedClassroom, setLastJoinedClassroom] = useState<string | undefined>()
  const classroomsQuery = useStudentClassroomsQuery()
  const joinMutation = useStudentJoinClassroomMutation()
  const joinBanner = buildStudentJoinBanner({
    state: joinMutation.isPending
      ? "pending"
      : joinMutation.error
        ? "error"
        : lastJoinedClassroom
          ? "success"
          : "idle",
    ...(lastJoinedClassroom ? { classroomTitle: lastJoinedClassroom } : {}),
    ...(joinMutation.error
      ? { errorMessage: mapStudentApiErrorToMessage(joinMutation.error) }
      : {}),
  })

  return (
    <StudentScreen
      title="Join Classroom"
      subtitle="Use the live join-code route so classroom membership, reports, and stream access stay in sync."
    >
      {!session ? (
        <StudentSessionSetupCard />
      ) : (
        <>
          {joinBanner ? <StudentStatusBanner status={joinBanner} /> : null}
          <StudentCard
            title="Enter Teacher Code"
            subtitle="The backend already rejects expired, duplicate, dropped, blocked, and closed-classroom joins."
          >
            <TextInput
              value={code}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="ABCD12"
              onChangeText={(nextValue) => {
                setLastJoinedClassroom(undefined)
                setCode(nextValue.toUpperCase())
              }}
              style={styles.input}
            />
            <Pressable
              style={styles.primaryButton}
              disabled={joinMutation.isPending || code.trim().length < 4}
              onPress={() => {
                setLastJoinedClassroom(undefined)
                joinMutation.mutate(code, {
                  onSuccess: (membership) => {
                    setLastJoinedClassroom(membership.displayTitle)
                    setCode("")
                  },
                })
              }}
            >
              <Text style={styles.primaryButtonLabel}>
                {joinMutation.isPending ? "Joining..." : "Join Classroom"}
              </Text>
            </Pressable>
          </StudentCard>

          <StudentCard
            title="Current Memberships"
            subtitle="Successful joins immediately feed the student dashboard, report, and classroom-detail routes."
          >
            {classroomsQuery.data?.length ? (
              classroomsQuery.data.map((classroom) => (
                <Text key={classroom.enrollmentId} style={styles.listMeta}>
                  {classroom.displayTitle} · {formatEnum(classroom.enrollmentStatus)}
                </Text>
              ))
            ) : (
              <StudentEmptyCard label="No classroom memberships are active yet." />
            )}
          </StudentCard>
        </>
      )}
    </StudentScreen>
  )
}
