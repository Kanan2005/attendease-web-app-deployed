import type {
  AttendanceSessionDetail,
  AttendanceSessionStudentSummary,
} from "@attendease/contracts"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { getMobileAttendanceSessionPollInterval } from "../attendance-live"
import { invalidateTeacherExperienceQueries, teacherQueryKeys } from "../teacher-query"
import { getTeacherAccessToken, useTeacherSession } from "../teacher-session"
import { authClient } from "./queries-shared"

export function useTeacherAttendanceSessionDetailQuery(
  sessionId: string,
  options: {
    refetchInterval?:
      | number
      | false
      | ((query: { state: { data: AttendanceSessionDetail | undefined } }) => number | false)
  } = {},
) {
  const { session } = useTeacherSession()
  const refetchInterval =
    options.refetchInterval !== undefined
      ? options.refetchInterval
      : (query: { state: { data: AttendanceSessionDetail | undefined } }) =>
          getMobileAttendanceSessionPollInterval(query.state.data ?? null)

  return useQuery<AttendanceSessionDetail>({
    queryKey: teacherQueryKeys.sessionDetail(sessionId),
    enabled: Boolean(session && sessionId),
    queryFn: async () =>
      authClient.getAttendanceSessionDetail(getTeacherAccessToken(session), sessionId),
    refetchInterval,
  })
}

export function useTeacherAttendanceSessionStudentsQuery(
  sessionId: string,
  options: {
    refetchInterval?: number | false
  } = {},
) {
  const { session } = useTeacherSession()

  return useQuery<AttendanceSessionStudentSummary[]>({
    queryKey: teacherQueryKeys.sessionStudents(sessionId),
    enabled: Boolean(session && sessionId),
    queryFn: async () =>
      authClient.listAttendanceSessionStudents(getTeacherAccessToken(session), sessionId),
    ...(options.refetchInterval !== undefined
      ? {
          refetchInterval: options.refetchInterval,
        }
      : {}),
  })
}

export function useTeacherUpdateAttendanceSessionMutation(sessionId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (
      payload: Parameters<typeof authClient.updateAttendanceSessionAttendance>[2],
    ) =>
      authClient.updateAttendanceSessionAttendance(
        getTeacherAccessToken(session),
        sessionId,
        payload,
      ),
    onSuccess: async (result) => {
      queryClient.setQueryData(teacherQueryKeys.sessionDetail(sessionId), result.session)
      queryClient.setQueryData(teacherQueryKeys.sessionStudents(sessionId), result.students)
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId: result.session.classroomId,
        sessionId,
      })
    },
  })
}
