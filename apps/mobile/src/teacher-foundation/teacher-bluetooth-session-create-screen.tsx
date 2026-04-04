import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { Alert, BackHandler, PermissionsAndroid, Platform } from "react-native"

import { createAuthApiClient } from "@attendease/auth"
import type { BluetoothSessionCreateResponse } from "@attendease/contracts"
import * as FileSystem from "expo-file-system"
import { getMobileAttendanceSessionPollInterval } from "../attendance-live"
import {
  useTeacherBluetoothAdvertiser,
  useTeacherBluetoothSessionCreateMutation,
  useTeacherBluetoothSessionQuery,
} from "../bluetooth-attendance-hooks"
import { canStartBluetoothAdvertising } from "../bluetooth-attendance-models"
import { mobileEnv } from "../mobile-env"
import { AttendEaseBluetooth } from "../native/bluetooth"
import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { invalidateTeacherExperienceQueries, teacherQueryKeys } from "../teacher-query"
import { getTeacherAccessToken, useTeacherSession } from "../teacher-session"
import { useTeacherClassroomDetailQuery } from "./queries-core"
import { useTeacherAttendanceSessionStudentsQuery } from "./queries-sessions"
import { TeacherBluetoothSessionCreateScreenContent } from "./teacher-bluetooth-session-create-screen-content"

const authClient = createAuthApiClient({
  baseUrl: mobileEnv.EXPO_PUBLIC_API_URL,
})

// ── Persistent BLE runtime storage (survives app kills) ──
function getBleRuntimePath(): string {
  const baseDir = (FileSystem as Record<string, unknown>).documentDirectory as string | null
  return `${baseDir ?? ""}ble-session-runtime.json`
}

async function saveBleRuntime(data: BluetoothSessionCreateResponse): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(getBleRuntimePath(), JSON.stringify(data))
    console.log("[BLE-STORE] Saved runtime for session", data.session.id)
  } catch (e) {
    console.warn("[BLE-STORE] Failed to save runtime:", e)
  }
}

async function loadBleRuntime(): Promise<BluetoothSessionCreateResponse | null> {
  try {
    const path = getBleRuntimePath()
    const info = await FileSystem.getInfoAsync(path)
    if (!info.exists) return null
    const raw = await FileSystem.readAsStringAsync(path)
    const parsed = JSON.parse(raw) as BluetoothSessionCreateResponse
    console.log("[BLE-STORE] Loaded runtime for session", parsed.session.id)
    return parsed
  } catch (e) {
    console.warn("[BLE-STORE] Failed to load runtime:", e)
    return null
  }
}

async function clearBleRuntime(): Promise<void> {
  try {
    const path = getBleRuntimePath()
    const info = await FileSystem.getInfoAsync(path)
    if (info.exists) {
      await FileSystem.deleteAsync(path, { idempotent: true })
      console.log("[BLE-STORE] Cleared runtime")
    }
  } catch (e) {
    console.warn("[BLE-STORE] Failed to clear runtime:", e)
  }
}

// Compute elapsed seconds from a startedAt ISO timestamp
function computeElapsedSeconds(startedAt: string | null): number {
  if (!startedAt) return 0
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  return Math.max(0, diff)
}

// Extract a human-readable error message from API errors
function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "details" in err) {
    const details = (err as { details: unknown }).details
    if (details && typeof details === "object" && "message" in details) {
      return String((details as { message: unknown }).message)
    }
    if (typeof details === "string") return details
    return JSON.stringify(details)
  }
  if (err instanceof Error) return err.message
  return fallback
}

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
  const [phase, setPhase] = useState<"preflight" | "creating" | "broadcasting" | "error">(
    "preflight",
  )
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const didRun = useRef(false)
  const isEnding = useRef(false)

  const runtime = createdSessionId
    ? (queryClient.getQueryData<BluetoothSessionCreateResponse>(
        teacherQueryKeys.bluetoothRuntime(createdSessionId),
      ) ?? null)
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
      await clearBleRuntime()
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

  // ── Resume an existing session from stored runtime ──
  const resumeSession = useCallback(
    (storedRuntime: BluetoothSessionCreateResponse) => {
      const sid = storedRuntime.session.id
      console.log("[BLE] Resuming session:", sid)
      setCreatedSessionId(sid)
      queryClient.setQueryData(teacherQueryKeys.bluetoothRuntime(sid), storedRuntime)
      setElapsedSeconds(computeElapsedSeconds(storedRuntime.session.startedAt))
      setPhase("broadcasting")
    },
    [queryClient],
  )

  // ── Create a brand new session ──
  const createNewSession = useCallback(async () => {
    try {
      const created = await createSessionMutation.mutateAsync({
        classroomId: props.classroomId,
        ...(props.lectureId ? { lectureId: props.lectureId } : {}),
      })
      setCreatedSessionId(created.session.id)
      queryClient.setQueryData(teacherQueryKeys.bluetoothRuntime(created.session.id), created)
      await saveBleRuntime(created)
      setPhase("broadcasting")
    } catch (err) {
      console.error("[BLE-CREATE] Session creation failed:", err)
      const msg = extractApiErrorMessage(err, "Failed to create session")
      setPhase("error")
      setErrorMsg(msg)
      didRun.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutation and queryClient refs are stable
  }, [session, props.classroomId, props.lectureId])

  const requestBluetoothPermissions = useCallback(async (): Promise<boolean> => {
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
      console.log("[BLE-PERM] allGranted:", allGranted)
      return allGranted
    } catch (e) {
      console.error("[BLE-PERM] Permission request failed:", e)
      return false
    }
  }, [])

  // ── Main preflight: check BT → try resume → or create new ──
  const runPreflight = useCallback(async () => {
    if (!session || !props.classroomId) return
    didRun.current = true
    setPhase("preflight")
    setErrorMsg(null)

    try {
      // Step 1: Bluetooth permissions
      const granted = await requestBluetoothPermissions()
      if (!granted) {
        setPhase("error")
        setErrorMsg("Bluetooth permissions are required. Grant 'Nearby devices' permission in Settings.")
        didRun.current = false
        return
      }

      // Step 2: Bluetooth availability
      const availability = await AttendEaseBluetooth.getAvailability()
      if (!canStartBluetoothAdvertising(availability)) {
        const reason = !availability.supported
          ? "Bluetooth is not supported on this device."
          : !availability.poweredOn
            ? "Bluetooth is turned off. Please turn on Bluetooth and try again."
            : "Bluetooth advertising permission is required. Grant 'Nearby devices' permission in Settings."
        setPhase("error")
        setErrorMsg(reason)
        didRun.current = false
        return
      }

      setPhase("creating")
      const token = getTeacherAccessToken(session)

      // Step 3: Try to resume from stored runtime first
      const storedRuntime = await loadBleRuntime()
      if (storedRuntime) {
        console.log("[BLE] Found stored runtime for session:", storedRuntime.session.id)
        try {
          // Verify the session is still live on the server
          const liveSessions = await authClient.listLiveAttendanceSessions(token, {
            classroomId: props.classroomId,
            mode: "BLUETOOTH",
          })
          const stillLive = liveSessions.find((s) => s.id === storedRuntime.session.id)
          if (stillLive) {
            // Session is still live → resume it
            resumeSession(storedRuntime)
            return
          }
          // Session ended while we were away → clear stale runtime
          console.log("[BLE] Stored session no longer live, clearing")
          await clearBleRuntime()
        } catch (err) {
          // Network error checking live sessions — still try to resume
          // (the advertiser will work even if we can't verify server state)
          console.warn("[BLE] Could not verify session status, resuming optimistically:", err)
          resumeSession(storedRuntime)
          return
        }
      }

      // Step 4: No stored runtime or session expired — check for any stale live sessions
      try {
        const liveSessions = await authClient.listLiveAttendanceSessions(token, {
          classroomId: props.classroomId,
          mode: "BLUETOOTH",
        })
        for (const stale of liveSessions) {
          console.log("[BLE] Ending stale session without stored runtime:", stale.id)
          try {
            await authClient.endAttendanceSession(token, stale.id)
            await invalidateTeacherExperienceQueries(queryClient, {
              classroomId: props.classroomId,
              sessionId: stale.id,
            })
          } catch (endErr) {
            console.warn("[BLE] Failed to end stale session:", stale.id, endErr)
          }
        }
      } catch (listErr) {
        console.warn("[BLE] Failed to list live sessions (continuing to create):", listErr)
      }

      // Step 5: Create a new session
      await createNewSession()
    } catch (err) {
      console.error("[BLE-PREFLIGHT] Unexpected error:", err)
      setPhase("error")
      setErrorMsg(err instanceof Error ? err.message : "Could not start Bluetooth session.")
      didRun.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs and stable callbacks only
  }, [session, props.classroomId, props.lectureId])

  const handleBackPress = useCallback(() => {
    if (phase === "broadcasting" && createdSessionId) {
      Alert.alert(
        "Leave Session",
        "The session will keep running in the background. Students can still mark attendance. You can return to this session from the lectures list.",
        [
          { text: "Stay Here", style: "cancel" },
          {
            text: "Keep Running & Leave",
            onPress: () => {
              // Just navigate back — session stays live on server, stored runtime persists
              router.back()
            },
          },
          {
            text: "End Session & Leave",
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
  }, [phase, createdSessionId, router, endSessionMutation])

  // Auto-run preflight once on mount (ref guard prevents re-runs)
  useEffect(() => {
    if (!session || !props.classroomId || didRun.current) return
    void runPreflight()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run only on mount; didRun ref prevents re-entry
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
  }, [phase, createdSessionId, handleBackPress])

  // Timer — ticks every second during broadcasting
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
      createError={
        createSessionMutation.error
          ? mapTeacherApiErrorToMessage(createSessionMutation.error)
          : null
      }
      endSessionPending={endSessionMutation.isPending}
      endSessionError={
        endSessionMutation.error ? mapTeacherApiErrorToMessage(endSessionMutation.error) : null
      }
      onEndSession={() => void endSessionMutation.mutateAsync()}
      onRetry={() => {
        void advertiser.start()
      }}
      onGoBack={handleBackPress}
      onRetryPreflight={() => {
        didRun.current = false
        void runPreflight()
      }}
    />
  )
}
