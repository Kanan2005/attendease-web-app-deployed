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

export function StudentDeviceStatusScreen() {
  const { session } = useStudentSession()
  const c = getColors()
  const meQuery = useStudentMeQuery()
  const attendanceReadyQuery = useStudentAttendanceReadyQuery()
  const gateModel = buildStudentAttendanceGateModel({
    deviceTrust: meQuery.data?.user.deviceTrust ?? null,
    attendanceReady: attendanceReadyQuery.data ?? null,
  })

  return (
    <StudentScreen title="Device Status" subtitle="Check if this phone is ready for attendance.">
      <StudentBackButton label="Back to Profile" />
      {!session ? (
        <StudentSessionSetupCard />
      ) : meQuery.isLoading ? (
        <StudentLoadingCard label="Checking device status…" />
      ) : meQuery.error ? (
        <StudentErrorCard label={mapStudentApiErrorToMessage(meQuery.error)} />
      ) : (
        <>
          {/* Status Hero */}
          <View
            style={{
              alignItems: "center",
              gap: 16,
              padding: 24,
              borderRadius: 16,
              backgroundColor: gateModel.canContinue ? c.successSoft : c.dangerSoft,
              borderWidth: 1.5,
              borderColor: gateModel.canContinue ? c.successBorder : c.dangerBorder,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: gateModel.canContinue ? `${c.success}20` : `${c.danger}20`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={gateModel.canContinue ? "shield-checkmark" : "shield-outline"}
                size={36}
                color={gateModel.canContinue ? c.success : c.danger}
              />
            </View>
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: c.text }}>
                {gateModel.canContinue ? "Device Ready" : "Needs Attention"}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: c.textMuted,
                  textAlign: "center",
                  lineHeight: 20,
                  paddingHorizontal: 12,
                }}
              >
                {gateModel.message}
              </Text>
            </View>
          </View>

          {/* Device Details */}
          <StudentCard title="Device Information">
            <View style={{ gap: 12 }}>
              <DeviceInfoRow
                icon="phone-portrait-outline"
                label="Phone Status"
                value={
                  buildStudentDeviceStatusSummaryModel(meQuery.data?.user.deviceTrust ?? null).label
                }
                tone={
                  buildStudentDeviceStatusSummaryModel(meQuery.data?.user.deviceTrust ?? null).tone
                }
              />
              <DeviceInfoRow
                icon="hand-left-outline"
                label="Attendance Access"
                value={gateModel.canContinue ? "Ready" : "Blocked"}
                tone={gateModel.canContinue ? "success" : "danger"}
              />
              {attendanceReadyQuery.data ? (
                <>
                  <DeviceInfoRow
                    icon="hardware-chip-outline"
                    label="Platform"
                    value={
                      attendanceReadyQuery.data.device.platform === "ANDROID"
                        ? "Android"
                        : attendanceReadyQuery.data.device.platform === "IOS"
                          ? "iPhone"
                          : attendanceReadyQuery.data.device.platform
                    }
                    tone="primary"
                  />
                  <DeviceInfoRow
                    icon="link-outline"
                    label="Binding Status"
                    value={formatEnum(attendanceReadyQuery.data.binding.status)}
                    tone={
                      attendanceReadyQuery.data.binding.status === "ACTIVE" ? "success" : "warning"
                    }
                  />
                </>
              ) : attendanceReadyQuery.isLoading ? (
                <StudentLoadingCard label="Verifying device…" compact />
              ) : attendanceReadyQuery.error ? (
                <Text style={styles.errorText}>
                  {mapStudentApiErrorToMessage(attendanceReadyQuery.error)}
                </Text>
              ) : null}
            </View>
            {gateModel.supportHint ? (
              <Text style={{ fontSize: 13, color: c.textMuted, lineHeight: 19, marginTop: 4 }}>
                {gateModel.supportHint}
              </Text>
            ) : null}
          </StudentCard>

          <View style={styles.actionGrid}>
            <StudentNavAction
              href={studentRoutes.attendance}
              label="Open Attendance"
              icon="hand-left-outline"
            />
            <StudentNavAction
              href={studentRoutes.profile}
              label="Open Profile"
              icon="person-outline"
            />
          </View>
        </>
      )}
    </StudentScreen>
  )
}

function DeviceInfoRow(props: {
  icon: string
  label: string
  value: string
  tone: string
}) {
  const c = getColors()
  const color =
    props.tone === "success"
      ? c.success
      : props.tone === "danger"
        ? c.danger
        : props.tone === "warning"
          ? c.warning
          : c.primary
  const bg =
    props.tone === "success"
      ? c.successSoft
      : props.tone === "danger"
        ? c.dangerSoft
        : props.tone === "warning"
          ? c.warningSoft
          : c.primarySoft

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={props.icon as "phone-portrait-outline"} size={18} color={color} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: c.textSubtle,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {props.label}
        </Text>
        <Text style={{ fontSize: 15, fontWeight: "700", color }}>{props.value}</Text>
      </View>
    </View>
  )
}
