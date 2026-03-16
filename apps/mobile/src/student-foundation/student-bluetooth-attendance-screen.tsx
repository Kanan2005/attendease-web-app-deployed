import { useEffect, useState } from "react"

import { loadMobileEnv } from "@attendease/config"
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
import { useStudentBluetoothMarkAttendanceMutation as useBluetoothMarkMutation } from "../bluetooth-attendance"
import {
  type StudentAttendancePermissionState,
  buildStudentBluetoothAttendanceErrorBanner,
  buildStudentBluetoothMarkRequest,
} from "../student-attendance"
import { mapStudentApiErrorToMessage } from "../student-models"
import { studentRoutes } from "../student-routes"
import { useStudentSession } from "../student-session"
import { buildStudentAttendanceRefreshStatus } from "../student-view-state"
import type { StudentAttendanceCandidate } from "../student-workflow-models"
import { useStudentAttendanceController } from "./queries"
import { StudentBluetoothAttendanceScreenContent } from "./student-bluetooth-attendance-screen-content"

const env = loadMobileEnv(process.env as Record<string, string | undefined>)

export function StudentBluetoothAttendanceScreen() {
  const { session } = useStudentSession()
  const controller = useStudentAttendanceController("BLUETOOTH")
  const scannerEnabled = Boolean(controller.selectedCandidate && controller.gateModel.canContinue)
  const scanner = useStudentBluetoothScanner(
    env.EXPO_PUBLIC_ATTENDANCE_BLUETOOTH_SERVICE_UUID,
    scannerEnabled,
  )
  const bluetoothMarkMutation = useBluetoothMarkMutation()
  const [selectedDetectionPayload, setSelectedDetectionPayload] = useState<string | null>(null)
  const preferredDetection = resolveSelectedBluetoothDetection({
    detections: scanner.detections,
    selectedPayload: selectedDetectionPayload,
  })
  const suggestedDetection = usePreferredBluetoothDetection(scanner.detections)
  const bluetoothPermissionState: StudentAttendancePermissionState =
    mapBluetoothAvailabilityToPermissionState(scanner.availability)
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

  const refreshSessions = async () => {
    setIsRefreshingSessions(true)
    try {
      await controller.refreshExperience()
    } finally {
      setIsRefreshingSessions(false)
    }
  }

  const markAttendance = async () => {
    if (!preferredDetection) {
      return
    }

    controller.prepareSubmission()

    try {
      await bluetoothMarkMutation.mutateAsync(
        buildStudentBluetoothMarkRequest({
          detectedPayload: preferredDetection.payload,
          rssi: preferredDetection.rssi,
          deviceTimestamp: new Date(preferredDetection.detectedAt).toISOString(),
        }),
      )
      await controller.refreshAfterSuccess()
    } catch {
      controller.setResultKind("ERROR")
    }
  }

  const selectSession = (sessionId: string) => {
    setSelectedDetectionPayload(null)
    controller.setSelectedSessionId(sessionId)
    scanner.clearDetections()
  }

  const canPrepareSubmission = controller.canPrepareSubmission && Boolean(preferredDetection)

  return (
    <StudentBluetoothAttendanceScreenContent
      session={session as unknown}
      mapStudentApiErrorToMessage={mapStudentApiErrorToMessage}
      studentRoutes={studentRoutes}
      gateModel={controller.gateModel}
      meQuery={controller.meQuery}
      classroomsQuery={controller.classroomsQuery}
      candidates={controller.candidates as StudentAttendanceCandidate[]}
      selectedSessionId={controller.selectedSessionId}
      onSelectSession={selectSession}
      isRefreshingSessions={isRefreshingSessions}
      onRefreshSessions={refreshSessions}
      refreshStatus={refreshStatus}
      scanBanner={scanBanner}
      detectionBanner={detectionBanner}
      scanner={scanner}
      hasMultipleDetections={hasMultipleDetections}
      detectionCount={scanner.detections.length}
      preferredDetection={preferredDetection}
      selectedDetectionPayload={selectedDetectionPayload}
      onSelectDetection={setSelectedDetectionPayload}
      onScanStart={() => scanner.start()}
      onScanStop={() => scanner.stop()}
      onRefreshBluetooth={() => scanner.refreshAvailability()}
      onMarkAttendance={markAttendance}
      canPrepareSubmission={canPrepareSubmission}
      markInProgress={bluetoothMarkMutation.isPending}
      markErrorBanner={
        bluetoothMarkMutation.error
          ? buildStudentBluetoothAttendanceErrorBanner(bluetoothMarkMutation.error)
          : null
      }
      submissionBanner={submissionBanner}
      resultBanner={controller.snapshot.resultBanner}
      selectedCandidate={controller.selectedCandidate as { classroomTitle?: string } | null}
      describeBluetoothSignalStrength={describeBluetoothSignalStrength}
      onClearDetections={() => {
        scanner.clearDetections()
        setSelectedDetectionPayload(null)
      }}
    />
  )
}
