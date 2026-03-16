import type { ComponentType } from "react"
import { Pressable, Text, TextInput, View } from "react-native"

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

type StudentQrAttendanceScreenContentProps = {
  session: unknown
  mapStudentApiErrorToMessage: (error: unknown) => string
  readinessErrorMessage: unknown
  controller: {
    meQuery: { isLoading: boolean; error: unknown }
    classroomsQuery: { isLoading: boolean; error: unknown }
  }
  gateModel: {
    title: string
    message: string
    tone: "primary" | "success" | "warning" | "danger"
    supportHint: string
    canContinue: boolean
  }
  scannerMessage: string | null
  locationBanner: {
    tone: "primary" | "success" | "warning" | "danger"
    title: string
    message: string
  } | null
  locationState: string
  locationSnapshot: {
    latitude: number
    longitude: number
    accuracyMeters: number
  } | null
  markAttendance:
    | {
        isPending: boolean
        data?: {
          distanceMeters: number
          presentCount: number
          absentCount: number
        }
      }
    | unknown
  markRequest: {
    qrPayload: string
    latitude: number
    longitude: number
    accuracyMeters: number
  } | null
  scanBanner: {
    tone: "primary" | "success" | "warning" | "danger"
    title: string
    message: string
  }
  cameraMode: "manual" | "camera"
  isPreparingCamera: boolean
  studentRoutes: { deviceStatus: string }
  selectedCandidate: unknown
  candidates: Array<unknown>
  selectedSessionId: string | null
  scanValue: string
  cameraViewComponent: ComponentType<{
    style?: object
    barcodeScannerSettings?: {
      barcodeTypes: string[]
    }
    onBarcodeScanned?: (event: { data?: string }) => void
  }> | null
  canPrepareSubmission: boolean
  resultBanner: { tone: string; title: string; message: string } | null
  submissionBanner: { tone: string; title: string; message: string } | null
  submitEnabled: boolean
  onChangeScanValue: (nextValue: string) => void
  onSelectSession: (sessionId: string) => void
  onEnableCameraScanner: () => void | Promise<void>
  onCaptureCurrentLocation: () => void | Promise<void>
  onScannedQrPayload: (payload: string) => void
  onSubmitQrAttendance: () => void | Promise<void>
}

export function StudentQrAttendanceScreenContent(props: StudentQrAttendanceScreenContentProps) {
  const CameraPreview = props.cameraViewComponent
  const selectedCandidate = props.selectedCandidate as {
    classroomTitle: string
    lectureTitle: string
    timestamp: string
  } | null
  const markAttendance = props.markAttendance as {
    isPending: boolean
    data?: {
      distanceMeters: number
      presentCount: number
      absentCount: number
    }
  }

  return (
    <StudentScreen
      title="QR Attendance"
      subtitle="Scan the live classroom QR, confirm your location, and mark attendance in one short flow."
    >
      {!props.session ? (
        <StudentSessionSetupCard />
      ) : props.controller.meQuery.isLoading || props.controller.classroomsQuery.isLoading ? (
        <StudentLoadingCard label="Preparing QR attendance" />
      ) : props.controller.meQuery.error || props.controller.classroomsQuery.error ? (
        <StudentErrorCard label={props.mapStudentApiErrorToMessage(props.readinessErrorMessage)} />
      ) : (
        <>
          <StudentCard
            title={
              selectedCandidate
                ? `${selectedCandidate.classroomTitle} is ready`
                : props.gateModel.title
            }
            subtitle={
              selectedCandidate
                ? "Follow the steps below while the live QR attendance session is open."
                : props.gateModel.supportHint
            }
          >
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
            subtitle="Pick the classroom that is open for QR attendance right now."
          >
            {props.candidates.length ? (
              props.candidates.map((candidate) => (
                <AttendanceCandidateRow
                  key={(candidate as { sessionId: string }).sessionId}
                  candidate={candidate as never}
                  selected={
                    props.selectedSessionId === (candidate as { sessionId: string }).sessionId
                  }
                  onPress={() =>
                    props.onSelectSession((candidate as { sessionId: string }).sessionId)
                  }
                />
              ))
            ) : (
              <StudentEmptyCard label="No QR attendance session is open for your classrooms right now." />
            )}
          </StudentCard>

          {props.candidates.length > 0 ? (
            <>
              <StudentCard
                title="2. Scan QR"
                subtitle="Use the camera for the fastest path, or paste the live QR if you already have it."
              >
                <StudentStatusBanner status={props.scanBanner} />
                <TextInput
                  value={props.scanValue}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Paste live QR"
                  onChangeText={props.onChangeScanValue}
                  style={styles.input}
                />
                <View style={styles.actionGrid}>
                  <Pressable
                    style={styles.secondaryButton}
                    disabled={props.isPreparingCamera}
                    onPress={() => void props.onEnableCameraScanner()}
                  >
                    <Text style={styles.secondaryButtonLabel}>
                      {props.isPreparingCamera ? "Opening camera..." : "Use camera"}
                    </Text>
                  </Pressable>
                </View>

                {props.scannerMessage ? (
                  <Text style={styles.listMeta}>{props.scannerMessage}</Text>
                ) : null}
                {props.cameraMode === "camera" && CameraPreview ? (
                  <View style={styles.cameraPreviewFrame}>
                    <CameraPreview
                      style={styles.cameraPreview}
                      barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                      }}
                      onBarcodeScanned={(event: { data?: string }) => {
                        if (typeof event.data === "string" && event.data.length > 0) {
                          props.onScannedQrPayload(event.data)
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
                {props.locationBanner ? (
                  <StudentStatusBanner status={props.locationBanner} />
                ) : null}
                <View style={styles.actionGrid}>
                  <Pressable
                    style={styles.secondaryButton}
                    disabled={props.locationState === "CAPTURING"}
                    onPress={() => void props.onCaptureCurrentLocation()}
                  >
                    <Text style={styles.secondaryButtonLabel}>
                      {props.locationState === "CAPTURING"
                        ? "Checking location..."
                        : "Confirm location"}
                    </Text>
                  </Pressable>
                </View>

                {props.locationSnapshot ? (
                  <Text style={styles.listMeta}>
                    {props.locationSnapshot.latitude.toFixed(6)},{" "}
                    {props.locationSnapshot.longitude.toFixed(6)} ·{" "}
                    {Math.round(props.locationSnapshot.accuracyMeters)}m accuracy
                  </Text>
                ) : null}
              </StudentCard>

              <StudentCard
                title="4. Mark attendance"
                subtitle={
                  selectedCandidate
                    ? `${selectedCandidate.lectureTitle} · ${selectedCandidate.timestamp}`
                    : "Submit once the live QR and your location are ready."
                }
              >
                {props.resultBanner ? (
                  <StudentStatusBanner status={props.resultBanner as never} />
                ) : null}
                {props.submissionBanner ? (
                  <StudentStatusBanner status={props.submissionBanner as never} />
                ) : null}

                <Pressable
                  style={styles.primaryButton}
                  disabled={
                    !props.canPrepareSubmission || !props.markRequest || props.submitEnabled
                  }
                  onPress={() => void props.onSubmitQrAttendance()}
                >
                  <Text style={styles.primaryButtonLabel}>
                    {props.submitEnabled ? "Marking attendance..." : "Mark attendance"}
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
