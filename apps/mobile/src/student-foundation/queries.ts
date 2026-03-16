import { createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"
import type { AttendanceMode, TrustedDeviceAttendanceReadyResponse } from "@attendease/contracts"
import { mobileTheme } from "@attendease/ui-mobile"
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "expo-router"
import { useEffect, useState } from "react"
import type { ComponentType, ReactNode } from "react"
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import { getMobileAttendanceListPollInterval } from "../attendance-live"
import {
  buildStudentBluetoothDetectionBanner,
  buildStudentBluetoothScannerBanner,
  buildStudentBluetoothSubmissionBanner,
  describeBluetoothSignalStrength,
  mapBluetoothAvailabilityToPermissionState,
  resolveSelectedBluetoothDetection,
  usePreferredBluetoothDetection,
  useStudentBluetoothMarkAttendanceMutation,
  useStudentBluetoothScanner,
} from "../bluetooth-attendance"
import { buildStudentAttendanceGateModel, createMobileDeviceTrustBootstrap } from "../device-trust"
import { mobileEntryRoutes } from "../mobile-entry-models"
import {
  type StudentAttendancePermissionState,
  type StudentQrLocationSnapshot,
  type StudentQrLocationState,
  buildStudentAttendanceControllerSnapshot,
  buildStudentBluetoothAttendanceErrorBanner,
  buildStudentBluetoothMarkRequest,
  buildStudentQrAttendanceErrorBanner,
  buildStudentQrLocationBanner,
  buildStudentQrMarkRequest,
  buildStudentQrScanBanner,
  resolveStudentQrCameraPermissionState,
  studentAttendancePermissionStateValues,
} from "../student-attendance"
import {
  type CardTone,
  type StudentDashboardActionModel,
  buildStudentDashboardModel,
  buildStudentLectureTimeline,
  mapStudentApiErrorToMessage,
} from "../student-models"
import {
  buildStudentInvalidationKeys,
  invalidateStudentExperienceQueries,
  requireStudentAccessToken,
  studentQueryKeys,
  useStudentRefreshAction,
} from "../student-query"
import { studentRoutes } from "../student-routes"
import { useStudentSession } from "../student-session"
import {
  type StudentScreenStatus,
  buildStudentAttendanceRefreshStatus,
  buildStudentDashboardStatus,
  buildStudentHistoryRefreshStatus,
  buildStudentJoinBanner,
  buildStudentReportsStatus,
} from "../student-view-state"
import {
  type StudentAttendanceCandidate,
  type StudentProfileDraft,
  buildStudentAttendanceCandidates,
  buildStudentAttendanceHistoryRows,
  buildStudentAttendanceHistorySummaryModel,
  buildStudentAttendanceInsightModel,
  buildStudentAttendanceOverviewModel,
  buildStudentClassroomDetailSummaryModel,
  buildStudentCourseDiscoveryCards,
  buildStudentDeviceStatusSummaryModel,
  buildStudentReportOverviewModel,
  buildStudentScheduleOverviewModel,
  buildStudentSubjectReportModel,
  buildStudentSubjectReportSummaryModel,
  createStudentProfileDraft,
  hasStudentProfileDraftChanges,
  normalizeStudentProfileDraft,
} from "../student-workflow-models"

const env = loadMobileEnv(process.env as Record<string, string | undefined>)
const authClient = createAuthApiClient({
  baseUrl: env.EXPO_PUBLIC_API_URL,
})
const deviceTrustBootstrap = createMobileDeviceTrustBootstrap(
  process.env as Record<string, string | undefined>,
)

type SupportedAttendanceMode = Extract<AttendanceMode, "QR_GPS" | "BLUETOOTH">

export { buildStudentInvalidationKeys }

export function useStudentMeQuery() {
  const { session } = useStudentSession()

  return useQuery({
    queryKey: studentQueryKeys.me(),
    enabled: Boolean(session),
    queryFn: async () => authClient.me(requireStudentAccessToken(session)),
  })
}

export function useStudentClassroomsQuery() {
  const { session } = useStudentSession()

  return useQuery({
    queryKey: studentQueryKeys.classrooms(),
    enabled: Boolean(session),
    queryFn: async () => authClient.listMyClassrooms(requireStudentAccessToken(session)),
  })
}

export function useStudentClassroomAnnouncementsQuery(classroomId: string, limit = 6) {
  const { session } = useStudentSession()

  return useQuery({
    queryKey: studentQueryKeys.classroomAnnouncements(classroomId),
    enabled: Boolean(session && classroomId),
    queryFn: async () =>
      authClient.listClassroomAnnouncements(requireStudentAccessToken(session), classroomId, {
        limit,
      }),
  })
}

export function useStudentClassroomLecturesQuery(classroomId: string) {
  const { session } = useStudentSession()

  return useQuery({
    queryKey: studentQueryKeys.classroomLectures(classroomId),
    enabled: Boolean(session && classroomId),
    queryFn: async () =>
      authClient.listClassroomLectures(requireStudentAccessToken(session), classroomId),
  })
}

export function useStudentClassroomScheduleQuery(classroomId: string) {
  const { session } = useStudentSession()

  return useQuery({
    queryKey: studentQueryKeys.classroomSchedule(classroomId),
    enabled: Boolean(session && classroomId),
    queryFn: async () =>
      authClient.getClassroomSchedule(requireStudentAccessToken(session), classroomId),
  })
}

export function useStudentRecentLectureTimeline(
  classrooms: ReturnType<typeof useStudentClassroomsQuery>["data"],
) {
  const { session } = useStudentSession()
  const activeClassrooms = (classrooms ?? []).filter(
    (classroom) => classroom.enrollmentStatus === "ACTIVE",
  )
  const lectureQueries = useQueries({
    queries: activeClassrooms.slice(0, 5).map((classroom) => ({
      queryKey: studentQueryKeys.classroomLectures(classroom.id),
      enabled: Boolean(session && classroom.id),
      queryFn: async () =>
        authClient.listClassroomLectures(requireStudentAccessToken(session), classroom.id),
    })),
  })

  return {
    timeline: buildStudentLectureTimeline({
      classrooms: activeClassrooms,
      lectureSets: lectureQueries.flatMap((query, index) =>
        query.data
          ? [
              {
                classroomId: activeClassrooms[index]?.id ?? "",
                lectures: query.data,
              },
            ]
          : [],
      ),
    }),
    isLoading: lectureQueries.some((query) => query.isLoading),
    error: lectureQueries.find((query) => query.error)?.error ?? null,
  }
}

export function useStudentDashboardData() {
  const meQuery = useStudentMeQuery()
  const classroomsQuery = useStudentClassroomsQuery()
  const recentTimelineQuery = useStudentRecentLectureTimeline(classroomsQuery.data)

  return {
    meQuery,
    classroomsQuery,
    recentTimelineQuery,
  }
}

export function useStudentJoinClassroomMutation() {
  const { session, draft } = useStudentSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (code: string) =>
      authClient.joinClassroom(requireStudentAccessToken(session), {
        code,
      }),
    onSuccess: async (membership) => {
      await invalidateStudentExperienceQueries(queryClient, {
        classroomId: membership.id,
        subjectId: membership.subjectId,
        installId: draft.installId,
      })
    },
  })
}

export function useStudentClassroomDetailData(classroomId: string) {
  const { session } = useStudentSession()
  const meQuery = useStudentMeQuery()
  const attendanceReadyQuery = useStudentAttendanceReadyQuery()
  const qrLiveSessionsQuery = useStudentLiveAttendanceSessionsQuery("QR_GPS")
  const bluetoothLiveSessionsQuery = useStudentLiveAttendanceSessionsQuery("BLUETOOTH")
  const classroomsQuery = useStudentClassroomsQuery()
  const detailQuery = useQuery({
    queryKey: studentQueryKeys.classroomDetail(classroomId),
    enabled: Boolean(session && classroomId),
    queryFn: async () => authClient.getClassroom(requireStudentAccessToken(session), classroomId),
  })
  const announcementsQuery = useStudentClassroomAnnouncementsQuery(classroomId, 6)
  const lecturesQuery = useStudentClassroomLecturesQuery(classroomId)
  const scheduleQuery = useStudentClassroomScheduleQuery(classroomId)

  return {
    meQuery,
    attendanceReadyQuery,
    qrLiveSessionsQuery,
    bluetoothLiveSessionsQuery,
    membership: classroomsQuery.data?.find((classroom) => classroom.id === classroomId) ?? null,
    classroomsQuery,
    detailQuery,
    announcementsQuery,
    lecturesQuery,
    scheduleQuery,
  }
}

export function useStudentReportsData() {
  const { session } = useStudentSession()

  const overviewQuery = useQuery({
    queryKey: studentQueryKeys.reportsOverview(),
    enabled: Boolean(session),
    queryFn: async () => authClient.getStudentReportOverview(requireStudentAccessToken(session)),
  })
  const subjectReportsQuery = useQuery({
    queryKey: studentQueryKeys.reportsSubjects(),
    enabled: Boolean(session),
    queryFn: async () => authClient.listStudentSubjectReports(requireStudentAccessToken(session)),
  })

  return {
    overviewQuery,
    subjectReportsQuery,
    reportOverview: overviewQuery.data ? buildStudentReportOverviewModel(overviewQuery.data) : null,
    subjectReports: (subjectReportsQuery.data ?? []).map(buildStudentSubjectReportSummaryModel),
  }
}

export function useStudentAttendanceHistoryData() {
  const { session } = useStudentSession()
  const historyQuery = useQuery({
    queryKey: studentQueryKeys.history(),
    enabled: Boolean(session),
    queryFn: async () =>
      authClient.listStudentAttendanceHistory(requireStudentAccessToken(session)),
  })

  return {
    historyQuery,
    historySummary: buildStudentAttendanceHistorySummaryModel(historyQuery.data ?? []),
    historyRows: buildStudentAttendanceHistoryRows(historyQuery.data ?? []),
  }
}

export function useStudentSubjectReportData(subjectId: string) {
  const { session } = useStudentSession()
  const subjectReportQuery = useQuery({
    queryKey: studentQueryKeys.reportSubject(subjectId),
    enabled: Boolean(session && subjectId),
    queryFn: async () =>
      authClient.getStudentSubjectReport(requireStudentAccessToken(session), subjectId),
  })

  return {
    subjectReportQuery,
    subjectReport: subjectReportQuery.data
      ? buildStudentSubjectReportModel(subjectReportQuery.data)
      : null,
  }
}

export function useStudentAttendanceReadyQuery() {
  const { session, draft } = useStudentSession()

  return useQuery<TrustedDeviceAttendanceReadyResponse>({
    queryKey: studentQueryKeys.attendanceReady(draft.installId),
    enabled: Boolean(session && draft.installId),
    queryFn: async () =>
      deviceTrustBootstrap.getAttendanceReady(requireStudentAccessToken(session), draft.installId),
  })
}

export function useStudentLiveAttendanceSessionsQuery(mode: SupportedAttendanceMode) {
  const { session } = useStudentSession()

  return useQuery({
    queryKey: studentQueryKeys.attendanceMode(mode),
    enabled: Boolean(session),
    queryFn: async () =>
      authClient.listLiveAttendanceSessions(requireStudentAccessToken(session), {
        mode,
      }),
    refetchInterval: (query) => getMobileAttendanceListPollInterval(query.state.data ?? null),
  })
}

export function useStudentAttendanceOverview() {
  const meQuery = useStudentMeQuery()
  const classroomsQuery = useStudentClassroomsQuery()
  const attendanceReadyQuery = useStudentAttendanceReadyQuery()
  const qrLiveSessionsQuery = useStudentLiveAttendanceSessionsQuery("QR_GPS")
  const bluetoothLiveSessionsQuery = useStudentLiveAttendanceSessionsQuery("BLUETOOTH")
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
  const qrCandidates = buildStudentAttendanceCandidates({
    classrooms: activeClassrooms,
    liveSessions: qrLiveSessionsQuery.data ?? [],
    mode: "QR_GPS",
  })
  const bluetoothCandidates = buildStudentAttendanceCandidates({
    classrooms: activeClassrooms,
    liveSessions: bluetoothLiveSessionsQuery.data ?? [],
    mode: "BLUETOOTH",
  })

  return {
    meQuery,
    classroomsQuery,
    attendanceReadyQuery,
    qrLiveSessionsQuery,
    bluetoothLiveSessionsQuery,
    lectureQueries,
    gateModel: resolvedGateModel,
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
  })
}
