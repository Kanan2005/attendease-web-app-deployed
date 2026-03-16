import type { ComponentType } from "react"
import { useState } from "react"
import { Platform } from "react-native"

import {
  type StudentAttendancePermissionState,
  type StudentQrLocationSnapshot,
  type StudentQrLocationState,
  buildStudentQrAttendanceErrorBanner,
  buildStudentQrLocationBanner,
  buildStudentQrMarkRequest,
  buildStudentQrScanBanner,
  resolveStudentQrCameraPermissionState,
} from "../student-attendance"
import { mapStudentApiErrorToMessage } from "../student-models"
import { studentRoutes } from "../student-routes"
import { useStudentSession } from "../student-session"
import { useStudentAttendanceController, useStudentQrMarkAttendanceMutation } from "./queries"
import { StudentQrAttendanceScreenContent } from "./student-qr-attendance-screen-content"

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
  const [scannerMessage, setScannerMessage] = useState<string | null>(null)
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
  const readinessErrorMessage = controller.meQuery.error ?? controller.classroomsQuery.error

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
    <StudentQrAttendanceScreenContent
      session={session as unknown}
      mapStudentApiErrorToMessage={mapStudentApiErrorToMessage}
      controller={controller}
      readinessErrorMessage={readinessErrorMessage}
      gateModel={controller.gateModel}
      scannerMessage={scannerMessage}
      locationBanner={locationBanner}
      locationState={locationState}
      locationSnapshot={locationSnapshot}
      markAttendance={markAttendance}
      markRequest={markRequest}
      scanBanner={scanBanner}
      cameraMode={cameraMode}
      isPreparingCamera={isPreparingCamera}
      studentRoutes={studentRoutes}
      selectedCandidate={controller.selectedCandidate}
      candidates={controller.candidates}
      selectedSessionId={controller.selectedSessionId}
      scanValue={controller.scanValue}
      cameraViewComponent={CameraPreview}
      canPrepareSubmission={controller.canPrepareSubmission}
      resultBanner={controller.snapshot.resultBanner}
      submissionBanner={submissionBanner}
      submitEnabled={markAttendance.isPending}
      onChangeScanValue={(nextValue) => {
        controller.setScanValue(nextValue)
        setSubmissionBanner(null)
        markAttendance.reset()
      }}
      onSelectSession={controller.setSelectedSessionId}
      onEnableCameraScanner={enableCameraScanner}
      onCaptureCurrentLocation={captureCurrentLocation}
      onScannedQrPayload={handleScannedQrPayload}
      onSubmitQrAttendance={submitQrAttendance}
    />
  )
}
