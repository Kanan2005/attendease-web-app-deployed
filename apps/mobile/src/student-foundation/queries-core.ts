import type { TrustedDeviceAttendanceReadyResponse } from "@attendease/contracts"
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { getMobileAttendanceListPollInterval } from "../attendance-live"

import { buildStudentLectureTimeline } from "../student-models"
import {
  invalidateStudentExperienceQueries,
  requireStudentAccessToken,
  studentQueryKeys,
} from "../student-query"
import { useStudentSession } from "../student-session"
import { authClient, deviceTrustBootstrap } from "./queries-shared"

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

export function useStudentUpdateProfileMutation() {
  const { session } = useStudentSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      displayName: string
      rollNumber?: string | null
      degree?: string | null
      branch?: string | null
    }) =>
      authClient.updateProfile(requireStudentAccessToken(session), {
        displayName: payload.displayName.trim(),
        ...(payload.rollNumber !== undefined ? { rollNumber: payload.rollNumber } : {}),
        ...(payload.degree !== undefined ? { degree: payload.degree } : {}),
        ...(payload.branch !== undefined ? { branch: payload.branch } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: studentQueryKeys.me() })
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
  const historyQuery = useQuery({
    queryKey: [...studentQueryKeys.history(), "classroom", classroomId],
    enabled: Boolean(session && classroomId),
    queryFn: async () =>
      authClient.listStudentAttendanceHistory(requireStudentAccessToken(session)),
    select: (data) => data.filter((item) => item.classroomId === classroomId),
  })

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
    historyQuery,
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

export function useStudentDeviceRegistrationMutation() {
  const { session, draft } = useStudentSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const payload = deviceTrustBootstrap.buildRegistrationPayload({
        installId: draft.installId,
        platform: draft.devicePlatform,
        publicKey: draft.publicKey,
      })
      return deviceTrustBootstrap.registerCurrentDevice(requireStudentAccessToken(session), payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: studentQueryKeys.me() })
      void queryClient.invalidateQueries({
        queryKey: studentQueryKeys.attendanceReady(draft.installId),
      })
    },
  })
}

export function useStudentLiveAttendanceSessionsQuery(mode: "QR_GPS" | "BLUETOOTH") {
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
