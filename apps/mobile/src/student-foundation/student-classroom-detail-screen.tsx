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

export function StudentClassroomDetailScreen(props: { classroomId: string }) {
  const { session } = useStudentSession()
  const classroom = useStudentClassroomDetailData(props.classroomId)
  const attendanceGateModel = classroom.attendanceReadyQuery.error
    ? {
        title: "Attendance temporarily blocked",
        message: mapStudentApiErrorToMessage(classroom.attendanceReadyQuery.error),
        tone: "danger" as const,
        supportHint: "Retry the trusted-device check or open Device Status for support guidance.",
        canContinue: false,
      }
    : buildStudentAttendanceGateModel({
        deviceTrust: classroom.meQuery.data?.user.deviceTrust ?? null,
        attendanceReady: classroom.attendanceReadyQuery.data ?? null,
      })
  const attendanceCandidates =
    classroom.detailQuery.data && classroom.membership && classroom.lecturesQuery.data
      ? buildStudentAttendanceCandidates({
          classrooms: [
            {
              ...classroom.membership,
              displayTitle: classroom.detailQuery.data.displayTitle,
              code: classroom.detailQuery.data.code,
              classroomStatus: classroom.detailQuery.data.status,
              defaultAttendanceMode: classroom.detailQuery.data.defaultAttendanceMode,
              timezone: classroom.detailQuery.data.timezone,
              requiresTrustedDevice: classroom.detailQuery.data.requiresTrustedDevice,
            },
          ],
          liveSessions: [
            ...(classroom.qrLiveSessionsQuery.data ?? []),
            ...(classroom.bluetoothLiveSessionsQuery.data ?? []),
          ],
        })
      : []
  const detailSummary =
    classroom.detailQuery.data && classroom.membership
      ? buildStudentClassroomDetailSummaryModel({
          classroom: {
            id: classroom.detailQuery.data.id,
            code: classroom.detailQuery.data.code,
            displayTitle: classroom.detailQuery.data.displayTitle,
            defaultAttendanceMode: classroom.detailQuery.data.defaultAttendanceMode,
            enrollmentStatus: classroom.membership.enrollmentStatus,
          },
          lectures: classroom.lecturesQuery.data ?? [],
          schedule: classroom.scheduleQuery.data ?? null,
          announcementCount: classroom.announcementsQuery.data?.length ?? 0,
          attendanceCandidates,
          gateModel: attendanceGateModel,
        })
      : null

  return (
    <StudentScreen
      title={detailSummary?.title ?? "Classroom"}
      subtitle={
        detailSummary?.subtitle ??
        "Open updates, schedule, reports, and attendance for this classroom."
      }
    >
      {!session ? (
        <StudentSessionSetupCard />
      ) : classroom.meQuery.isLoading ||
        classroom.attendanceReadyQuery.isLoading ||
        classroom.qrLiveSessionsQuery.isLoading ||
        classroom.bluetoothLiveSessionsQuery.isLoading ? (
        <StudentLoadingCard label="Loading course access" />
      ) : classroom.detailQuery.isLoading ||
        classroom.announcementsQuery.isLoading ||
        classroom.lecturesQuery.isLoading ||
        classroom.scheduleQuery.isLoading ? (
        <StudentLoadingCard label="Loading classroom details" />
      ) : classroom.detailQuery.error ||
        classroom.qrLiveSessionsQuery.error ||
        classroom.bluetoothLiveSessionsQuery.error ||
        classroom.announcementsQuery.error ||
        classroom.lecturesQuery.error ||
        classroom.scheduleQuery.error ? (
        <StudentErrorCard
          label={mapStudentApiErrorToMessage(
            classroom.detailQuery.error ??
              classroom.qrLiveSessionsQuery.error ??
              classroom.bluetoothLiveSessionsQuery.error ??
              classroom.announcementsQuery.error ??
              classroom.lecturesQuery.error ??
              classroom.scheduleQuery.error,
          )}
        />
      ) : (
        <>
          <StudentCard
            title={detailSummary?.attendanceTitle ?? "Attendance in this course"}
            subtitle={
              detailSummary?.nextSessionLabel ?? "Check the latest class sessions for this course."
            }
          >
            <Text
              style={[styles.bodyText, toneColorStyle(detailSummary?.attendanceTone ?? "primary")]}
            >
              {detailSummary?.attendanceMessage ??
                "Attendance details will appear once the course is loaded."}
            </Text>
            <Text style={styles.listMeta}>
              {detailSummary?.scheduleLabel ??
                `Schedule slots: ${classroom.scheduleQuery.data?.scheduleSlots.length ?? 0}`}
            </Text>
            <Text style={styles.listMeta}>
              {detailSummary?.updatesLabel ??
                `${classroom.announcementsQuery.data?.length ?? 0} classroom updates`}
            </Text>
            <Text style={styles.listMeta}>
              Joined on:{" "}
              {classroom.membership?.joinedAt
                ? formatDateTime(classroom.membership.joinedAt)
                : "Membership data will appear after the classroom list refreshes."}
            </Text>
            {classroom.membership ? (
              <View style={styles.actionGrid}>
                {detailSummary?.openAttendanceCount ? (
                  <StudentNavAction href={studentRoutes.attendance} label="Open attendance" />
                ) : null}
                <StudentNavAction
                  href={studentRoutes.classroomStream(props.classroomId)}
                  label="Updates"
                />
                <StudentNavAction
                  href={studentRoutes.classroomSchedule(props.classroomId)}
                  label="Schedule"
                />
                <StudentNavAction
                  href={studentRoutes.subjectReport(classroom.membership.subjectId)}
                  label="Report"
                />
              </View>
            ) : null}
          </StudentCard>

          <StudentCard
            title="Recent updates"
            subtitle="Keep class announcements close to the course page so you can act without hunting through the app."
          >
            {classroom.announcementsQuery.data?.length ? (
              classroom.announcementsQuery.data
                .slice(0, 3)
                .map((announcement) => (
                  <AnnouncementRow key={announcement.id} announcement={announcement} />
                ))
            ) : (
              <StudentEmptyCard label="No student-visible announcements are available yet." />
            )}
          </StudentCard>

          <StudentCard
            title="Class sessions"
            subtitle="See what is coming up and spot sessions that are already open for attendance."
          >
            {classroom.lecturesQuery.data?.length ? (
              classroom.lecturesQuery.data.slice(0, 5).map((lecture) => (
                <View key={lecture.id} style={styles.listRow}>
                  <Text style={styles.listTitle}>{lecture.title ?? "Scheduled lecture"}</Text>
                  <Text style={styles.listMeta}>
                    {formatDateTime(
                      lecture.actualStartAt ?? lecture.plannedStartAt ?? lecture.lectureDate,
                    )}{" "}
                    · {formatEnum(lecture.status)}
                  </Text>
                </View>
              ))
            ) : (
              <StudentEmptyCard label="No lectures are linked to this classroom yet." />
            )}
          </StudentCard>
        </>
      )}
    </StudentScreen>
  )
}
