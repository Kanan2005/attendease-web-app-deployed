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
  useStudentUpdateProfileMutation,
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
  const c = getColors()
  const meQuery = useStudentMeQuery()
  const classroomsQuery = useStudentClassroomsQuery()
  const [draft, setDraft] = useState<StudentProfileDraft>(() => createStudentProfileDraft(null))
  const [initialDraft, setInitialDraft] = useState<StudentProfileDraft>(() =>
    createStudentProfileDraft(null),
  )
  const [initialized, setInitialized] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const updateProfileMutation = useStudentUpdateProfileMutation()

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
  const displayNameValid = draft.displayName.trim().length >= 1
  const canSave = hasDraftChanges && displayNameValid && !updateProfileMutation.isPending
  const deviceStatus = buildStudentDeviceStatusSummaryModel(meQuery.data?.user.deviceTrust ?? null)
  const joinedClassroomCount =
    classroomsQuery.data?.filter((classroom) => classroom.enrollmentStatus === "ACTIVE").length ?? 0

  return (
    <StudentScreen title="Profile" subtitle="Your account and display preferences.">
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
          {/* Profile Hero */}
          <View
            style={{
              alignItems: "center",
              gap: 12,
              padding: 24,
              borderRadius: 16,
              backgroundColor: c.surfaceHero,
              borderWidth: 1,
              borderColor: c.borderAccent,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: c.primarySoft,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: `${c.primary}30`,
              }}
            >
              <Text style={{ fontSize: 28, fontWeight: "800", color: c.primary }}>
                {(meQuery.data?.user.displayName ?? "S").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ alignItems: "center", gap: 2 }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: c.text }}>
                {meQuery.data?.user.displayName ?? "Student"}
              </Text>
              <Text style={{ fontSize: 14, color: c.textMuted }}>
                {meQuery.data?.user.email ?? ""}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: c.primarySoft,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                }}
              >
                <Ionicons name="library-outline" size={14} color={c.primary} />
                <Text style={{ fontSize: 13, fontWeight: "700", color: c.primary }}>
                  {joinedClassroomCount} classroom{joinedClassroomCount === 1 ? "" : "s"}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: deviceStatus.tone === "success" ? c.successSoft : c.warningSoft,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                }}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={14}
                  color={deviceStatus.tone === "success" ? c.success : c.warning}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: deviceStatus.tone === "success" ? c.success : c.warning,
                  }}
                >
                  {deviceStatus.label}
                </Text>
              </View>
            </View>
            <StudentNavAction
              href={studentRoutes.deviceStatus}
              label="Device Status"
              icon="phone-portrait-outline"
            />
          </View>

          <StudentCard title="Academic Info" subtitle="Your degree, branch, and roll number.">
            <ProfileFieldLabel icon="school-outline" label="Degree" />
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["B.Tech", "M.Tech"] as const).map((deg) => {
                const isActive = draft.degree === deg
                return (
                  <Pressable
                    key={deg}
                    onPress={() => {
                      setSaveMessage(null)
                      setDraft((d) => ({ ...d, degree: isActive ? "" : deg }))
                    }}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 9,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      borderColor: isActive ? c.primary : c.border,
                      backgroundColor: isActive ? c.primarySoft : c.surface,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: isActive ? "700" : "500",
                        color: isActive ? c.primary : c.textMuted,
                      }}
                    >
                      {deg}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <ProfileFieldLabel icon="git-branch-outline" label="Branch" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(["CSE", "ECE", "EE", "ME", "CHE", "Civil", "Meta"] as const).map((br) => {
                const isActive = draft.branch === br
                return (
                  <Pressable
                    key={br}
                    onPress={() => {
                      setSaveMessage(null)
                      setDraft((d) => ({ ...d, branch: isActive ? "" : br }))
                    }}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 9,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      borderColor: isActive ? c.primary : c.border,
                      backgroundColor: isActive ? c.primarySoft : c.surface,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: isActive ? "700" : "500",
                        color: isActive ? c.primary : c.textMuted,
                      }}
                    >
                      {br}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <ProfileFieldLabel icon="id-card-outline" label="Roll number" />
            <TextInput
              value={draft.rollNumber}
              autoCapitalize="characters"
              placeholder="Enter your roll number"
              placeholderTextColor={c.textSubtle}
              onChangeText={(value) => {
                setSaveMessage(null)
                setDraft((currentDraft) => ({ ...currentDraft, rollNumber: value }))
              }}
              style={styles.input}
            />
          </StudentCard>

          <StudentCard title="Display Preferences" subtitle="How your name appears in AttendEase.">
            <ProfileFieldLabel icon="person-outline" label="Full display name" />
            <TextInput
              value={draft.displayName}
              autoCapitalize="words"
              placeholder="Full display name"
              placeholderTextColor={c.textSubtle}
              onChangeText={(value) => {
                setSaveMessage(null)
                setDraft((currentDraft) => ({ ...currentDraft, displayName: value }))
              }}
              style={styles.input}
            />

            <ProfileFieldLabel icon="text-outline" label="Preferred short name" />
            <TextInput
              value={draft.preferredShortName}
              autoCapitalize="words"
              placeholder="Preferred short name"
              placeholderTextColor={c.textSubtle}
              onChangeText={(value) => {
                setSaveMessage(null)
                setDraft((currentDraft) => ({ ...currentDraft, preferredShortName: value }))
              }}
              style={styles.input}
            />
          </StudentCard>

          {saveError ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                backgroundColor: c.dangerSoft,
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: c.dangerBorder,
              }}
            >
              <Ionicons name="alert-circle" size={16} color={c.danger} />
              <Text style={[styles.bodyText, { color: c.danger, flex: 1 }]}>{saveError}</Text>
            </View>
          ) : null}
          {saveMessage ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: c.successSoft,
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: `${c.success}30`,
              }}
            >
              <Ionicons name="checkmark-circle" size={16} color={c.success} />
              <Text style={styles.successText}>{saveMessage}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              style={[
                styles.primaryButton,
                { flex: 1, flexDirection: "row", justifyContent: "center", gap: 8 },
                !canSave ? { opacity: 0.5 } : null,
              ]}
              disabled={!canSave}
              onPress={() => {
                setSaveError(null)
                const displayName = draft.displayName.trim()
                if (displayName.length < 1) return
                const rollNumber = draft.rollNumber.trim() || null
                const degree = draft.degree.trim() || null
                const branch = draft.branch.trim() || null
                updateProfileMutation.mutate(
                  { displayName, rollNumber, degree, branch },
                  {
                    onSuccess: (profile) => {
                      const nextDraft = normalizeStudentProfileDraft({
                        ...draft,
                        displayName: profile.displayName ?? displayName,
                        rollNumber: profile.rollNumber ?? draft.rollNumber,
                        degree: profile.degree ?? draft.degree,
                        branch: profile.branch ?? draft.branch,
                      })
                      setDraft(nextDraft)
                      setInitialDraft(nextDraft)
                      setSaveMessage("Profile updated.")
                    },
                    onError: (err) => {
                      setSaveMessage(null)
                      setSaveError(err instanceof Error ? err.message : "Failed to save profile.")
                    },
                  },
                )
              }}
            >
              {updateProfileMutation.isPending ? (
                <ActivityIndicator size="small" color={c.primaryContrast} />
              ) : (
                <Ionicons name="checkmark-circle-outline" size={18} color={c.primaryContrast} />
              )}
              <Text style={styles.primaryButtonLabel}>
                {updateProfileMutation.isPending ? "Saving…" : "Save profile"}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.secondaryButton,
                { flex: 0.5, flexDirection: "row", justifyContent: "center", gap: 6 },
              ]}
              disabled={updateProfileMutation.isPending}
              onPress={() => {
                setSaveMessage(null)
                setSaveError(null)
                setDraft(initialDraft)
              }}
            >
              <Ionicons name="refresh-outline" size={16} color={c.text} />
              <Text style={styles.secondaryButtonLabel}>Reset</Text>
            </Pressable>
          </View>

          <View style={{ gap: 12, marginTop: 8 }}>
            <Pressable
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: c.dangerBorder,
                backgroundColor: c.dangerSoft,
                paddingVertical: 16,
              }}
              onPress={signOut}
            >
              <Ionicons name="log-out-outline" size={18} color={c.danger} />
              <Text style={{ color: c.danger, fontSize: 15, fontWeight: "700" }}>Sign out</Text>
            </Pressable>
            <Text
              style={{
                color: c.textSubtle,
                fontSize: 12,
                textAlign: "center",
                lineHeight: 18,
                paddingHorizontal: 8,
              }}
            >
              Your email and attendance-device registration are managed by admin.
            </Text>
          </View>
        </>
      )}
    </StudentScreen>
  )
}

function ProfileFieldLabel(props: { icon: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Ionicons name={props.icon as "school-outline"} size={14} color={getColors().textSubtle} />
      <Text style={{ color: getColors().textMuted, fontSize: 13, fontWeight: "600" }}>
        {props.label}
      </Text>
    </View>
  )
}
