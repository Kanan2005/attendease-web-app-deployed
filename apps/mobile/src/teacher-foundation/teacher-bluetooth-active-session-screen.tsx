import { createAuthApiClient } from "@attendease/auth"
import { mobileEnv } from "../mobile-env"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "expo-router"

import { getMobileAttendanceSessionPollInterval } from "../attendance-live"
import {
  useTeacherBluetoothAdvertiser,
  useTeacherBluetoothRuntime,
  useTeacherBluetoothSessionQuery,
} from "../bluetooth-attendance"
import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { buildTeacherBluetoothActiveStatusModel } from "../teacher-operational"
import { buildTeacherBluetoothRecoveryModel } from "../teacher-operational"
import {
  buildTeacherBluetoothControlModel,
  buildTeacherBluetoothEndSessionModel,
  buildTeacherBluetoothSessionShellSnapshot,
} from "../teacher-operational"
import { buildTeacherSessionRosterModel } from "../teacher-operational"
import { invalidateTeacherExperienceQueries, teacherQueryKeys } from "../teacher-query"
import { teacherRoutes } from "../teacher-routes"
import { getTeacherAccessToken, useTeacherSession } from "../teacher-session"
import { useTeacherAttendanceSessionStudentsQuery } from "./queries"
import { clampInteger } from "./shared-ui"
import { TeacherBluetoothActiveSessionScreenContent } from "./teacher-bluetooth-active-session-screen-content"

const authClient = createAuthApiClient({
  baseUrl: mobileEnv.EXPO_PUBLIC_API_URL,
})

export function TeacherBluetoothActiveSessionScreen(props: {
  sessionId: string
  classroomId: string
  classroomTitle: string
  lectureTitle?: string
  durationMinutes: string
  rotationWindowSeconds: string
}) {
  const { session } = useTeacherSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const classroomContext = teacherRoutes.classroomContext(props.classroomId)

  const runtime = useTeacherBluetoothRuntime(props.sessionId)
  const sessionQuery = useTeacherBluetoothSessionQuery(props.sessionId)
  const studentsQuery = useTeacherAttendanceSessionStudentsQuery(props.sessionId, {
    refetchInterval: getMobileAttendanceSessionPollInterval(sessionQuery.data ?? null),
  })
  const advertiser = useTeacherBluetoothAdvertiser(runtime ?? null)

  const endSessionMutation = useMutation({
    mutationFn: async () =>
      authClient.endAttendanceSession(getTeacherAccessToken(session), props.sessionId),
    onSuccess: async () => {
      await advertiser.stop()
      await queryClient.setQueryData(teacherQueryKeys.bluetoothRuntime(props.sessionId), null)
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId: props.classroomId,
        sessionId: props.sessionId,
      })
      router.back()
    },
  })

  const effectiveAdvertiserState = runtime
    ? advertiser.state === "IDLE"
      ? "READY"
      : advertiser.state
    : "FAILED"
  const recoveryModel = buildTeacherBluetoothRecoveryModel({
    advertiserState: effectiveAdvertiserState,
    errorMessage: advertiser.errorMessage,
    availability: advertiser.availability,
  })
  const endSessionModel = buildTeacherBluetoothEndSessionModel({
    requestState:
      sessionQuery.data?.status !== "ACTIVE"
        ? "ENDED"
        : endSessionMutation.isPending
          ? "ENDING"
          : endSessionMutation.error
            ? "FAILED"
            : "IDLE",
  })
  const displayDurationMinutes =
    sessionQuery.data?.durationSeconds && sessionQuery.data.durationSeconds > 0
      ? Math.round(sessionQuery.data.durationSeconds / 60)
      : clampInteger(props.durationMinutes, 50, 1, 480)
  const displayRotationWindowSeconds =
    sessionQuery.data?.bluetoothRotationWindowSeconds ??
    clampInteger(props.rotationWindowSeconds, 10, 5, 180)
  const snapshot = buildTeacherBluetoothSessionShellSnapshot({
    candidate: {
      sessionId: props.sessionId,
      classroomId: props.classroomId,
      classroomTitle: props.classroomTitle,
      lectureId: null,
      lectureTitle: props.lectureTitle ?? "Lecture details",
      durationMinutes: displayDurationMinutes,
      bluetoothRotationWindowSeconds: displayRotationWindowSeconds,
      status: sessionQuery.data?.status === "ACTIVE" ? "OPEN_FOR_ATTENDANCE" : "SHELL_ONLY",
    },
    advertiserState: effectiveAdvertiserState,
  })
  const controlModel = buildTeacherBluetoothControlModel(effectiveAdvertiserState)
  const activeStatus = buildTeacherBluetoothActiveStatusModel({
    advertiserState: effectiveAdvertiserState,
    sessionStatus: sessionQuery.data?.status ?? null,
    presentCount: sessionQuery.data?.presentCount ?? 0,
  })
  const liveRosterModel = buildTeacherSessionRosterModel({
    students: studentsQuery.data ?? [],
    isEditable: false,
  })

  return (
    <TeacherBluetoothActiveSessionScreenContent
      hasTeacherSession={Boolean(session)}
      isSessionLoading={sessionQuery.isLoading}
      sessionStatusError={
        sessionQuery.error ? mapTeacherApiErrorToMessage(sessionQuery.error) : null
      }
      isStudentsLoading={studentsQuery.isLoading}
      studentsErrorMessage={
        studentsQuery.error ? mapTeacherApiErrorToMessage(studentsQuery.error) : null
      }
      runtimeAvailable={Boolean(runtime)}
      runtimeErrorMessage={advertiser.errorMessage}
      lastPayload={advertiser.lastPayload ? advertiser.lastPayload : null}
      classroomTitle={props.classroomTitle}
      lectureTitle={props.lectureTitle ?? ""}
      routePaths={{
        bluetoothCreate: classroomContext.bluetoothCreate,
        sessionHistory: teacherRoutes.sessionHistory,
        detail: classroomContext.detail,
      }}
      durationMinutes={displayDurationMinutes}
      rotationWindowSeconds={displayRotationWindowSeconds}
      presentCount={sessionQuery.data?.presentCount ?? 0}
      sessionStatus={
        (sessionQuery.data?.status as "ACTIVE" | "ENDED" | "SCHEDULED" | "UNKNOWN") ?? "UNKNOWN"
      }
      activeStatus={activeStatus}
      snapshot={snapshot}
      recoveryModel={recoveryModel}
      controlModel={controlModel}
      liveRosterModel={liveRosterModel}
      endSessionModel={endSessionModel}
      endSessionErrorMessage={
        endSessionMutation.error ? mapTeacherApiErrorToMessage(endSessionMutation.error) : null
      }
      canRefreshStudentList={!studentsQuery.isRefetching}
      onRefreshStudents={() => void studentsQuery.refetch()}
      onStartBroadcast={() => {
        void advertiser.start()
      }}
      onStopBroadcast={() => {
        void advertiser.stop()
      }}
      onRefreshAvailability={() => {
        void advertiser.refreshAvailability()
      }}
      onRetryBroadcast={() => {
        void advertiser.start()
      }}
      onEndSession={() => {
        void endSessionMutation.mutateAsync()
      }}
      onGoBack={() => router.back()}
    />
  )
}
