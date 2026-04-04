import type { AttendanceMode } from "@attendease/contracts"
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { buildStudentAttendanceGateModel } from "../device-trust"
import {
  type StudentAttendancePermissionState,
  type StudentQrLocationSnapshot,
  buildStudentAttendanceControllerSnapshot,
} from "../student-attendance"
import { mapStudentApiErrorToMessage } from "../student-models"
import {
  invalidateStudentExperienceQueries,
  requireStudentAccessToken,
  studentQueryKeys,
  useStudentRefreshAction,
} from "../student-query"
import { useStudentSession } from "../student-session"
import {
  buildStudentAttendanceCandidates,
  buildStudentAttendanceOverviewModel,
  buildStudentCourseDiscoveryCards,
} from "../student-workflow-models"
import {
  useStudentAttendanceReadyQuery,
  useStudentClassroomsQuery,
  useStudentGlobalHistoryQuery,
  useStudentLiveAttendanceSessionsQuery,
  useStudentMeQuery,
} from "./queries-core"
import { authClient } from "./queries-shared"

type SupportedAttendanceMode = Extract<AttendanceMode, "QR_GPS" | "BLUETOOTH">

export function useStudentAttendanceOverview() {
  const meQuery = useStudentMeQuery()
  const classroomsQuery = useStudentClassroomsQuery()
  const attendanceReadyQuery = useStudentAttendanceReadyQuery()
  const qrLiveSessionsQuery = useStudentLiveAttendanceSessionsQuery("QR_GPS")
  const bluetoothLiveSessionsQuery = useStudentLiveAttendanceSessionsQuery("BLUETOOTH")
  const historyQuery = useStudentGlobalHistoryQuery()
  const { session } = useStudentSession()
  const activeClassrooms = (classroomsQuery.data ?? []).filter(
    (classroom) => classroom.enrollmentStatus === "ACTIVE",
  )
  const lectureQueries = useQueries({
    queries: activeClassrooms.map((classroom) => ({
      queryKey: studentQueryKeys.classroomLectures(classroom.id),
      enabled: Boolean(session),
      queryFn: async () =>
        authClient.listClassroomLectures(requireStudentAccessToken(session), classroom.id),
    })),
  })
  const gateModel = buildStudentAttendanceGateModel({
    deviceTrust: meQuery.data?.user.deviceTrust ?? null,
    attendanceReady: attendanceReadyQuery.data ?? null,
  })
  const resolvedGateModel = attendanceReadyQuery.error
    ? {
        title: "Attendance temporarily blocked",
        message: mapStudentApiErrorToMessage(attendanceReadyQuery.error),
        tone: "danger" as const,
        supportHint: "Retry the trusted-device check or open Device Status for support guidance.",
        canContinue: false,
      }
    : gateModel

  // v2.0: Build a Set of sessionIds the student has already marked PRESENT —
  // used to tag candidates so the UI can show "Attendance Marked" instead of "Tap to Mark".
  const markedSessionIds = new Set(
    (historyQuery.data ?? [])
      .filter((item) => item.attendanceStatus === "PRESENT" && item.markedAt !== null)
      .map((item) => item.sessionId),
  )

  const qrCandidates = buildStudentAttendanceCandidates({
    classrooms: activeClassrooms,
    liveSessions: qrLiveSessionsQuery.data ?? [],
    mode: "QR_GPS",
    markedSessionIds,
  })
  const bluetoothCandidates = buildStudentAttendanceCandidates({
    classrooms: activeClassrooms,
    liveSessions: bluetoothLiveSessionsQuery.data ?? [],
    mode: "BLUETOOTH",
    markedSessionIds,
  })

  return {
    meQuery,
    classroomsQuery,
    attendanceReadyQuery,
    qrLiveSessionsQuery,
    bluetoothLiveSessionsQuery,
    historyQuery,
    lectureQueries,
    gateModel: resolvedGateModel,
    markedSessionIds,
    qrCandidates,
    bluetoothCandidates,
    overview: buildStudentAttendanceOverviewModel({
      qrCandidates,
      bluetoothCandidates,
      gateModel: resolvedGateModel,
    }),
  }
}

export function useStudentCourseDiscoveryData() {
  const attendance = useStudentAttendanceOverview()
  const activeClassrooms = (attendance.classroomsQuery.data ?? []).filter(
    (classroom) => classroom.enrollmentStatus === "ACTIVE",
  )
  const lectureSets = attendance.lectureQueries.flatMap((query, index) =>
    query.data
      ? [
          {
            classroomId: activeClassrooms[index]?.id ?? "",
            lectures: query.data,
          },
        ]
      : [],
  )

  return {
    ...attendance,
    courseCards: buildStudentCourseDiscoveryCards({
      classrooms: attendance.classroomsQuery.data ?? [],
      lectureSets,
      qrCandidates: attendance.qrCandidates,
      bluetoothCandidates: attendance.bluetoothCandidates,
    }),
  }
}

export function useStudentAttendanceController(mode: SupportedAttendanceMode) {
  const { draft } = useStudentSession()
  const overview = useStudentAttendanceOverview()
  const candidates = mode === "QR_GPS" ? overview.qrCandidates : overview.bluetoothCandidates
  const activeClassroomIds = (overview.classroomsQuery.data ?? [])
    .filter((classroom) => classroom.enrollmentStatus === "ACTIVE")
    .map((classroom) => classroom.id)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [scanValue, setScanValue] = useState("")
  const [permissionState, setPermissionState] = useState<StudentAttendancePermissionState>(
    mode === "QR_GPS" ? "PENDING_REQUEST" : "GRANTED",
  )
  const [resultKind, setResultKind] = useState<"IDLE" | "READY" | "SUCCESS" | "ERROR">("IDLE")

  useEffect(() => {
    if (candidates.length === 0) {
      if (selectedSessionId !== null) {
        setSelectedSessionId(null)
      }

      return
    }

    if (
      !selectedSessionId ||
      !candidates.some((candidate) => candidate.sessionId === selectedSessionId)
    ) {
      setSelectedSessionId(candidates[0]?.sessionId ?? null)
    }
  }, [candidates, selectedSessionId])

  const selectedCandidate =
    candidates.find((candidate) => candidate.sessionId === selectedSessionId) ?? null
  const refreshExperience = useStudentRefreshAction({
    ...(selectedCandidate ? { classroomId: selectedCandidate.classroomId } : {}),
    ...(activeClassroomIds.length > 0 ? { classroomIds: activeClassroomIds } : {}),
    ...(selectedCandidate ? { subjectId: selectedCandidate.subjectId } : {}),
    ...(draft.installId ? { installId: draft.installId } : {}),
  })
  const snapshot = buildStudentAttendanceControllerSnapshot({
    mode,
    gateModel: overview.gateModel,
    permissionState,
    selectedCandidate,
    scanValue,
    resultKind,
  })

  async function refreshAfterSuccess() {
    if (!selectedCandidate) {
      return
    }

    await refreshExperience()
    setResultKind("SUCCESS")
  }

  function prepareSubmission() {
    setResultKind(snapshot.canPrepareSubmission ? "READY" : "ERROR")
  }

  return {
    ...overview,
    mode,
    candidates,
    selectedCandidate,
    selectedSessionId,
    setSelectedSessionId(nextSessionId: string) {
      setResultKind("IDLE")
      setSelectedSessionId(nextSessionId)
    },
    scanValue,
    setScanValue(nextValue: string) {
      setResultKind("IDLE")
      setScanValue(nextValue)
    },
    permissionState,
    setPermissionState(nextValue: StudentAttendancePermissionState) {
      setResultKind("IDLE")
      setPermissionState(nextValue)
    },
    setResultKind,
    snapshot,
    canPrepareSubmission: snapshot.canPrepareSubmission,
    prepareSubmission,
    refreshExperience,
    refreshAfterSuccess,
  }
}

export function useStudentQrMarkAttendanceMutation() {
  const { session, draft } = useStudentSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      qrPayload: string
      location: StudentQrLocationSnapshot
    }) =>
      authClient.markQrAttendance(requireStudentAccessToken(session), draft.installId, {
        qrPayload: payload.qrPayload,
        latitude: payload.location.latitude,
        longitude: payload.location.longitude,
        accuracyMeters: payload.location.accuracyMeters,
        deviceTimestamp: payload.location.capturedAt,
      }),
    onSuccess: async () => {
      await invalidateStudentExperienceQueries(queryClient, { installId: draft.installId })
    },
  })
}
