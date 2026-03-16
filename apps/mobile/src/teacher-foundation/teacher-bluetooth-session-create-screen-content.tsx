import { Pressable, Text, TextInput, View } from "react-native"

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { teacherRoutes } from "../teacher-routes"
import { formatEnum } from "./shared-ui"
import {
  TeacherCard,
  TeacherEmptyCard,
  TeacherErrorCard,
  TeacherLoadingCard,
  TeacherNavAction,
  TeacherScreen,
  TeacherSessionSetupCard,
  TeacherStatusBanner,
  styles,
} from "./shared-ui"

type BluetoothCandidatesViewModel = {
  candidates: Array<{
    sessionId: string
    classroomId: string
    classTitle?: string
    classroomTitle: string
    lectureId: string | null
    lectureTitle: string
    durationMinutes: number
    bluetoothRotationWindowSeconds: number
    status: string
  }>
  classroomsQuery: { isLoading: boolean; error: unknown | null }
  lectureSets: { isLoading: boolean; error: unknown | null }
}

type SessionShellModel = {
  title: string
  message: string
  stateTone: "primary" | "success" | "warning" | "danger"
  canOpenActiveShell: boolean
}

type SetupStatusModel = {
  stateTone: "primary" | "success" | "warning" | "danger"
  title: string
  message: string
  startLabel: string
}

type Props = {
  session: unknown
  bluetooth: BluetoothCandidatesViewModel
  selectedSessionId: string
  selectedCandidate: BluetoothCandidatesViewModel["candidates"][number] | null
  sessionShell: SessionShellModel
  setupStatus: SetupStatusModel
  durationMinutes: string
  normalizedDurationMinutes: number
  quickBackLink:
    | string
    | {
        pathname: string
        params?: Record<string, string>
      }
  quickBackLabel: string
  createSessionMutation: {
    error: unknown | null
    isPending: boolean
  }
  onSelectSession: (sessionId: string) => void
  onSetDurationMinutes: (value: string) => void
  onStartSession: () => Promise<void> | void
}

export function TeacherBluetoothSessionCreateScreenContent({
  session,
  bluetooth,
  selectedSessionId,
  selectedCandidate,
  sessionShell,
  setupStatus,
  durationMinutes,
  normalizedDurationMinutes,
  quickBackLink,
  quickBackLabel,
  createSessionMutation,
  onSelectSession,
  onSetDurationMinutes,
  onStartSession,
}: Props) {
  const isLoading = bluetooth.classroomsQuery.isLoading || bluetooth.lectureSets.isLoading
  const loadError = bluetooth.classroomsQuery.error ?? bluetooth.lectureSets.error

  if (!session) {
    return <TeacherSessionSetupCard />
  }

  if (isLoading) {
    return <TeacherLoadingCard label="Loading Bluetooth classroom context" />
  }

  if (loadError) {
    return <TeacherErrorCard label={mapTeacherApiErrorToMessage(loadError)} />
  }

  return (
    <TeacherScreen
      title="Bluetooth Session"
      subtitle="Teacher mobile creates the live Bluetooth session here, then hands off to the native advertiser controller."
    >
      <TeacherStatusBanner
        status={{
          tone: setupStatus.stateTone,
          title: setupStatus.title,
          message: setupStatus.message,
        }}
      />

      <TeacherCard
        title="Session Setup"
        subtitle="Choose the classroom, confirm the class-session context, and start Bluetooth attendance from this phone."
      >
        <View style={styles.actionGrid}>
          <TeacherNavAction href={teacherRoutes.home} label="Teacher Home" />
          <TeacherNavAction href={quickBackLink} label={quickBackLabel} />
          <TeacherNavAction href={teacherRoutes.sessionHistory} label="Session History" />
        </View>
        <View style={styles.cardGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Classroom</Text>
            <Text style={[styles.metricValue, styles.primaryTone]}>
              {selectedCandidate?.classroomTitle ?? "Choose one"}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Class Session</Text>
            <Text style={[styles.metricValue, styles.successTone]}>
              {selectedCandidate?.lectureId ? "Linked" : "Classroom only"}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Duration</Text>
            <Text style={[styles.metricValue, styles.warningTone]}>
              {selectedCandidate ? `${normalizedDurationMinutes}m` : "--"}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Rotation</Text>
            <Text style={[styles.metricValue, styles.dangerTone]}>
              {selectedCandidate ? `${selectedCandidate.bluetoothRotationWindowSeconds}s` : "--"}
            </Text>
          </View>
        </View>
        <Text style={styles.fieldLabel}>Duration In Minutes</Text>
        <TextInput
          value={durationMinutes}
          autoCapitalize="none"
          keyboardType="number-pad"
          placeholder="Duration minutes"
          onChangeText={onSetDurationMinutes}
          style={styles.input}
        />
        <Text style={styles.listMeta}>
          {selectedCandidate?.lectureId
            ? `Class session: ${selectedCandidate.lectureTitle}`
            : "No class session is linked yet. Teacher mobile will still create a classroom attendance session."}
        </Text>
        <Text style={styles.bodyText}>
          Keep teacher mobile open in the foreground while students nearby mark Bluetooth
          attendance.
        </Text>
        {createSessionMutation.error ? (
          <Text style={styles.errorText}>
            {mapTeacherApiErrorToMessage(createSessionMutation.error)}
          </Text>
        ) : null}
      </TeacherCard>

      <TeacherCard
        title="Choose Classroom"
        subtitle="Open class sessions appear first. If no class session is linked yet, you can still start Bluetooth attendance from classroom context."
      >
        {bluetooth.candidates.length ? (
          bluetooth.candidates.map((candidate) => (
            <Pressable
              key={candidate.sessionId}
              style={[
                styles.selectionCard,
                selectedSessionId === candidate.sessionId ? styles.selectionCardActive : null,
              ]}
              onPress={() => onSelectSession(candidate.sessionId)}
            >
              <Text style={styles.listTitle}>{candidate.classroomTitle}</Text>
              <Text style={styles.listMeta}>{candidate.lectureTitle}</Text>
              <Text style={styles.listMeta}>
                {formatEnum(candidate.status as never)} · Suggested duration{" "}
                {candidate.durationMinutes} min
                {" · "}Rotation {candidate.bluetoothRotationWindowSeconds}s
              </Text>
            </Pressable>
          ))
        ) : (
          <TeacherEmptyCard label="No classroom candidates are available for Bluetooth attendance yet." />
        )}
      </TeacherCard>

      {selectedCandidate ? (
        <TeacherCard
          title="Start Bluetooth Attendance"
          subtitle="AttendEase creates the backend session first, then opens the active teacher control screen for Bluetooth broadcast."
        >
          <Text style={styles.bodyText}>{sessionShell.message}</Text>
          <Pressable
            style={[
              styles.primaryButton,
              !sessionShell.canOpenActiveShell || createSessionMutation.isPending
                ? styles.disabledButton
                : null,
            ]}
            disabled={!sessionShell.canOpenActiveShell || createSessionMutation.isPending}
            onPress={() => void onStartSession()}
          >
            <Text style={styles.primaryButtonLabel}>{setupStatus.startLabel}</Text>
          </Pressable>
        </TeacherCard>
      ) : null}
    </TeacherScreen>
  )
}
