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

type QrPhase = "loading" | "camera_denied" | "location_denied" | "location_unavailable" | "camera" | "verifying" | "success" | "error"

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
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={{ marginLeft: 4 }}
          >
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
  const isSubmitting = useRef(false)
  const initStarted = useRef(false)
  const preAcquiredLocation = useRef<StudentQrLocationSnapshot | null>(null)
  const isLocationError = useRef(false)

  // Auto-request camera + location permissions and load CameraView on mount
  useEffect(() => {
    if (initStarted.current) return
    initStarted.current = true

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
        if (!locationServicesEnabled) {
          setPhase("location_unavailable")
          setGpsStatus("unavailable")
          return
        }

        // 2. Request location permission early so student knows immediately
        const locPerm = await locationModule.requestForegroundPermissionsAsync()
        if (!locPerm.granted) {
          setPhase("location_denied")
          setGpsStatus("denied")
          return
        }

        // 3. Request camera permission via React Native API
        const cameraGranted = await requestCameraPermission()
        if (!cameraGranted) {
          setPhase("camera_denied")
          return
        }

        // 4. Dynamically load CameraView from expo-camera
        const camModule = await import("expo-camera")
        const CameraViewComp = camModule.CameraView ?? (camModule as Record<string, unknown>)["default"]
        if (!CameraViewComp) {
          setPhase("error")
          setErrorMsg("Camera component is not available in this build.")
          return
        }
        setCameraComponent(() => CameraViewComp as unknown as CameraViewType)
        setPhase("camera")

        // 5. Pre-acquire GPS location while camera is active so it's
        //    ready when a QR code is scanned (avoids token expiry)
        setGpsStatus("acquiring")
        try {
          const loc = await locationModule.getCurrentPositionAsync({
            accuracy: locationModule.Accuracy.High,
          })
          preAcquiredLocation.current = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracyMeters: Math.max(1, loc.coords.accuracy ?? 1),
            capturedAt: new Date(loc.timestamp).toISOString(),
          }
          setGpsStatus("ready")
        } catch {
          // GPS acquisition failed but permission was granted; will retry on scan
          setGpsStatus("pending")
        }
      } catch (err) {
        setPhase("error")
        setErrorMsg(err instanceof Error ? err.message : "Could not initialize camera.")
      }
    })()
  }, [])

  const handleBarcodeScan = useCallback(
    (payload: string) => {
      if (isSubmitting.current) return
      if (!payload || payload.length < 4) return
      isSubmitting.current = true
      setPhase("verifying")

      void (async () => {
        try {
          let location: StudentQrLocationSnapshot

          if (preAcquiredLocation.current) {
            // Use pre-acquired location to avoid GPS delay causing QR token expiry
            location = preAcquiredLocation.current
          } else {
            // Fallback: acquire location now if pre-acquisition failed
            const locationModule = require("expo-location") as typeof import("expo-location")
            const locationServicesEnabled = await locationModule.hasServicesEnabledAsync()
            if (!locationServicesEnabled) {
              setPhase("error")
              setErrorMsg("Location services are turned off. Enable GPS in your device settings to mark QR attendance.")
              isLocationError.current = true
              isSubmitting.current = false
              return
            }
            const locPerm = await locationModule.requestForegroundPermissionsAsync()
            if (!locPerm.granted) {
              setPhase("error")
              setErrorMsg("Location permission denied. Enable location access in your device settings to mark QR attendance.")
              isLocationError.current = true
              isSubmitting.current = false
              return
            }
            const loc = await locationModule.getCurrentPositionAsync({
              accuracy: locationModule.Accuracy.High,
            })
            location = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracyMeters: Math.max(1, loc.coords.accuracy ?? 1),
              capturedAt: new Date(loc.timestamp).toISOString(),
            }
          }

          await markMutation.mutateAsync({ qrPayload: payload, location })
          await controller.refreshAfterSuccess()
          setPhase("success")
        } catch (err) {
          setPhase("error")
          setErrorMsg(mapStudentApiErrorToMessage(err))
          isSubmitting.current = false
        }
      })()
    },
    [markMutation, controller],
  )

  const isLoading = controller.meQuery.isLoading || controller.classroomsQuery.isLoading
  const loadError = controller.meQuery.error ?? controller.classroomsQuery.error

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
      onRetry={() => {
        isSubmitting.current = false
        initStarted.current = false
        isLocationError.current = false
        markMutation.reset()
        setPhase("loading")
        setErrorMsg(null)
        setGpsStatus("pending")
      }}
    />
  )
}
