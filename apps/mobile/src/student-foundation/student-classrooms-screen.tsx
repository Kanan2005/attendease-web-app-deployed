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

export function StudentClassroomsScreen() {
  const { session } = useStudentSession()
  const discovery = useStudentCourseDiscoveryData()
  const discoveryError =
    discovery.meQuery.error ??
    discovery.classroomsQuery.error ??
    discovery.attendanceReadyQuery.error ??
    discovery.lectureQueries.find((query) => query.error)?.error ??
    null

  return (
    <StudentScreen
      title="Classrooms"
      subtitle="Choose a course to see updates, schedule, and any attendance sessions that are open right now."
    >
      {!session ? (
        <StudentSessionSetupCard />
      ) : discovery.meQuery.isLoading ||
        discovery.classroomsQuery.isLoading ||
        discovery.attendanceReadyQuery.isLoading ? (
        <StudentLoadingCard label="Loading your classrooms" />
      ) : discoveryError ? (
        <StudentErrorCard label={mapStudentApiErrorToMessage(discoveryError)} />
      ) : discovery.courseCards.length > 0 ? (
        <>
          {!discovery.gateModel.canContinue ? (
            <StudentStatusBanner
              status={{
                tone: discovery.gateModel.tone,
                title: discovery.gateModel.title,
                message: discovery.gateModel.message,
              }}
            />
          ) : null}
          {discovery.courseCards.map((course) => (
            <StudentCard key={course.classroomId} title={course.title} subtitle={course.subtitle}>
              <Text style={[styles.bodyText, toneColorStyle(course.attendanceTone)]}>
                {course.attendanceTitle}
              </Text>
              <Text style={styles.listMeta}>{course.attendanceMessage}</Text>
              <Text style={styles.listMeta}>{course.scheduleLabel}</Text>
              <Text style={styles.listMeta}>{course.updatesLabel}</Text>
              <View style={styles.actionGrid}>
                <StudentNavAction
                  href={studentRoutes.classroomDetail(course.classroomId)}
                  label="Open course"
                />
                <StudentNavAction
                  href={studentRoutes.classroomStream(course.classroomId)}
                  label="Updates"
                />
                <StudentNavAction
                  href={studentRoutes.classroomSchedule(course.classroomId)}
                  label="Schedule"
                />
                {course.hasOpenAttendance ? (
                  <StudentNavAction href={studentRoutes.attendance} label="Attendance" />
                ) : null}
              </View>
            </StudentCard>
          ))}
        </>
      ) : (
        <StudentCard
          title="No classrooms yet"
          subtitle="Join a classroom to unlock course updates, schedule, and attendance actions."
        >
          <View style={styles.actionGrid}>
            <StudentNavAction href={studentRoutes.join} label="Join classroom" />
          </View>
        </StudentCard>
      )}
    </StudentScreen>
  )
}
