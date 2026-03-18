import { getColors } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useRouter } from "expo-router"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Linking, Pressable } from "react-native"

import { loadMobileEnv } from "@attendease/config"
import {
  mapBluetoothAvailabilityToPermissionState,
  usePreferredBluetoothDetection,
  useStudentBluetoothMarkAttendanceMutation,
  useStudentBluetoothScanner,
} from "../bluetooth-attendance"
import {
  type StudentAttendancePermissionState,
  buildStudentBluetoothMarkRequest,
} from "../student-attendance"
import { mapStudentApiErrorToMessage } from "../student-models"
import { studentRoutes } from "../student-routes"
import { useStudentSession } from "../student-session"
import { useStudentAttendanceController } from "./queries"
import { StudentBluetoothAttendanceScreenContent } from "./student-bluetooth-attendance-screen-content"

const env = loadMobileEnv(process.env as Record<string, string | undefined>)

export function StudentBluetoothAttendanceScreen(props: { classroomId?: string }) {
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
  const controller = useStudentAttendanceController("BLUETOOTH")
  const scannerEnabled = Boolean(controller.selectedCandidate && controller.gateModel.canContinue)
  const scanner = useStudentBluetoothScanner(
    env.EXPO_PUBLIC_ATTENDANCE_BLUETOOTH_SERVICE_UUID,
    scannerEnabled,
  )
  const bluetoothMarkMutation = useStudentBluetoothMarkAttendanceMutation()
  const suggestedDetection = usePreferredBluetoothDetection(scanner.detections)
  const bluetoothPermissionState: StudentAttendancePermissionState =
    mapBluetoothAvailabilityToPermissionState(scanner.availability)

  const didAutoMark = useRef(false)
  const [phase, setPhase] = useState<"scanning" | "marking" | "success" | "error">("scanning")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Sync bluetooth permission state
  useEffect(() => {
    if (!scanner.availability) return
    if (bluetoothPermissionState === controller.permissionState) return
    controller.setPermissionState(bluetoothPermissionState)
  }, [bluetoothPermissionState, controller.permissionState, controller.setPermissionState, scanner.availability])

  // Auto-mark attendance when a detection is found
  useEffect(() => {
    if (didAutoMark.current) return
    if (!suggestedDetection) return
    if (!controller.selectedCandidate) return
    if (!controller.canPrepareSubmission) return
    if (bluetoothMarkMutation.isPending) return

    didAutoMark.current = true
    setPhase("marking")

    controller.prepareSubmission()
    bluetoothMarkMutation
      .mutateAsync(
        buildStudentBluetoothMarkRequest({
          detectedPayload: suggestedDetection.payload,
          rssi: suggestedDetection.rssi,
          deviceTimestamp: new Date(suggestedDetection.detectedAt).toISOString(),
        }),
      )
      .then(async () => {
        await controller.refreshAfterSuccess()
        setPhase("success")
      })
      .catch((err) => {
        setPhase("error")
        setErrorMsg(err instanceof Error ? err.message : "Failed to mark attendance")
        didAutoMark.current = false
      })
  }, [suggestedDetection, controller.selectedCandidate, controller.canPrepareSubmission, bluetoothMarkMutation.isPending])

  const isLoading = controller.meQuery.isLoading || controller.classroomsQuery.isLoading
  const loadError = controller.meQuery.error ?? controller.classroomsQuery.error
  const isBluetoothOff = Boolean(scanner.availability && !scanner.availability.poweredOn)
  const isPermissionIssue = !isBluetoothOff && (scanner.state === "PERMISSION_REQUIRED" || scanner.state === "FAILED")
  const noCandidates = !isLoading && !loadError && controller.candidates.length === 0

  return (
    <StudentBluetoothAttendanceScreenContent
      hasSession={Boolean(session)}
      isLoading={isLoading}
      loadError={loadError ? mapStudentApiErrorToMessage(loadError) : null}
      phase={phase}
      errorMessage={errorMsg ?? scanner.errorMessage ?? null}
      isBluetoothOff={isBluetoothOff}
      isPermissionIssue={isPermissionIssue}
      noCandidates={noCandidates}
      scannerState={scanner.state}
      classroomTitle={controller.selectedCandidate?.classroomTitle ?? null}
      markData={bluetoothMarkMutation.data ?? null}
      onRetry={() => {
        didAutoMark.current = false
        setPhase("scanning")
        setErrorMsg(null)
        scanner.clearDetections()
        void scanner.start()
      }}
      onOpenSettings={() => void Linking.openSettings()}
    />
  )
}
