import { createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"
import type {
  BluetoothSessionCreateResponse,
  CreateBluetoothSessionRequest,
} from "@attendease/contracts"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

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

const env = loadMobileEnv(process.env as Record<string, string | undefined>)
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

  useEffect(() => {
    const unsubscribeState = AttendEaseBluetooth.subscribeToAdvertiserState((event) => {
      setState(mapBluetoothAdvertiserEventToRuntimeState(event))

      if (event.payload) {
        setLastPayload(event.payload)
      }

      if (event.message) {
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
    if (!runtime) {
      return false
    }

    const nextAvailability = await refreshAvailability()

    if (!canStartBluetoothAdvertising(nextAvailability)) {
      setState("PERMISSION_REQUIRED")
      return false
    }

    try {
      setErrorMessage(null)
      await AttendEaseBluetooth.startAdvertising(runtime.advertiser)
      setState("ADVERTISING")
      startedSessionId.current = runtime.session.id
      return true
    } catch (error) {
      setState(resolveBluetoothAdvertiserFailureState(error))
      setErrorMessage(describeBluetoothAdvertiserFailure(error))
      return false
    }
  }, [refreshAvailability, runtime])

  const stop = useCallback(async () => {
    try {
      await AttendEaseBluetooth.stopAdvertising()
      setState("STOPPED")
    } catch (error) {
      setState("FAILED")
      setErrorMessage(error instanceof Error ? error.message : "Bluetooth stop failed.")
    }
  }, [])

  useEffect(() => {
    if (!runtime || startedSessionId.current === runtime.session.id) {
      return
    }

    void start()

    return () => {
      if (startedSessionId.current === runtime.session.id) {
        void AttendEaseBluetooth.stopAdvertising()
      }
    }
  }, [runtime, start])

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
