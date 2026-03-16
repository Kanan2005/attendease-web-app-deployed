import type { ReactNode } from "react"
import { Pressable, Text, View } from "react-native"

import type { TeacherSessionRosterRowModel } from "../teacher-operational"
import { TeacherSessionStudentSection } from "./session-review-screens"
import { formatEnum } from "./shared-ui"
import {
  TeacherCard,
  TeacherErrorCard,
  TeacherLoadingCard,
  TeacherNavAction,
  TeacherScreen,
  TeacherSessionSetupCard,
  TeacherStatusBanner,
  styles,
  toneColorStyle,
} from "./shared-ui"

type RoutePaths = {
  bluetoothCreate: string | { pathname: string; params?: Record<string, string> }
  sessionHistory: string | { pathname: string; params?: Record<string, string> }
  detail: string | { pathname: string; params?: Record<string, string> }
}

type ActiveStatusModel = {
  stateTone: "primary" | "success" | "warning" | "danger"
  title: string
  message: string
}

type SnapshotModel = {
  stateTone: "primary" | "success" | "warning" | "danger"
  title: string
  message: string
}

type RecoveryModel = {
  shouldShow: boolean
  shouldRefreshBluetooth: boolean
  shouldRetryBroadcast: boolean
  shouldOfferEndSession: boolean
  title: string
  message: string
  stateTone: "primary" | "success" | "warning" | "danger"
}

type EndSessionModel = {
  helperMessage: string
  buttonLabel: string
  buttonDisabled: boolean
}

type ControlModel = {
  helperMessage: string
  canStart: boolean
  canStop: boolean
  startLabel: string
  stopLabel: string
}

type RosterModel = {
  presentSummary: string
  presentRows: TeacherSessionRosterRowModel[]
  absentRows: TeacherSessionRosterRowModel[]
}

type Props = {
  hasTeacherSession: boolean
  isSessionLoading: boolean
  sessionStatusError: string | null
  isStudentsLoading: boolean
  studentsErrorMessage: string | null
  runtimeAvailable: boolean
  runtimeErrorMessage: string | null
  lastPayload: ReactNode
  classroomTitle: string
  lectureTitle: string
  routePaths: RoutePaths
  durationMinutes: number
  rotationWindowSeconds: number
  presentCount: number
  sessionStatus: "ACTIVE" | "ENDED" | "SCHEDULED" | "UNKNOWN"
  activeStatus: ActiveStatusModel
  snapshot: SnapshotModel
  recoveryModel: RecoveryModel
  controlModel: ControlModel
  liveRosterModel: RosterModel
  endSessionModel: EndSessionModel
  endSessionErrorMessage: string | null
  canRefreshStudentList: boolean
  onRefreshStudents: () => void
  onStartBroadcast: () => void
  onStopBroadcast: () => void
  onRefreshAvailability: () => void
  onRetryBroadcast: () => void
  onEndSession: () => void
}

export function TeacherBluetoothActiveSessionScreenContent({
  hasTeacherSession,
  isSessionLoading,
  sessionStatusError,
  isStudentsLoading,
  studentsErrorMessage,
  runtimeAvailable,
  runtimeErrorMessage,
  lastPayload,
  classroomTitle,
  lectureTitle,
  routePaths,
  durationMinutes,
  rotationWindowSeconds,
  presentCount,
  sessionStatus,
  activeStatus,
  snapshot,
  recoveryModel,
  controlModel,
  liveRosterModel,
  endSessionModel,
  endSessionErrorMessage,
  canRefreshStudentList,
  onRefreshStudents,
  onStartBroadcast,
  onStopBroadcast,
  onRefreshAvailability,
  onRetryBroadcast,
  onEndSession,
}: Props) {
  if (!hasTeacherSession) {
    return <TeacherSessionSetupCard />
  }

  if (isSessionLoading) {
    return (
      <TeacherScreen
        title="Active Bluetooth Session"
        subtitle="Loading active Bluetooth session state"
      >
        <TeacherLoadingCard label="Loading Bluetooth session state" />
      </TeacherScreen>
    )
  }

  if (sessionStatusError) {
    return (
      <TeacherScreen title="Active Bluetooth Session" subtitle="Bluetooth session load failed">
        <TeacherErrorCard label={sessionStatusError} />
      </TeacherScreen>
    )
  }

  return (
    <TeacherScreen
      title="Active Bluetooth Session"
      subtitle="Keep Bluetooth attendance live, review the phone broadcast state, and close the session cleanly from one place."
    >
      <TeacherStatusBanner
        status={{
          tone: activeStatus.stateTone,
          title: activeStatus.title,
          message: activeStatus.message,
        }}
      />

      <TeacherCard
        title="Live Session"
        subtitle={lectureTitle.length ? lectureTitle : "Classroom attendance session"}
      >
        <Text style={styles.listMeta}>{classroomTitle}</Text>
        <View style={styles.cardGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Present</Text>
            <Text style={[styles.metricValue, styles.successTone]}>{presentCount}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Session Status</Text>
            <Text style={[styles.metricValue, toneColorStyle(activeStatus.stateTone)]}>
              {formatEnum(sessionStatus)}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Duration</Text>
            <Text style={[styles.metricValue, styles.warningTone]}>{durationMinutes}m</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Rotation</Text>
            <Text style={[styles.metricValue, styles.primaryTone]}>{rotationWindowSeconds}s</Text>
          </View>
        </View>
        <Text style={[styles.bodyText, toneColorStyle(snapshot.stateTone)]}>{snapshot.title}</Text>
        <Text style={styles.bodyText}>{snapshot.message}</Text>
        {runtimeErrorMessage ? <Text style={styles.errorText}>{runtimeErrorMessage}</Text> : null}
        {!runtimeAvailable ? (
          <Text style={styles.errorText}>
            Bluetooth advertiser config is missing from local runtime cache. Recreate the session
            from the teacher Bluetooth create route.
          </Text>
        ) : null}
        {lastPayload ? (
          <Text style={styles.listMeta}>Current BLE payload: {lastPayload}</Text>
        ) : null}
      </TeacherCard>

      <TeacherCard
        title="Live Student List"
        subtitle="Present students update here while Bluetooth attendance stays open. Corrections unlock after the session ends."
      >
        {isStudentsLoading ? (
          <TeacherLoadingCard label="Loading live student list" />
        ) : studentsErrorMessage ? (
          <TeacherErrorCard label={studentsErrorMessage} />
        ) : (
          <>
            <Text style={styles.listMeta}>{liveRosterModel.presentSummary}</Text>
            <TeacherSessionStudentSection
              title="Marked Present"
              subtitle="Students who have already checked in nearby."
              rows={liveRosterModel.presentRows}
              emptyLabel="No students are marked present yet."
            />
            <TeacherSessionStudentSection
              title="Still Absent"
              subtitle="Students who have not marked attendance yet."
              rows={liveRosterModel.absentRows}
              emptyLabel="No absent students are left in this session."
            />
            <View style={styles.actionGrid}>
              <Pressable
                style={styles.secondaryButton}
                disabled={!canRefreshStudentList}
                onPress={() => onRefreshStudents()}
              >
                <Text style={styles.secondaryButtonLabel}>Refresh Student List</Text>
              </Pressable>
            </View>
          </>
        )}
      </TeacherCard>

      <TeacherCard
        title="Broadcast Controls"
        subtitle="Nearby students can only detect this attendance session while the teacher-phone broadcast stays live."
      >
        <Text style={styles.listMeta}>{controlModel.helperMessage}</Text>
        <View style={styles.actionGrid}>
          <Pressable
            style={[styles.primaryButton, !controlModel.canStart ? styles.disabledButton : null]}
            disabled={!controlModel.canStart}
            onPress={() => onStartBroadcast()}
          >
            <Text style={styles.primaryButtonLabel}>{controlModel.startLabel}</Text>
          </Pressable>
          <Pressable
            style={[
              styles.secondaryButton,
              !controlModel.canStop ? styles.disabledSecondaryButton : null,
            ]}
            disabled={!controlModel.canStop}
            onPress={() => onStopBroadcast()}
          >
            <Text style={styles.secondaryButtonLabel}>{controlModel.stopLabel}</Text>
          </Pressable>
          {recoveryModel.shouldRefreshBluetooth ? (
            <Pressable style={styles.secondaryButton} onPress={() => onRefreshAvailability()}>
              <Text style={styles.secondaryButtonLabel}>Refresh Bluetooth</Text>
            </Pressable>
          ) : null}
        </View>
      </TeacherCard>

      <TeacherCard
        title="End Session"
        subtitle="Close Bluetooth attendance when everyone nearby has finished checking in."
      >
        <Text style={styles.listMeta}>{endSessionModel.helperMessage}</Text>
        <View style={styles.actionGrid}>
          <Pressable
            style={[
              styles.dangerButton,
              endSessionModel.buttonDisabled ? styles.disabledButton : null,
            ]}
            disabled={endSessionModel.buttonDisabled}
            onPress={() => onEndSession()}
          >
            <Text style={styles.primaryButtonLabel}>{endSessionModel.buttonLabel}</Text>
          </Pressable>
        </View>
        {endSessionErrorMessage ? (
          <Text style={styles.errorText}>{endSessionErrorMessage}</Text>
        ) : null}
      </TeacherCard>

      {recoveryModel.shouldShow ? (
        <TeacherCard title={recoveryModel.title} subtitle={recoveryModel.message}>
          <Text style={[styles.bodyText, toneColorStyle(recoveryModel.stateTone)]}>
            {recoveryModel.message}
          </Text>
          <View style={styles.actionGrid}>
            {recoveryModel.shouldRetryBroadcast ? (
              <Pressable style={styles.primaryButton} onPress={() => onRetryBroadcast()}>
                <Text style={styles.primaryButtonLabel}>Retry Broadcast</Text>
              </Pressable>
            ) : null}
            {recoveryModel.shouldOfferEndSession ? (
              <Pressable
                style={[
                  styles.dangerButton,
                  endSessionModel.buttonDisabled ? styles.disabledButton : null,
                ]}
                disabled={endSessionModel.buttonDisabled}
                onPress={() => onEndSession()}
              >
                <Text style={styles.primaryButtonLabel}>{endSessionModel.buttonLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        </TeacherCard>
      ) : null}

      <TeacherCard
        title="After This Session"
        subtitle="Teacher mobile keeps setup, live control, and session history connected without leaving Bluetooth ownership unclear."
      >
        <Text style={styles.bodyText}>
          This route owns advertiser health, live session polling, and clean teardown. When you end
          the session successfully, AttendEase opens the saved session detail automatically.
        </Text>
        <View style={styles.actionGrid}>
          <TeacherNavAction href={routePaths.bluetoothCreate} label="Back To Setup" />
          <TeacherNavAction href={routePaths.sessionHistory} label="Session History" />
          <TeacherNavAction href={routePaths.detail} label="Classroom Detail" />
        </View>
      </TeacherCard>
    </TeacherScreen>
  )
}
