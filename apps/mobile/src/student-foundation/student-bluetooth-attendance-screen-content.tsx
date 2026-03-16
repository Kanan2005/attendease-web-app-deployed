import { Pressable, Text, View } from "react-native"

import type { BluetoothAvailability } from "../native/bluetooth"
import type { StudentScreenStatus } from "../student-view-state"
import type { StudentAttendanceCandidate } from "../student-workflow-models"
import {
  AttendanceCandidateRow,
  StudentCard,
  StudentEmptyCard,
  StudentErrorCard,
  StudentLoadingCard,
  StudentNavAction,
  StudentScreen,
  StudentSessionSetupCard,
  StudentStatusBanner,
  styles,
  toneColorStyle,
} from "./shared-ui"

type BluetoothDetection = {
  payload: string
  detectedAt: number
  rssi: number | null
}

type BluetoothScannerModel = {
  state: string
  detections: BluetoothDetection[]
  errorMessage?: string | null
  start: () => Promise<boolean>
  stop: () => Promise<void>
  refreshAvailability: () => Promise<BluetoothAvailability | null>
  clearDetections: () => void
}

type StudentBluetoothStateModel = {
  isLoading: boolean
  error: unknown
}

type Props = {
  session: unknown
  mapStudentApiErrorToMessage: (error: unknown) => string
  studentRoutes: { deviceStatus: string }
  gateModel: {
    title: string
    message: string
    tone: "primary" | "success" | "warning" | "danger"
    supportHint: string
    canContinue: boolean
  }
  meQuery: StudentBluetoothStateModel
  classroomsQuery: StudentBluetoothStateModel
  candidates: StudentAttendanceCandidate[]
  selectedSessionId: string | null
  onSelectSession: (sessionId: string) => void
  isRefreshingSessions: boolean
  onRefreshSessions: () => Promise<void> | void
  refreshStatus: StudentScreenStatus
  scanBanner: StudentScreenStatus
  detectionBanner: StudentScreenStatus
  scanner: BluetoothScannerModel
  hasMultipleDetections: boolean
  detectionCount: number
  preferredDetection: BluetoothDetection | null
  selectedDetectionPayload: string | null
  onSelectDetection: (payload: string) => void
  onScanStart: () => Promise<boolean>
  onScanStop: () => Promise<void>
  onRefreshBluetooth: () => Promise<BluetoothAvailability | null>
  onMarkAttendance: () => Promise<void>
  canPrepareSubmission: boolean
  markInProgress: boolean
  markErrorBanner: StudentScreenStatus | null
  submissionBanner: StudentScreenStatus | null
  resultBanner: StudentScreenStatus | null
  selectedCandidate: { classroomTitle?: string } | null
  describeBluetoothSignalStrength: (rssi: number | null) => string
  onClearDetections: () => void
}

export function StudentBluetoothAttendanceScreenContent(props: Props) {
  const selectedCandidate = props.selectedCandidate

  return (
    <StudentScreen
      title="Bluetooth Attendance"
      subtitle="Keep this phone near your teacher, choose the live Bluetooth session, and mark attendance in a short flow."
    >
      {!props.session ? (
        <StudentSessionSetupCard />
      ) : props.meQuery.isLoading || props.classroomsQuery.isLoading ? (
        <StudentLoadingCard label="Preparing Bluetooth attendance" />
      ) : props.meQuery.error || props.classroomsQuery.error ? (
        <StudentErrorCard
          label={props.mapStudentApiErrorToMessage(
            props.meQuery.error ?? props.classroomsQuery.error,
          )}
        />
      ) : (
        <>
          <StudentCard title={props.gateModel.title} subtitle={props.gateModel.supportHint}>
            <Text style={[styles.bodyText, toneColorStyle(props.gateModel.tone)]}>
              {props.gateModel.message}
            </Text>
            {!props.gateModel.canContinue ? (
              <View style={styles.actionGrid}>
                <StudentNavAction
                  href={props.studentRoutes.deviceStatus}
                  label="Open device status"
                />
              </View>
            ) : null}
          </StudentCard>

          <StudentCard
            title="1. Choose session"
            subtitle="Bluetooth attendance is matched against the live classroom session you choose here."
          >
            <StudentStatusBanner status={props.refreshStatus} />
            {props.candidates.length ? (
              props.candidates.map((candidate) => (
                <AttendanceCandidateRow
                  key={candidate.sessionId}
                  candidate={candidate}
                  selected={props.selectedSessionId === candidate.sessionId}
                  onPress={() => props.onSelectSession(candidate.sessionId)}
                />
              ))
            ) : (
              <StudentEmptyCard label="No Bluetooth attendance session is open for your classrooms right now." />
            )}
            <View style={styles.actionGrid}>
              <Pressable
                style={styles.secondaryButton}
                disabled={props.isRefreshingSessions}
                onPress={() => void props.onRefreshSessions()}
              >
                <Text style={styles.secondaryButtonLabel}>
                  {props.isRefreshingSessions ? "Refreshing..." : "Refresh Bluetooth sessions"}
                </Text>
              </Pressable>
            </View>
          </StudentCard>

          {selectedCandidate ? (
            <>
              <StudentCard
                title="2. Check Bluetooth"
                subtitle="AttendEase checks Bluetooth before it starts looking for the teacher nearby."
              >
                <StudentStatusBanner status={props.scanBanner} />
                <View style={styles.actionGrid}>
                  <Pressable
                    style={styles.secondaryButton}
                    disabled={props.scanner.state === "SCANNING"}
                    onPress={() => void props.onScanStart()}
                  >
                    <Text style={styles.secondaryButtonLabel}>Start Scan</Text>
                  </Pressable>
                  <Pressable
                    style={styles.secondaryButton}
                    disabled={props.scanner.state !== "SCANNING"}
                    onPress={() => void props.onScanStop()}
                  >
                    <Text style={styles.secondaryButtonLabel}>Stop Scan</Text>
                  </Pressable>
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => void props.onRefreshBluetooth()}
                  >
                    <Text style={styles.secondaryButtonLabel}>Refresh Bluetooth</Text>
                  </Pressable>
                </View>
                <Text style={styles.listMeta}>Bluetooth scan state: {props.scanner.state}</Text>
              </StudentCard>

              <StudentCard
                title={
                  props.hasMultipleDetections
                    ? "3. Choose nearby teacher"
                    : "3. Scan nearby teacher"
                }
                subtitle="Keep this phone close to your teacher until the live classroom session appears."
              >
                <StudentStatusBanner status={props.detectionBanner} />
                {props.detectionCount ? (
                  props.scanner.detections.map((detection) => (
                    <Pressable
                      key={`${detection.payload}-${detection.detectedAt}`}
                      style={styles.listRow}
                      onPress={() => {
                        props.onSelectDetection(detection.payload)
                      }}
                    >
                      <Text style={styles.listTitle}>
                        {props.hasMultipleDetections
                          ? props.selectedDetectionPayload === detection.payload
                            ? "Selected nearby teacher"
                            : "Nearby teacher"
                          : "Nearby teacher"}
                      </Text>
                      <Text style={styles.listMeta}>
                        {props.describeBluetoothSignalStrength(detection.rssi)} ·{" "}
                        {new Date(detection.detectedAt).toLocaleTimeString()}
                      </Text>
                      {props.hasMultipleDetections ? (
                        <Text style={styles.listMeta}>
                          {props.selectedDetectionPayload === detection.payload
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
                      props.scanner.state === "SCANNING"
                        ? "Keep the phone near your teacher while AttendEase looks for a live Bluetooth session."
                        : "Start or refresh the scan when you are close to the teacher running attendance."
                    }
                  />
                )}
                {props.preferredDetection && props.hasMultipleDetections ? (
                  <Text style={styles.listMeta}>
                    Selected teacher signal seen at{" "}
                    {new Date(props.preferredDetection.detectedAt).toLocaleTimeString()}.
                  </Text>
                ) : null}
              </StudentCard>

              <StudentCard
                title="4. Mark attendance"
                subtitle="AttendEase submits attendance only after this phone is trusted and a nearby teacher session is selected."
              >
                {props.submissionBanner ? (
                  <StudentStatusBanner status={props.submissionBanner} />
                ) : null}
                <Pressable
                  style={styles.primaryButton}
                  disabled={
                    !props.canPrepareSubmission || !props.preferredDetection || props.markInProgress
                  }
                  onPress={() => void props.onMarkAttendance()}
                >
                  <Text style={styles.primaryButtonLabel}>
                    {props.markInProgress ? "Marking attendance..." : "Mark attendance"}
                  </Text>
                </Pressable>
                {props.preferredDetection ? (
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => props.onClearDetections()}
                  >
                    <Text style={styles.secondaryButtonLabel}>Clear nearby sessions</Text>
                  </Pressable>
                ) : null}
                {props.resultBanner ? <StudentStatusBanner status={props.resultBanner} /> : null}
                {props.markErrorBanner ? (
                  <StudentStatusBanner status={props.markErrorBanner} />
                ) : null}
              </StudentCard>
            </>
          ) : null}
        </>
      )}
    </StudentScreen>
  )
}
