import { createAuthApiClient } from "@attendease/auth"
import type {
  BluetoothSessionCreateResponse,
  CreateBluetoothSessionRequest,
} from "@attendease/contracts"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PermissionsAndroid, Platform } from "react-native"
import { mobileEnv } from "./mobile-env"

import { getMobileAttendanceSessionPollInterval } from "./attendance-live"
import {
  type StudentBluetoothScannerRuntimeState,
  type TeacherBluetoothAdvertiserRuntimeState,
  canStartBluetoothAdvertising,
  canStartBluetoothScanning,
  dedupeBluetoothDetections,
  describeBluetoothAdvertiserFailure,
  describeBluetoothScannerFailure,
  mapBluetoothAdvertiserEventToRuntimeState,
  mapBluetoothScannerEventToRuntimeState,
  resolveBluetoothAdvertiserFailureState,
  resolveBluetoothScannerFailureState,
} from "./bluetooth-attendance-models"
import { AttendEaseBluetooth } from "./native/bluetooth"
import type { BluetoothAvailability, BluetoothDetection } from "./native/bluetooth"
import {
  invalidateStudentExperienceQueries,
  requireStudentAccessToken,
  studentQueryKeys,
} from "./student-query"
import { useStudentSession } from "./student-session"
import { teacherQueryKeys } from "./teacher-query"
import { getTeacherAccessToken, useTeacherSession } from "./teacher-session"

const env = mobileEnv

function describeAdvertiseErrorCode(code: number): string {
  switch (code) {
    case 1:
      return "Data too large (payload exceeds BLE limit)"
    case 2:
      return "Too many advertisers"
    case 3:
      return "Already started"
    case 4:
      return "Internal error"
    case 5:
      return "Feature unsupported"
    default:
      return `Unknown error (${code})`
  }
}
const authClient = createAuthApiClient({
  baseUrl: env.EXPO_PUBLIC_API_URL,
})

export function useTeacherBluetoothSessionCreateMutation() {
  const { session } = useTeacherSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateBluetoothSessionRequest) =>
      authClient.createBluetoothAttendanceSession(getTeacherAccessToken(session), payload),
    onSuccess: async (data) => {
      queryClient.setQueryData(teacherQueryKeys.bluetoothRuntime(data.session.id), data)
      queryClient.setQueryData(teacherQueryKeys.bluetoothSession(data.session.id), data.session)
      await queryClient.invalidateQueries({
        queryKey: teacherQueryKeys.bluetoothCandidates(),
      })
    },
  })
}

export function useTeacherBluetoothRuntime(sessionId: string) {
  const queryClient = useQueryClient()

  return queryClient.getQueryData<BluetoothSessionCreateResponse>(
    teacherQueryKeys.bluetoothRuntime(sessionId),
  )
}

export function useTeacherBluetoothSessionQuery(sessionId: string) {
  const { session } = useTeacherSession()

  return useQuery({
    queryKey: teacherQueryKeys.bluetoothSession(sessionId),
    enabled: Boolean(session && sessionId),
    queryFn: async () => authClient.getAttendanceSession(getTeacherAccessToken(session), sessionId),
    refetchInterval: (query) => getMobileAttendanceSessionPollInterval(query.state.data ?? null),
  })
}

export function useTeacherBluetoothAdvertiser(runtime: BluetoothSessionCreateResponse | null) {
  const [availability, setAvailability] = useState<BluetoothAvailability | null>(null)
  const [state, setState] = useState<TeacherBluetoothAdvertiserRuntimeState>(
    runtime ? "READY" : "IDLE",
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastPayload, setLastPayload] = useState<string | null>(null)
  const startedSessionId = useRef<string | null>(null)
  const runtimeRef = useRef(runtime)
  runtimeRef.current = runtime
  const startRef = useRef<() => Promise<boolean>>(() => Promise.resolve(false))

  useEffect(() => {
    const unsubscribeState = AttendEaseBluetooth.subscribeToAdvertiserState((event) => {
      const mappedState = mapBluetoothAdvertiserEventToRuntimeState(event)
      setState(mappedState)

      if (event.payload) {
        setLastPayload(event.payload)
      }

      // Show errorCode in the message if present
      if (event.state === "FAILED") {
        const errorCode = (event as { errorCode?: number }).errorCode
        const errorMsg =
          errorCode !== undefined
            ? `BLE Error Code ${errorCode}: ${describeAdvertiseErrorCode(errorCode)}`
            : event.message || "Bluetooth advertising failed"
        setErrorMessage(errorMsg)
      } else if (event.message) {
        setErrorMessage(event.message)
      }
    })

    return () => {
      unsubscribeState()
    }
  }, [])

  const refreshAvailability = useCallback(async () => {
    try {
      const nextAvailability = await AttendEaseBluetooth.getAvailability()
      setAvailability(nextAvailability)
      return nextAvailability
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Bluetooth availability failed.")
      setState("FAILED")
      return null
    }
  }, [])

  const start = useCallback(async () => {
    const rt = runtimeRef.current
    if (!rt) return false

    const nextAvailability = await refreshAvailability()

    if (!canStartBluetoothAdvertising(nextAvailability)) {
      setState("PERMISSION_REQUIRED")
      return false
    }

    try {
      setErrorMessage(null)
      setState("READY")
      await AttendEaseBluetooth.startAdvertising(rt.advertiser)
      startedSessionId.current = rt.session.id
      return true
    } catch (error) {
      console.error("[BLE-ADV] startAdvertising failed:", error)
      setState(resolveBluetoothAdvertiserFailureState(error))
      setErrorMessage(describeBluetoothAdvertiserFailure(error))
      return false
    }
  }, [refreshAvailability])

  // Keep startRef updated so the effect can call it without depending on it
  startRef.current = start

  const stop = useCallback(async () => {
    try {
      await AttendEaseBluetooth.stopAdvertising()
      setState("STOPPED")
    } catch (error) {
      setState("FAILED")
      setErrorMessage(error instanceof Error ? error.message : "Bluetooth stop failed.")
    }
  }, [])

  const sessionId = runtime?.session.id ?? null
  const wasBluetoothOff = useRef(false)

  useEffect(() => {
    if (!sessionId || startedSessionId.current === sessionId) return
    void startRef.current()

    // Only cleanup on unmount, not on re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // Continuous health monitoring: poll BT availability every 3s during active session
  useEffect(() => {
    if (!sessionId) return

    let cancelled = false

    const healthCheck = async () => {
      if (cancelled) return
      try {
        const avail = await AttendEaseBluetooth.getAvailability()
        if (cancelled) return
        setAvailability(avail)

        if (!avail.poweredOn) {
          wasBluetoothOff.current = true
          setState("FAILED")
          setErrorMessage("Bluetooth was turned off. Turn it back on to resume broadcasting.")
        } else if (!avail.canAdvertise) {
          setState("PERMISSION_REQUIRED")
          setErrorMessage(
            "Bluetooth advertising permission was revoked. Grant 'Nearby devices' in Settings.",
          )
        } else if (wasBluetoothOff.current) {
          // BT is back on after being off → auto-restart advertising
          wasBluetoothOff.current = false
          setErrorMessage(null)
          void startRef.current()
        }
      } catch {
        // Silently ignore health check failures
      }
    }

    // First check after a short delay (let advertising start first)
    const initialTimeout = setTimeout(healthCheck, 3000)
    const interval = setInterval(healthCheck, 3000)
    return () => {
      cancelled = true
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [sessionId])

  return {
    availability,
    state,
    errorMessage,
    lastPayload,
    refreshAvailability,
    start,
    stop,
  }
}

export function useStudentBluetoothScanner(serviceUuid: string | null, enabled = true) {
  const [availability, setAvailability] = useState<BluetoothAvailability | null>(null)
  const [state, setState] = useState<StudentBluetoothScannerRuntimeState>("IDLE")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [detections, setDetections] = useState<BluetoothDetection[]>([])

  useEffect(() => {
    const unsubscribeDetection = AttendEaseBluetooth.subscribeToDetections((event) => {
      setDetections((current) => dedupeBluetoothDetections([event, ...current]))
    })
    const unsubscribeState = AttendEaseBluetooth.subscribeToScannerState((event) => {
      setState(mapBluetoothScannerEventToRuntimeState(event))
    })

    return () => {
      unsubscribeDetection()
      unsubscribeState()
    }
  }, [])

  const refreshAvailability = useCallback(async () => {
    try {
      const nextAvailability = await AttendEaseBluetooth.getAvailability()
      setAvailability(nextAvailability)
      return nextAvailability
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Bluetooth availability failed.")
      setState("FAILED")
      return null
    }
  }, [])

  const start = useCallback(async () => {
    if (!serviceUuid || !enabled) {
      return false
    }

    // Request runtime BLE permissions on Android 12+ (API 31+)
    if (Platform.OS === "android" && (Platform.Version as number) >= 31) {
      try {
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ])
        const allGranted = Object.values(results).every(
          (r) => r === PermissionsAndroid.RESULTS.GRANTED,
        )
        if (!allGranted) {
          setState("PERMISSION_REQUIRED")
          setErrorMessage(
            "Bluetooth scan permission is required. Grant 'Nearby devices' in Settings.",
          )
          return false
        }
      } catch {
        setState("PERMISSION_REQUIRED")
        setErrorMessage("Failed to request Bluetooth permissions.")
        return false
      }
    }

    const nextAvailability = await refreshAvailability()

    if (!canStartBluetoothScanning(nextAvailability)) {
      setState("PERMISSION_REQUIRED")
      return false
    }

    try {
      setErrorMessage(null)
      setDetections([])
      await AttendEaseBluetooth.startScanning({
        serviceUuid,
      })
      setState("SCANNING")
      return true
    } catch (error) {
      setState(resolveBluetoothScannerFailureState(error))
      setErrorMessage(describeBluetoothScannerFailure(error))
      return false
    }
  }, [enabled, refreshAvailability, serviceUuid])

  const stop = useCallback(async () => {
    try {
      await AttendEaseBluetooth.stopScanning()
      setState("STOPPED")
    } catch (error) {
      setState("FAILED")
      setErrorMessage(error instanceof Error ? error.message : "Bluetooth scan stop failed.")
    }
  }, [])

  const startRef = useRef(start)
  startRef.current = start
  const wasBluetoothOffScanner = useRef(false)

  useEffect(() => {
    if (!enabled) {
      setState("IDLE")
      setErrorMessage(null)
      setDetections([])
      return
    }

    if (!serviceUuid) {
      return
    }

    void start()

    return () => {
      void AttendEaseBluetooth.stopScanning()
    }
  }, [enabled, serviceUuid, start])

  // Continuous health monitoring for scanner: poll BT availability every 3s
  useEffect(() => {
    if (!enabled || !serviceUuid) return

    let cancelled = false

    const healthCheck = async () => {
      if (cancelled) return
      try {
        const avail = await AttendEaseBluetooth.getAvailability()
        if (cancelled) return
        setAvailability(avail)

        if (!avail.poweredOn) {
          wasBluetoothOffScanner.current = true
          setState("FAILED")
          setErrorMessage("Bluetooth was turned off. Turn it back on to scan for your teacher.")
        } else if (!avail.canScan) {
          setState("PERMISSION_REQUIRED")
          setErrorMessage(
            "Bluetooth scan permission was revoked. Grant 'Nearby devices' in Settings.",
          )
        } else if (wasBluetoothOffScanner.current) {
          wasBluetoothOffScanner.current = false
          setErrorMessage(null)
          void startRef.current()
        }
      } catch {
        // Silently ignore health check failures
      }
    }

    const initialTimeout = setTimeout(healthCheck, 3000)
    const interval = setInterval(healthCheck, 3000)
    return () => {
      cancelled = true
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [enabled, serviceUuid])

  return {
    availability,
    state,
    errorMessage,
    detections,
    refreshAvailability,
    start,
    stop,
    clearDetections() {
      setDetections([])
    },
  }
}

export function useStudentBluetoothMarkAttendanceMutation() {
  const { session, draft } = useStudentSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Parameters<typeof authClient.markBluetoothAttendance>[2]) =>
      authClient.markBluetoothAttendance(
        requireStudentAccessToken(session),
        draft.installId,
        payload,
      ),
    onSuccess: async () => {
      await invalidateStudentExperienceQueries(queryClient, {
        installId: draft.installId,
      })
      await queryClient.invalidateQueries({
        queryKey: studentQueryKeys.attendanceMode("BLUETOOTH"),
      })
    },
  })
}

export function usePreferredBluetoothDetection(detections: BluetoothDetection[]) {
  return useMemo(() => detections[0] ?? null, [detections])
}
