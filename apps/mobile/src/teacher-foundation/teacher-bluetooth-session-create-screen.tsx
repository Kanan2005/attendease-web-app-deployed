import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { Alert, BackHandler, PermissionsAndroid, Platform } from "react-native"

import type { BluetoothSessionCreateResponse } from "@attendease/contracts"
import {
  useTeacherBluetoothAdvertiser,
  useTeacherBluetoothSessionCreateMutation,
  useTeacherBluetoothSessionQuery,
} from "../bluetooth-attendance-hooks"
import { canStartBluetoothAdvertising } from "../bluetooth-attendance-models"
import { AttendEaseBluetooth } from "../native/bluetooth"
import { getMobileAttendanceSessionPollInterval } from "../attendance-live"
import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { invalidateTeacherExperienceQueries, teacherQueryKeys } from "../teacher-query"
import { getTeacherAccessToken, useTeacherSession } from "../teacher-session"
import { useTeacherClassroomDetailQuery } from "./queries-core"
import { useTeacherAttendanceSessionStudentsQuery } from "./queries-sessions"
import { TeacherBluetoothSessionCreateScreenContent } from "./teacher-bluetooth-session-create-screen-content"
import { createAuthApiClient } from "@attendease/auth"
import { mobileEnv } from "../mobile-env"

const authClient = createAuthApiClient({
  baseUrl: mobileEnv.EXPO_PUBLIC_API_URL,
})

export function TeacherBluetoothSessionCreateScreen(props: {
  classroomId: string
  lectureId: string
}) {
  const { session } = useTeacherSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const createSessionMutation = useTeacherBluetoothSessionCreateMutation()
  const classroomQuery = useTeacherClassroomDetailQuery(props.classroomId)
  const classroomTitle = classroomQuery.data?.displayTitle ?? "Classroom"

  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [phase, setPhase] = useState<"preflight" | "creating" | "broadcasting" | "error">("preflight")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const didCreate = useRef(false)
  const isEnding = useRef(false)

  const runtime = createdSessionId
    ? queryClient.getQueryData<BluetoothSessionCreateResponse>(
        teacherQueryKeys.bluetoothRuntime(createdSessionId),
      ) ?? null
    : null
  const advertiser = useTeacherBluetoothAdvertiser(runtime)

  const sessionQuery = useTeacherBluetoothSessionQuery(createdSessionId ?? "")
  const studentsQuery = useTeacherAttendanceSessionStudentsQuery(createdSessionId ?? "", {
    refetchInterval: createdSessionId
      ? getMobileAttendanceSessionPollInterval(sessionQuery.data ?? null)
      : false,
  })

  const presentCount = sessionQuery.data?.presentCount ?? 0
  const totalStudents = studentsQuery.data?.length ?? 0

  const endSessionMutation = useMutation({
    mutationFn: async () => {
      if (!createdSessionId) throw new Error("No active session")
      return authClient.endAttendanceSession(getTeacherAccessToken(session), createdSessionId)
    },
    onSuccess: async () => {
      await advertiser.stop()
      if (createdSessionId) {
        await queryClient.setQueryData(teacherQueryKeys.bluetoothRuntime(createdSessionId), null)
        await invalidateTeacherExperienceQueries(queryClient, {
          classroomId: props.classroomId,
          sessionId: createdSessionId,
        })
        router.back()
      }
    },
  })

  function handleBackPress() {
    if (phase === "broadcasting" && createdSessionId) {
      Alert.alert(
        "End Attendance Session?",
        "If you leave, the session will end and students won't be able to mark attendance.",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "End & Leave",
            style: "destructive",
            onPress: () => {
              if (isEnding.current) return
              isEnding.current = true
              void endSessionMutation.mutateAsync().finally(() => {
                isEnding.current = false
              })
            },
          },
        ],
      )
    } else {
      router.back()
    }
  }

  async function createSession() {
    const token = getTeacherAccessToken(session)
    try {
      const created = await createSessionMutation.mutateAsync({
        classroomId: props.classroomId,
        ...(props.lectureId ? { lectureId: props.lectureId } : {}),
      })
      setCreatedSessionId(created.session.id)
      queryClient.setQueryData(teacherQueryKeys.bluetoothRuntime(created.session.id), created)
      setPhase("broadcasting")
    } catch (err) {
      console.error("[BLE-CREATE] Session creation failed:", err)
      // AuthApiClientError stores the real message in `details`, not `message`
      let msg = "Failed to create session"
      if (err && typeof err === "object" && "details" in err) {
        const details = (err as { details: unknown }).details
        if (details && typeof details === "object" && "message" in details) {
          msg = String((details as { message: unknown }).message)
        } else if (typeof details === "string") {
          msg = details
        } else {
          msg = JSON.stringify(details)
        }
      } else if (err instanceof Error) {
        msg = err.message
      }
      console.error("[BLE-CREATE] Extracted error message:", msg)
      const isAlreadyActive = msg.toLowerCase().includes("already active") || msg.toLowerCase().includes("already exists")

      if (isAlreadyActive) {
        try {
          const liveSessions = await authClient.listLiveAttendanceSessions(token, {
            classroomId: props.classroomId,
            mode: "BLUETOOTH",
          })
          const existing = liveSessions[0]
          if (existing) {
            await authClient.endAttendanceSession(token, existing.id)
            await invalidateTeacherExperienceQueries(queryClient, {
              classroomId: props.classroomId,
              sessionId: existing.id,
            })
          }
          const retry = await createSessionMutation.mutateAsync({
            classroomId: props.classroomId,
            ...(props.lectureId ? { lectureId: props.lectureId } : {}),
          })
          setCreatedSessionId(retry.session.id)
          queryClient.setQueryData(teacherQueryKeys.bluetoothRuntime(retry.session.id), retry)
          setPhase("broadcasting")
        } catch (retryErr) {
          setPhase("error")
          setErrorMsg(retryErr instanceof Error ? retryErr.message : "Failed to create session after ending previous one.")
          didCreate.current = false
        }
      } else {
        setPhase("error")
        setErrorMsg(msg)
        didCreate.current = false
      }
    }
  }

  async function requestBluetoothPermissions(): Promise<boolean> {
    if (Platform.OS !== "android" || (Platform.Version ?? 0) < 31) return true
    try {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ])
      const allGranted = Object.values(results).every(
        (r) => r === PermissionsAndroid.RESULTS.GRANTED,
      )
      console.log("[BLE-PERM] Permission results:", JSON.stringify(results), "allGranted:", allGranted)
      return allGranted
    } catch (e) {
      console.error("[BLE-PERM] Permission request failed:", e)
      return false
    }
  }

  function runPreflight() {
    if (!session || !props.classroomId) return
    didCreate.current = true
    setPhase("preflight")
    setErrorMsg(null)

    requestBluetoothPermissions()
      .then((granted) => {
        if (!granted) {
          setPhase("error")
          setErrorMsg("Bluetooth permissions are required. Grant 'Nearby devices' permission in Settings.")
          didCreate.current = false
          return
        }
        return AttendEaseBluetooth.getAvailability()
      })
      .then((availability) => {
        if (!availability) return
        if (!canStartBluetoothAdvertising(availability)) {
          const reason = !availability.supported
            ? "Bluetooth is not supported on this device."
            : !availability.poweredOn
              ? "Bluetooth is turned off. Please turn on Bluetooth and try again."
              : "Bluetooth advertising permission is required. Grant 'Nearby devices' permission in Settings."
          setPhase("error")
          setErrorMsg(reason)
          didCreate.current = false
          return
        }

        setPhase("creating")
        return createSession()
      })
      .catch((err) => {
        setPhase("error")
        setErrorMsg(err instanceof Error ? err.message : "Could not check Bluetooth availability.")
        didCreate.current = false
      })
  }

  // Auto-run preflight on mount
  useEffect(() => {
    if (!session || !props.classroomId || didCreate.current) return
    runPreflight()
  }, [session, props.classroomId])

  // Intercept Android hardware back button during broadcasting
  useEffect(() => {
    if (phase !== "broadcasting" || !createdSessionId) return
    const onHardwareBack = () => {
      handleBackPress()
      return true
    }
    const subscription = BackHandler.addEventListener("hardwareBackPress", onHardwareBack)
    return () => subscription.remove()
  }, [phase, createdSessionId])

  // Timer
  useEffect(() => {
    if (phase !== "broadcasting") return
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [phase])

  if (!props.classroomId) {
    return (
      <TeacherBluetoothSessionCreateScreenContent
        phase="error"
        classroomTitle=""
        lectureId=""
        elapsedSeconds={0}
        presentCount={0}
        totalStudents={0}
        advertiserState="IDLE"
        errorMessage="Select a course and lecture first."
        createError={null}
        endSessionPending={false}
        endSessionError={null}
        onEndSession={() => {}}
        onRetry={() => {}}
        onGoBack={() => router.back()}
      />
    )
  }

  return (
    <TeacherBluetoothSessionCreateScreenContent
      phase={phase === "preflight" ? "creating" : phase}
      classroomTitle={classroomTitle}
      lectureId={props.lectureId}
      elapsedSeconds={elapsedSeconds}
      presentCount={presentCount}
      totalStudents={totalStudents}
      advertiserState={advertiser.state}
      errorMessage={errorMsg ?? (advertiser.errorMessage ? advertiser.errorMessage : null)}
      createError={createSessionMutation.error ? mapTeacherApiErrorToMessage(createSessionMutation.error) : null}
      endSessionPending={endSessionMutation.isPending}
      endSessionError={endSessionMutation.error ? mapTeacherApiErrorToMessage(endSessionMutation.error) : null}
      onEndSession={() => void endSessionMutation.mutateAsync()}
      onRetry={() => {
        void advertiser.start()
      }}
      onGoBack={handleBackPress}
      onRetryPreflight={() => {
        didCreate.current = false
        runPreflight()
      }}
    />
  )
}
