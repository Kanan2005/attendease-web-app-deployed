import { AuthApiClientError } from "@attendease/auth"
import { getColors } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useRouter } from "expo-router"
import type { ComponentType } from "react"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { PermissionsAndroid, Platform, Pressable } from "react-native"

import type { StudentQrLocationSnapshot } from "../student-attendance"
import { mapStudentApiErrorToMessage } from "../student-models"
import { studentRoutes } from "../student-routes"
import { useStudentSession } from "../student-session"
import { useStudentAttendanceController, useStudentQrMarkAttendanceMutation } from "./queries"
import { StudentQrAttendanceScreenContent } from "./student-qr-attendance-screen-content"

type CameraViewType = ComponentType<{
  style?: object
  zoom?: number
  barcodeScannerSettings?: { barcodeTypes: string[] }
  onBarcodeScanned?: (event: { data?: string }) => void
}>

type QrPhase =
  | "loading"
  | "camera_denied"
  | "location_denied"
  | "location_unavailable"
  | "camera"
  | "verifying"
  | "success"
  | "already_marked" // v2.0: API returned 409 — attendance was already recorded for this session
  | "error"

type GpsStatus = "pending" | "acquiring" | "ready" | "denied" | "unavailable"

async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA)
    return result === PermissionsAndroid.RESULTS.GRANTED
  }
  // iOS: expo-camera handles permission via CameraView rendering, or use expo-camera API
  return true
}

export function StudentQrAttendanceScreen(props: { classroomId?: string }) {
  const { session } = useStudentSession()
  const router = useRouter()
  const navigation = useNavigation()

  useLayoutEffect(() => {
    if (props.classroomId) {
      navigation.setOptions({
        headerLeft: () => (
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginLeft: 4 }}>
            <Ionicons name="chevron-back" size={26} color={getColors().primary} />
          </Pressable>
        ),
      })
    }
  }, [props.classroomId, navigation, router])

  const controller = useStudentAttendanceController("QR_GPS")
  const markMutation = useStudentQrMarkAttendanceMutation()

  const [phase, setPhase] = useState<QrPhase>("loading")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [cameraComponent, setCameraComponent] = useState<CameraViewType | null>(null)
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("pending")
  // v2.0: Incrementing counter that forces the init effect to re-run on retry.
  const [retryCount, setRetryCount] = useState(0)
  const isSubmitting = useRef(false)
  const preAcquiredLocation = useRef<StudentQrLocationSnapshot | null>(null)
  const isLocationError = useRef(false)

  // v2.0: Runs on mount and re-runs whenever retryCount changes (after user taps Retry/Scan Again).
  // Handles permission requests, camera loading, and GPS pre-acquisition.
  useEffect(() => {
    let cancelled = false

    if (Platform.OS === "web") {
      setPhase("error")
      setErrorMsg("Camera scanning is not available on web. Use a device build.")
      return
    }

    void (async () => {
      try {
        // 1. Check location services are enabled before anything else
        const locationModule = require("expo-location") as typeof import("expo-location")
        const locationServicesEnabled = await locationModule.hasServicesEnabledAsync()
        if (cancelled) return
        if (!locationServicesEnabled) {
          setPhase("location_unavailable")
          setGpsStatus("unavailable")
          return
        }

        // 2. Request location permission early so student knows immediately
        const locPerm = await locationModule.requestForegroundPermissionsAsync()
        if (cancelled) return
        if (!locPerm.granted) {
          setPhase("location_denied")
          setGpsStatus("denied")
          return
        }

        // 3. Request camera permission via React Native API
        const cameraGranted = await requestCameraPermission()
        if (cancelled) return
        if (!cameraGranted) {
          setPhase("camera_denied")
          return
        }

        // 4. Dynamically load CameraView from expo-camera
        const camModule = await import("expo-camera")
        const CameraViewComp =
          camModule.CameraView ?? (camModule as Record<string, unknown>).default
        if (cancelled) return
        if (!CameraViewComp) {
          setPhase("error")
          setErrorMsg("Camera component is not available in this build.")
          return
        }
        setCameraComponent(() => CameraViewComp as unknown as CameraViewType)
        setPhase("camera")

        // v2.0: Pre-acquire GPS with retries — camera is visible but scanning
        // is blocked until GPS locks. QR codes rotate frequently so we must
        // have location ready before processing any scan.
        setGpsStatus("acquiring")
        const GPS_MAX_RETRIES = 3
        const GPS_RETRY_DELAY_MS = 3000
        for (let attempt = 0; attempt < GPS_MAX_RETRIES; attempt++) {
          if (cancelled) return
          try {
            const loc = await locationModule.getCurrentPositionAsync({
              accuracy: locationModule.Accuracy.High,
            })
            if (cancelled) return
            preAcquiredLocation.current = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracyMeters: Math.max(1, loc.coords.accuracy ?? 1),
              capturedAt: new Date(loc.timestamp).toISOString(),
            }
            setGpsStatus("ready")
            break
          } catch {
            if (attempt < GPS_MAX_RETRIES - 1) {
              await new Promise((r) => setTimeout(r, GPS_RETRY_DELAY_MS))
            } else {
              // v2.0: All GPS retries exhausted — show actionable error instead
              // of leaving student stuck on camera with permanent overlay.
              isLocationError.current = true
              setGpsStatus("unavailable")
              setPhase("error")
              setErrorMsg(
                "Could not acquire GPS after multiple attempts. Move to an area with better signal and try again.",
              )
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setPhase("error")
          setErrorMsg(err instanceof Error ? err.message : "Could not initialize camera.")
        }
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount])

  // v2.0: Submits the QR payload with the pre-acquired GPS location.
  const submitMark = useCallback(
    async (qrPayload: string, location: StudentQrLocationSnapshot) => {
      try {
        setPhase("verifying")
        await markMutation.mutateAsync({ qrPayload, location })
        await controller.refreshAfterSuccess()
        setPhase("success")
      } catch (err) {
        // v2.0: Detect 409 "already marked" and show friendly UI instead of error
        if (
          err instanceof AuthApiClientError &&
          err.status === 409 &&
          typeof err.details === "object" &&
          err.details !== null &&
          "message" in err.details &&
          typeof (err.details as { message?: unknown }).message === "string" &&
          ((err.details as { message: string }).message.toLowerCase().includes("already been marked") ||
            (err.details as { message: string }).message.toLowerCase().includes("already marked"))
        ) {
          setPhase("already_marked")
        } else {
          setPhase("error")
          setErrorMsg(mapStudentApiErrorToMessage(err))
        }
        isSubmitting.current = false
      }
    },
    [markMutation, controller],
  )

  // v2.0: Scans are only processed when GPS is locked. QR codes rotate every
  // few seconds, so storing a scan and waiting for GPS would cause token expiry.
  // The camera overlay visually blocks scanning while GPS is acquiring.
  const handleBarcodeScan = useCallback(
    (payload: string) => {
      if (isSubmitting.current) return
      if (!payload || payload.length < 4) return
      if (!preAcquiredLocation.current) return // GPS not ready — ignore scan entirely
      isSubmitting.current = true
      void submitMark(payload, preAcquiredLocation.current)
    },
    [submitMark],
  )

  const isLoading = controller.meQuery.isLoading || controller.classroomsQuery.isLoading
  const loadError = controller.meQuery.error ?? controller.classroomsQuery.error

  // v2.0: Full reset that re-triggers init by bumping retryCount
  const handleRetry = useCallback(() => {
    isSubmitting.current = false
    isLocationError.current = false
    preAcquiredLocation.current = null
    markMutation.reset()
    setPhase("loading")
    setErrorMsg(null)
    setGpsStatus("pending")
    setRetryCount((c) => c + 1)
  }, [markMutation])

  // v2.0: Navigates back; uses router.back() if navigation history exists,
  // otherwise falls back to the student classrooms list.
  const handleGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace(studentRoutes.classrooms)
    }
  }, [router])

  return (
    <StudentQrAttendanceScreenContent
      hasSession={Boolean(session)}
      isLoading={isLoading}
      loadError={loadError ? mapStudentApiErrorToMessage(loadError) : null}
      phase={phase}
      errorMessage={errorMsg}
      gpsStatus={gpsStatus}
      isLocationError={isLocationError.current}
      CameraView={cameraComponent}
      markData={markMutation.data ?? null}
      classroomTitle={
        (controller.selectedCandidate as { classroomTitle?: string } | null)?.classroomTitle ?? null
      }
      onBarcodeScan={handleBarcodeScan}
      onRetry={handleRetry}
      onGoBack={handleGoBack}
    />
  )
}
