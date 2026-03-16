import type { AuthSessionResponse } from "@attendease/contracts"
import { useQueryClient } from "@tanstack/react-query"
import type { QueryClient } from "@tanstack/react-query"

export const studentQueryKeys = {
  all: ["student"] as const,
  me: () => [...studentQueryKeys.all, "me"] as const,
  classrooms: () => [...studentQueryKeys.all, "classrooms"] as const,
  classroomDetail: (classroomId: string) =>
    [...studentQueryKeys.all, "classrooms", classroomId, "detail"] as const,
  classroomAnnouncements: (classroomId: string) =>
    [...studentQueryKeys.all, "classrooms", classroomId, "announcements"] as const,
  classroomLectures: (classroomId: string) =>
    [...studentQueryKeys.all, "classrooms", classroomId, "lectures"] as const,
  classroomSchedule: (classroomId: string) =>
    [...studentQueryKeys.all, "classrooms", classroomId, "schedule"] as const,
  history: () => [...studentQueryKeys.all, "history"] as const,
  reportsOverview: () => [...studentQueryKeys.all, "reports", "overview"] as const,
  reportsSubjects: () => [...studentQueryKeys.all, "reports", "subjects"] as const,
  reportSubject: (subjectId: string) =>
    [...studentQueryKeys.all, "reports", "subjects", subjectId] as const,
  attendanceReady: (installId: string) =>
    [...studentQueryKeys.all, "attendance-ready", installId] as const,
  attendanceMode: (mode: "QR_GPS" | "BLUETOOTH") =>
    [...studentQueryKeys.all, "attendance", mode] as const,
} as const

export function requireStudentAccessToken(session: AuthSessionResponse | null) {
  if (!session) {
    throw new Error("Student session is required before calling mobile student queries.")
  }

  return session.tokens.accessToken
}

export function buildStudentInvalidationKeys(
  input: {
    classroomId?: string
    classroomIds?: string[]
    subjectId?: string
    installId?: string
  } = {},
) {
  const keys: Array<readonly unknown[]> = [
    studentQueryKeys.me(),
    studentQueryKeys.classrooms(),
    studentQueryKeys.history(),
    studentQueryKeys.reportsOverview(),
    studentQueryKeys.reportsSubjects(),
    studentQueryKeys.attendanceMode("QR_GPS"),
    studentQueryKeys.attendanceMode("BLUETOOTH"),
  ]

  if (input.classroomId) {
    keys.push(
      studentQueryKeys.classroomDetail(input.classroomId),
      studentQueryKeys.classroomAnnouncements(input.classroomId),
      studentQueryKeys.classroomLectures(input.classroomId),
      studentQueryKeys.classroomSchedule(input.classroomId),
    )
  }

  for (const classroomId of input.classroomIds ?? []) {
    if (classroomId === input.classroomId) {
      continue
    }

    keys.push(
      studentQueryKeys.classroomDetail(classroomId),
      studentQueryKeys.classroomAnnouncements(classroomId),
      studentQueryKeys.classroomLectures(classroomId),
      studentQueryKeys.classroomSchedule(classroomId),
    )
  }

  if (input.subjectId) {
    keys.push(studentQueryKeys.reportSubject(input.subjectId))
  }

  if (input.installId) {
    keys.push(studentQueryKeys.attendanceReady(input.installId))
  }

  return keys
}

export async function invalidateStudentExperienceQueries(
  queryClient: Pick<QueryClient, "invalidateQueries">,
  input: {
    classroomId?: string
    classroomIds?: string[]
    subjectId?: string
    installId?: string
  } = {},
) {
  for (const queryKey of buildStudentInvalidationKeys(input)) {
    await queryClient.invalidateQueries({
      queryKey,
    })
  }
}

export function useStudentRefreshAction(
  input: {
    classroomId?: string
    classroomIds?: string[]
    subjectId?: string
    installId?: string
  } = {},
) {
  const queryClient = useQueryClient()

  return async () =>
    invalidateStudentExperienceQueries(queryClient, {
      ...(input.classroomId ? { classroomId: input.classroomId } : {}),
      ...(input.classroomIds ? { classroomIds: input.classroomIds } : {}),
      ...(input.subjectId ? { subjectId: input.subjectId } : {}),
      ...(input.installId ? { installId: input.installId } : {}),
    })
}
