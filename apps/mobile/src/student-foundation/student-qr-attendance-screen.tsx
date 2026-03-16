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

export function StudentQrAttendanceScreen() {
  const { session } = useStudentSession()
  const controller = useStudentAttendanceController("QR_GPS")
  const markAttendance = useStudentQrMarkAttendanceMutation()
  const [cameraViewComponent, setCameraViewComponent] = useState<ComponentType<{
    style?: object
    barcodeScannerSettings?: {
      barcodeTypes: string[]
    }
    onBarcodeScanned?: (event: { data?: string }) => void
  }> | null>(null)
  const [cameraMode, setCameraMode] = useState<"manual" | "camera">("manual")
  const [cameraPermissionState, setCameraPermissionState] =
    useState<StudentAttendancePermissionState>("PENDING_REQUEST")
  const [isPreparingCamera, setIsPreparingCamera] = useState(false)
  const [scannerMessage, setScannerMessage] = useState<string | null>(
    Platform.OS === "web"
      ? "Web preview uses manual QR entry. Use a device build for live camera scanning."
      : null,
  )
  const [locationState, setLocationState] = useState<StudentQrLocationState>("IDLE")
  const [locationSnapshot, setLocationSnapshot] = useState<StudentQrLocationSnapshot | null>(null)
  const [locationErrorMessage, setLocationErrorMessage] = useState<string | null>(null)
  const [submissionBanner, setSubmissionBanner] = useState<ReturnType<
    typeof buildStudentQrAttendanceErrorBanner
  > | null>(null)
  const locationBanner = buildStudentQrLocationBanner({
    locationState,
    location: locationSnapshot,
    errorMessage: locationErrorMessage,
  })
  const markRequest = buildStudentQrMarkRequest({
    qrPayload: controller.scanValue,
    location: locationSnapshot,
  })
  const CameraPreview = cameraViewComponent
  const scanBanner = buildStudentQrScanBanner({
    cameraMode,
    cameraPermissionState,
    hasQrPayload: controller.scanValue.trim().length >= 4,
    isPreparingCamera,
  })

  async function enableCameraScanner() {
    if (Platform.OS === "web") {
      setCameraMode("manual")
      setScannerMessage(
        "Web preview uses manual QR entry. Open a device build to scan live QR codes.",
      )
      return
    }

    setIsPreparingCamera(true)
    setSubmissionBanner(null)
    markAttendance.reset()
    setScannerMessage(null)
    controller.setPermissionState(
      resolveStudentQrCameraPermissionState({
        currentPermissionState: controller.permissionState,
        transition: "REQUESTING",
      }),
    )

    try {
      const cameraModule = (await import("expo-camera")) as typeof import("expo-camera")
      const permission = await cameraModule.Camera.requestCameraPermissionsAsync()

      if (!permission.granted) {
        setCameraPermissionState("DENIED")
        controller.setPermissionState(
          resolveStudentQrCameraPermissionState({
            currentPermissionState: controller.permissionState,
            transition: "DENIED",
          }),
        )
        setScannerMessage(
          "Camera access was denied. Paste the rolling QR payload manually or enable camera access in system settings.",
        )
        setCameraMode("manual")
        return
      }

      setCameraPermissionState("GRANTED")
      setCameraViewComponent(
        () =>
          cameraModule.CameraView as unknown as ComponentType<{
            style?: object
            barcodeScannerSettings?: {
              barcodeTypes: string[]
            }
            onBarcodeScanned?: (event: { data?: string }) => void
          }>,
      )
      setCameraMode("camera")
      setScannerMessage(
        "Point the camera at the live classroom QR. The code fills in automatically.",
      )
    } catch (error) {
      setCameraPermissionState("UNAVAILABLE")
      controller.setPermissionState(
        resolveStudentQrCameraPermissionState({
          currentPermissionState: controller.permissionState,
          transition: "UNAVAILABLE",
        }),
      )
      setCameraMode("manual")
      setScannerMessage(
        error instanceof Error
          ? error.message
          : "Camera scanning is unavailable in this build. Paste the rolling QR payload manually.",
      )
    } finally {
      setIsPreparingCamera(false)
    }
  }

  async function captureCurrentLocation() {
    setLocationState("CAPTURING")
    setLocationErrorMessage(null)
    setSubmissionBanner(null)
    markAttendance.reset()
    controller.setPermissionState("PENDING_REQUEST")

    try {
      const locationModule = require("expo-location") as typeof import("expo-location")
      const permission = await locationModule.requestForegroundPermissionsAsync()

      if (!permission.granted) {
        setLocationState("ERROR")
        setLocationErrorMessage(
          "Location access was denied. QR attendance needs a fresh GPS reading before it can be submitted.",
        )
        controller.setPermissionState("DENIED")
        return
      }

      const currentLocation = await locationModule.getCurrentPositionAsync({
        accuracy: locationModule.Accuracy.Highest,
      })
      const nextLocation: StudentQrLocationSnapshot = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracyMeters: Math.max(1, currentLocation.coords.accuracy ?? 1),
        capturedAt: new Date(currentLocation.timestamp).toISOString(),
      }

      setLocationSnapshot(nextLocation)
      setLocationState("READY")
      controller.setPermissionState("GRANTED")
    } catch (error) {
      setLocationState("ERROR")
      setLocationErrorMessage(
        error instanceof Error
          ? error.message
          : "AttendEase could not capture the current location.",
      )
      controller.setPermissionState("UNAVAILABLE")
    }
  }

  function handleScannedQrPayload(payload: string) {
    setCameraPermissionState("GRANTED")
    controller.setScanValue(payload)
    controller.setResultKind("IDLE")
    setSubmissionBanner(null)
    markAttendance.reset()
    setCameraMode("manual")
    setScannerMessage("QR captured. Confirm your location and mark attendance.")
  }

  async function submitQrAttendance() {
    controller.prepareSubmission()

    if (!markRequest) {
      return
    }

    setSubmissionBanner(null)

    markAttendance.mutate(
      {
        qrPayload: markRequest.qrPayload,
        location: {
          latitude: markRequest.latitude,
          longitude: markRequest.longitude,
          accuracyMeters: markRequest.accuracyMeters,
          capturedAt: markRequest.deviceTimestamp ?? new Date().toISOString(),
        },
      },
      {
        onSuccess: async () => {
          await controller.refreshAfterSuccess()
        },
        onError: (error) => {
          controller.setResultKind("ERROR")
          setSubmissionBanner(buildStudentQrAttendanceErrorBanner(error))
        },
      },
    )
  }

  return (
    <StudentScreen
      title="QR Attendance"
      subtitle="Scan the live classroom QR, confirm your location, and mark attendance in one short flow."
    >
      {!session ? (
        <StudentSessionSetupCard />
      ) : controller.meQuery.isLoading || controller.classroomsQuery.isLoading ? (
        <StudentLoadingCard label="Preparing QR attendance" />
      ) : controller.meQuery.error || controller.classroomsQuery.error ? (
        <StudentErrorCard
          label={mapStudentApiErrorToMessage(
            controller.meQuery.error ?? controller.classroomsQuery.error,
          )}
        />
      ) : (
        <>
          <StudentCard
            title={
              controller.selectedCandidate
                ? `${controller.selectedCandidate.classroomTitle} is ready`
                : controller.gateModel.title
            }
            subtitle={
              controller.selectedCandidate
                ? "Follow the steps below while the live QR attendance session is open."
                : controller.gateModel.supportHint
            }
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
            subtitle="Pick the classroom that is open for QR attendance right now."
          >
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
              <StudentEmptyCard label="No QR attendance session is open for your classrooms right now." />
            )}
          </StudentCard>

          {controller.candidates.length > 0 ? (
            <>
              <StudentCard
                title="2. Scan QR"
                subtitle="Use the camera for the fastest path, or paste the live QR if you already have it."
              >
                <StudentStatusBanner status={scanBanner} />
                <TextInput
                  value={controller.scanValue}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Paste live QR"
                  onChangeText={(nextValue) => {
                    controller.setScanValue(nextValue)
                    setSubmissionBanner(null)
                    markAttendance.reset()
                  }}
                  style={styles.input}
                />
                <View style={styles.actionGrid}>
                  <Pressable
                    style={styles.secondaryButton}
                    disabled={isPreparingCamera}
                    onPress={() => void enableCameraScanner()}
                  >
                    <Text style={styles.secondaryButtonLabel}>
                      {isPreparingCamera ? "Opening camera..." : "Use camera"}
                    </Text>
                  </Pressable>
                </View>

                {scannerMessage ? <Text style={styles.listMeta}>{scannerMessage}</Text> : null}

                {cameraMode === "camera" && CameraPreview ? (
                  <View style={styles.cameraPreviewFrame}>
                    <CameraPreview
                      style={styles.cameraPreview}
                      barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                      }}
                      onBarcodeScanned={(event: { data?: string }) => {
                        if (typeof event.data === "string" && event.data.length > 0) {
                          handleScannedQrPayload(event.data)
                        }
                      }}
                    />
                  </View>
                ) : null}
              </StudentCard>

              <StudentCard
                title="3. Confirm location"
                subtitle="AttendEase checks that you are inside the allowed classroom area before it marks attendance."
              >
                {locationBanner ? <StudentStatusBanner status={locationBanner} /> : null}
                <View style={styles.actionGrid}>
                  <Pressable
                    style={styles.secondaryButton}
                    disabled={locationState === "CAPTURING"}
                    onPress={() => void captureCurrentLocation()}
                  >
                    <Text style={styles.secondaryButtonLabel}>
                      {locationState === "CAPTURING" ? "Checking location..." : "Confirm location"}
                    </Text>
                  </Pressable>
                </View>

                {locationSnapshot ? (
                  <Text style={styles.listMeta}>
                    {locationSnapshot.latitude.toFixed(6)}, {locationSnapshot.longitude.toFixed(6)}{" "}
                    · {Math.round(locationSnapshot.accuracyMeters)}m accuracy
                  </Text>
                ) : null}
              </StudentCard>

              <StudentCard
                title="4. Mark attendance"
                subtitle={
                  controller.selectedCandidate
                    ? `${controller.selectedCandidate.lectureTitle} · ${formatDateTime(
                        controller.selectedCandidate.timestamp,
                      )}`
                    : "Submit once the live QR and your location are ready."
                }
              >
                {controller.snapshot.resultBanner ? (
                  <StudentStatusBanner status={controller.snapshot.resultBanner} />
                ) : null}
                {submissionBanner ? <StudentStatusBanner status={submissionBanner} /> : null}

                <Pressable
                  style={styles.primaryButton}
                  disabled={
                    !controller.canPrepareSubmission || !markRequest || markAttendance.isPending
                  }
                  onPress={() => void submitQrAttendance()}
                >
                  <Text style={styles.primaryButtonLabel}>
                    {markAttendance.isPending ? "Marking attendance..." : "Mark attendance"}
                  </Text>
                </Pressable>

                {markAttendance.data ? (
                  <Text style={styles.listMeta}>
                    Recorded within {Math.round(markAttendance.data.distanceMeters)}m · Present{" "}
                    {markAttendance.data.presentCount} · Absent {markAttendance.data.absentCount}
                  </Text>
                ) : null}
              </StudentCard>
            </>
          ) : null}
        </>
      )}
    </StudentScreen>
  )
}
