import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { ClassroomRosterMemberSummary } from "@attendease/contracts"
import {
  buildTeacherBluetoothCandidates,
  buildTeacherRosterImportDraftModel,
} from "../teacher-operational"
import { invalidateTeacherExperienceQueries } from "../teacher-query"
import { getTeacherAccessToken, useTeacherSession } from "../teacher-session"
import { useTeacherClassroomsQuery, useTeacherLectureSets } from "./queries-core"
import { authClient } from "./queries-shared"

export function useTeacherCreateClassroomMutation() {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (payload: Parameters<typeof authClient.createClassroom>[1]) =>
      authClient.createClassroom(getTeacherAccessToken(session), payload),
    onSuccess: async (created) => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId: created.id,
      })
    },
  })
}

export function useTeacherUpdateClassroomMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (payload: Parameters<typeof authClient.updateClassroom>[2]) =>
      authClient.updateClassroom(getTeacherAccessToken(session), classroomId, payload),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherArchiveClassroomMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async () =>
      authClient.archiveClassroom(getTeacherAccessToken(session), classroomId),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherResetJoinCodeMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async () =>
      authClient.resetClassroomJoinCode(getTeacherAccessToken(session), classroomId, {}),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherCreateAnnouncementMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (payload: {
      title?: string
      body: string
      visibility: "TEACHER_ONLY" | "STUDENT_AND_TEACHER"
      shouldNotify: boolean
    }) =>
      authClient.createClassroomAnnouncement(getTeacherAccessToken(session), classroomId, {
        title: payload.title?.trim() ? payload.title : null,
        body: payload.body,
        visibility: payload.visibility,
        shouldNotify: payload.shouldNotify,
      }),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherCreateLectureMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (payload: {
      title?: string
      lectureDate: string
      plannedStartAt?: string
      plannedEndAt?: string
    }) =>
      authClient.createClassroomLecture(getTeacherAccessToken(session), classroomId, {
        title: payload.title?.trim() ? payload.title : undefined,
        lectureDate: payload.lectureDate,
        ...(payload.plannedStartAt ? { plannedStartAt: payload.plannedStartAt } : {}),
        ...(payload.plannedEndAt ? { plannedEndAt: payload.plannedEndAt } : {}),
      }),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherUpdateRosterMemberMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (payload: {
      enrollmentId: string
      membershipStatus: ClassroomRosterMemberSummary["membershipState"]
    }) =>
      authClient.updateClassroomStudent(
        getTeacherAccessToken(session),
        classroomId,
        payload.enrollmentId,
        {
          membershipStatus: payload.membershipStatus,
        },
      ),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherAddRosterMemberMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (payload: Parameters<typeof authClient.addClassroomStudent>[2]) =>
      authClient.addClassroomStudent(getTeacherAccessToken(session), classroomId, payload),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherRemoveRosterMemberMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (enrollmentId: string) =>
      authClient.removeClassroomStudent(getTeacherAccessToken(session), classroomId, enrollmentId),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherCreateRosterImportMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (payload: { sourceFileName: string; rowsText: string }) => {
      const draft = buildTeacherRosterImportDraftModel(payload.rowsText)

      return authClient.createRosterImportJob(getTeacherAccessToken(session), classroomId, {
        sourceFileName: payload.sourceFileName,
        rows: draft.rows,
      })
    },
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherApplyRosterImportMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (jobId: string) =>
      authClient.applyRosterImportJob(getTeacherAccessToken(session), classroomId, jobId),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherSaveScheduleMutation(classroomId: string) {
  const queryClient = useQueryClient()
  const { session } = useTeacherSession()

  return useMutation({
    mutationFn: async (payload: Parameters<typeof authClient.saveAndNotifyClassroomSchedule>[2]) =>
      authClient.saveAndNotifyClassroomSchedule(
        getTeacherAccessToken(session),
        classroomId,
        payload,
      ),
    onSuccess: async () => {
      await invalidateTeacherExperienceQueries(queryClient, {
        classroomId,
      })
    },
  })
}

export function useTeacherBluetoothCandidates() {
  const classroomsQuery = useTeacherClassroomsQuery()
  const lectureSets = useTeacherLectureSets(classroomsQuery.data)

  return {
    classroomsQuery,
    lectureSets,
    candidates: buildTeacherBluetoothCandidates({
      classrooms: lectureSets.scopedClassrooms,
      lectureSets: lectureSets.lectureSets,
    }),
  }
}
