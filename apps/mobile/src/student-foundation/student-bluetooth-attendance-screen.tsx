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

export function StudentBluetoothAttendanceScreen() {
  const { session } = useStudentSession()
  const controller = useStudentAttendanceController("BLUETOOTH")
  const scannerEnabled = Boolean(controller.selectedCandidate && controller.gateModel.canContinue)
  const scanner = useStudentBluetoothScanner(
    env.EXPO_PUBLIC_ATTENDANCE_BLUETOOTH_SERVICE_UUID,
    scannerEnabled,
  )
  const bluetoothMarkMutation = useStudentBluetoothMarkAttendanceMutation()
  const [selectedDetectionPayload, setSelectedDetectionPayload] = useState<string | null>(null)
  const preferredDetection = resolveSelectedBluetoothDetection({
    detections: scanner.detections,
    selectedPayload: selectedDetectionPayload,
  })
  const suggestedDetection = usePreferredBluetoothDetection(scanner.detections)
  const bluetoothPermissionState = mapBluetoothAvailabilityToPermissionState(scanner.availability)
  const scanBanner = buildStudentBluetoothScannerBanner({
    availability: scanner.availability,
    state: scanner.state,
    errorMessage: scanner.errorMessage,
  })
  const detectionBanner = buildStudentBluetoothDetectionBanner({
    detectionCount: scanner.detections.length,
    scannerState: scanner.state,
    selectedDetection: preferredDetection,
  })
  const [isRefreshingSessions, setIsRefreshingSessions] = useState(false)
  const refreshStatus = buildStudentAttendanceRefreshStatus({
    isRefreshing: isRefreshingSessions,
    openAttendanceCount: controller.candidates.length,
    mode: "BLUETOOTH",
  })
  const submissionBanner = buildStudentBluetoothSubmissionBanner({
    detectionCount: scanner.detections.length,
    selectedDetection: preferredDetection,
    canPrepareSubmission: controller.canPrepareSubmission,
    hasSelectedCandidate: Boolean(controller.selectedCandidate),
    gateCanContinue: controller.gateModel.canContinue,
  })
  const hasMultipleDetections = scanner.detections.length > 1

  useEffect(() => {
    if (!scanner.availability) {
      return
    }

    if (bluetoothPermissionState === controller.permissionState) {
      return
    }

    controller.setPermissionState(bluetoothPermissionState)
  }, [
    bluetoothPermissionState,
    controller.permissionState,
    controller.setPermissionState,
    scanner.availability,
  ])

  useEffect(() => {
    if (!suggestedDetection) {
      setSelectedDetectionPayload(null)
      return
    }

    setSelectedDetectionPayload((current) =>
      current && scanner.detections.some((detection) => detection.payload === current)
        ? current
        : suggestedDetection.payload,
    )
  }, [scanner.detections, suggestedDetection])

  return (
    <StudentScreen
      title="Bluetooth Attendance"
      subtitle="Keep this phone near your teacher, choose the live Bluetooth session, and mark attendance in a short flow."
    >
      {!session ? (
        <StudentSessionSetupCard />
      ) : controller.meQuery.isLoading || controller.classroomsQuery.isLoading ? (
        <StudentLoadingCard label="Preparing Bluetooth attendance" />
      ) : controller.meQuery.error || controller.classroomsQuery.error ? (
        <StudentErrorCard
          label={mapStudentApiErrorToMessage(
            controller.meQuery.error ?? controller.classroomsQuery.error,
          )}
        />
      ) : (
        <>
          <StudentCard
            title={controller.gateModel.title}
            subtitle={controller.gateModel.supportHint}
          >
            <Text style={[styles.bodyText, toneColorStyle(controller.gateModel.tone)]}>
              {controller.gateModel.message}
            </Text>
            {!controller.gateModel.canContinue ? (
              <View style={styles.actionGrid}>
                <StudentNavAction href={studentRoutes.deviceStatus} label="Open device status" />
              </View>
            ) : null}
          </StudentCard>

          <StudentCard
            title="1. Choose session"
            subtitle="Bluetooth attendance is matched against the live classroom session you choose here."
          >
            <StudentStatusBanner status={refreshStatus} />
            {controller.candidates.length ? (
              controller.candidates.map((candidate) => (
                <AttendanceCandidateRow
                  key={candidate.sessionId}
                  candidate={candidate}
                  selected={controller.selectedSessionId === candidate.sessionId}
                  onPress={() => controller.setSelectedSessionId(candidate.sessionId)}
                />
              ))
            ) : (
              <StudentEmptyCard label="No Bluetooth attendance session is open for your classrooms right now." />
            )}
            <View style={styles.actionGrid}>
              <Pressable
                style={styles.secondaryButton}
                disabled={isRefreshingSessions}
                onPress={() =>
                  void (async () => {
                    setIsRefreshingSessions(true)

                    try {
                      await controller.refreshExperience()
                    } finally {
                      setIsRefreshingSessions(false)
                    }
                  })()
                }
              >
                <Text style={styles.secondaryButtonLabel}>
                  {isRefreshingSessions ? "Refreshing..." : "Refresh Bluetooth sessions"}
                </Text>
              </Pressable>
            </View>
          </StudentCard>

          {controller.selectedCandidate ? (
            <>
              <StudentCard
                title="2. Check Bluetooth"
                subtitle="AttendEase checks Bluetooth before it starts looking for the teacher nearby."
              >
                <StudentStatusBanner status={scanBanner} />
                <View style={styles.actionGrid}>
                  <Pressable
                    style={styles.secondaryButton}
                    disabled={scanner.state === "SCANNING"}
                    onPress={() => void scanner.start()}
                  >
                    <Text style={styles.secondaryButtonLabel}>Start Scan</Text>
                  </Pressable>
                  <Pressable
                    style={styles.secondaryButton}
                    disabled={scanner.state !== "SCANNING"}
                    onPress={() => void scanner.stop()}
                  >
                    <Text style={styles.secondaryButtonLabel}>Stop Scan</Text>
                  </Pressable>
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => void scanner.refreshAvailability()}
                  >
                    <Text style={styles.secondaryButtonLabel}>Refresh Bluetooth</Text>
                  </Pressable>
                </View>
                <Text style={styles.listMeta}>
                  Bluetooth scan state: {formatEnum(scanner.state)}
                </Text>
              </StudentCard>

              <StudentCard
                title={
                  hasMultipleDetections ? "3. Choose nearby teacher" : "3. Scan nearby teacher"
                }
                subtitle="Keep this phone close to your teacher until the live classroom session appears."
              >
                <StudentStatusBanner status={detectionBanner} />
                {scanner.detections.length ? (
                  scanner.detections.map((detection) => (
                    <Pressable
                      key={`${detection.payload}-${detection.detectedAt}`}
                      style={styles.listRow}
                      onPress={() => {
                        setSelectedDetectionPayload(detection.payload)
                      }}
                    >
                      <Text style={styles.listTitle}>
                        {hasMultipleDetections
                          ? selectedDetectionPayload === detection.payload
                            ? "Selected nearby teacher"
                            : "Nearby teacher"
                          : "Nearby teacher"}
                      </Text>
                      <Text style={styles.listMeta}>
                        {describeBluetoothSignalStrength(detection.rssi)} ·{" "}
                        {new Date(detection.detectedAt).toLocaleTimeString()}
                      </Text>
                      {hasMultipleDetections ? (
                        <Text style={styles.listMeta}>
                          {selectedDetectionPayload === detection.payload
                            ? "Tap another signal if this is not your teacher."
                            : "Tap to choose this nearby teacher."}
                        </Text>
                      ) : detection.rssi !== null ? (
                        <Text style={styles.listMeta}>RSSI {detection.rssi}</Text>
                      ) : null}
                    </Pressable>
                  ))
                ) : (
                  <StudentEmptyCard
                    label={
                      scanner.state === "SCANNING"
                        ? "Keep the phone near your teacher while AttendEase looks for a live Bluetooth session."
                        : "Start or refresh the scan when you are close to the teacher running attendance."
                    }
                  />
                )}
                {preferredDetection && hasMultipleDetections ? (
                  <Text style={styles.listMeta}>
                    Selected teacher signal seen at{" "}
                    {new Date(preferredDetection.detectedAt).toLocaleTimeString()}.
                  </Text>
                ) : null}
              </StudentCard>

              <StudentCard
                title="4. Mark attendance"
                subtitle="AttendEase submits attendance only after this phone is trusted and a nearby teacher session is selected."
              >
                {submissionBanner ? <StudentStatusBanner status={submissionBanner} /> : null}
                <Pressable
                  style={styles.primaryButton}
                  disabled={
                    !controller.canPrepareSubmission ||
                    !preferredDetection ||
                    bluetoothMarkMutation.isPending
                  }
                  onPress={() => {
                    controller.prepareSubmission()

                    if (!preferredDetection) {
                      return
                    }

                    void bluetoothMarkMutation
                      .mutateAsync(
                        buildStudentBluetoothMarkRequest({
                          detectedPayload: preferredDetection.payload,
                          rssi: preferredDetection.rssi,
                          deviceTimestamp: new Date(preferredDetection.detectedAt).toISOString(),
                        }),
                      )
                      .then(async () => {
                        await controller.refreshAfterSuccess()
                      })
                      .catch(() => {
                        controller.setResultKind("ERROR")
                      })
                  }}
                >
                  <Text style={styles.primaryButtonLabel}>
                    {bluetoothMarkMutation.isPending ? "Marking attendance..." : "Mark attendance"}
                  </Text>
                </Pressable>
                {preferredDetection ? (
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => {
                      scanner.clearDetections()
                      setSelectedDetectionPayload(null)
                    }}
                  >
                    <Text style={styles.secondaryButtonLabel}>Clear nearby sessions</Text>
                  </Pressable>
                ) : null}
                {controller.snapshot.resultBanner ? (
                  <StudentStatusBanner status={controller.snapshot.resultBanner} />
                ) : null}
                {bluetoothMarkMutation.error ? (
                  <StudentStatusBanner
                    status={buildStudentBluetoothAttendanceErrorBanner(bluetoothMarkMutation.error)}
                  />
                ) : null}
              </StudentCard>
            </>
          ) : null}
        </>
      )}
    </StudentScreen>
  )
}
