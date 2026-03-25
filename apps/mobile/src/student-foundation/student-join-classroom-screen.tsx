import { createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"
import type { AttendanceMode, TrustedDeviceAttendanceReadyResponse } from "@attendease/contracts"
import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useRouter } from "expo-router"
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
  StudentBackButton,
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
  const c = getColors()
  const router = useRouter()
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
    <StudentScreen title="Join Classroom" subtitle="Enter your teacher's code to join.">
      <StudentBackButton label="Back to Home" />
      {!session ? (
        <StudentSessionSetupCard />
      ) : (
        <>
          {joinBanner ? <StudentStatusBanner status={joinBanner} /> : null}
          <View
            style={{
              backgroundColor: c.surfaceRaised,
              borderRadius: 16,
              padding: 20,
              gap: 20,
              borderWidth: 1,
              borderColor: c.border,
              ...mobileTheme.shadow.card,
            }}
          >
            <View style={{ alignItems: "center", gap: 8 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: c.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="key-outline" size={28} color={c.primary} />
              </View>
              <Text style={{ fontSize: 17, fontWeight: "700", color: c.text }}>
                Enter Join Code
              </Text>
              <Text style={{ fontSize: 13, color: c.textMuted, textAlign: "center" }}>
                Ask your teacher for the classroom join code
              </Text>
            </View>

            <TextInput
              value={code}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="ABCD12"
              placeholderTextColor={c.textSubtle}
              onChangeText={(nextValue) => {
                setLastJoinedClassroom(undefined)
                setCode(nextValue.toUpperCase())
              }}
              style={[
                styles.input,
                {
                  letterSpacing: 4,
                  fontSize: 22,
                  fontWeight: "800",
                  textAlign: "center",
                  paddingVertical: 16,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: code.trim().length >= 4 ? c.primary : c.borderStrong,
                },
              ]}
            />

            <Pressable
              style={[
                styles.primaryButton,
                { paddingVertical: 16, borderRadius: 14 },
                joinMutation.isPending || code.trim().length < 4 ? { opacity: 0.5 } : null,
              ]}
              disabled={joinMutation.isPending || code.trim().length < 4}
              onPress={() => {
                setLastJoinedClassroom(undefined)
                joinMutation.mutate(code, {
                  onSuccess: (membership) => {
                    setLastJoinedClassroom(membership.displayTitle)
                    setCode("")
                    const classroomId = membership.classroomId ?? membership.id
                    router.push(studentRoutes.classroomDetail(classroomId))
                  },
                })
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {joinMutation.isPending ? (
                  <ActivityIndicator size="small" color={c.primaryContrast} />
                ) : (
                  <Ionicons name="enter-outline" size={18} color={c.primaryContrast} />
                )}
                <Text style={[styles.primaryButtonLabel, { fontSize: 16 }]}>
                  {joinMutation.isPending ? "Joining…" : "Join Classroom"}
                </Text>
              </View>
            </Pressable>
          </View>

          <StudentCard
            title={`Enrolled (${classroomsQuery.data?.length ?? 0})`}
            subtitle="Your current classroom memberships."
          >
            {classroomsQuery.isLoading ? (
              <StudentLoadingCard label="Loading your classrooms…" compact />
            ) : classroomsQuery.data?.length ? (
              classroomsQuery.data.map((classroom) => {
                const isActive = classroom.enrollmentStatus === "ACTIVE"
                return (
                  <Pressable
                    key={classroom.enrollmentId}
                    onPress={() =>
                      router.push(
                        studentRoutes.classroomDetail(classroom.classroomId ?? classroom.id),
                      )
                    }
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
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        backgroundColor: isActive ? c.successSoft : c.surfaceMuted,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name={isActive ? "checkmark-circle" : "ellipse-outline"}
                        size={18}
                        color={isActive ? c.success : c.textSubtle}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={{ fontSize: 15, fontWeight: "600", color: c.text }}
                        numberOfLines={1}
                      >
                        {classroom.displayTitle}
                      </Text>
                      <Text style={{ fontSize: 12, color: c.textMuted }}>
                        {formatEnum(classroom.enrollmentStatus)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={c.textSubtle} />
                  </Pressable>
                )
              })
            ) : (
              <StudentEmptyCard label="No classrooms joined yet." />
            )}
          </StudentCard>
        </>
      )}
    </StudentScreen>
  )
}
