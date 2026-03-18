import {
  type ClassroomDetail,
  type ClassroomJoinCodeSummary,
  type ClassroomListQuery,
  type ClassroomSchedule,
  type ClassroomSummary,
  type CreateClassroomRequest,
  type CreateLectureRequest,
  type CreateScheduleExceptionRequest,
  type CreateScheduleSlotRequest,
  type JoinClassroomRequest,
  type LectureListQuery,
  type LectureSummary,
  type ResetClassroomJoinCodeRequest,
  type SaveAndNotifyScheduleRequest,
  type StudentClassroomListQuery,
  type StudentClassroomMembershipSummary,
  type UpdateClassroomRequest,
  type UpdateScheduleExceptionRequest,
  type UpdateScheduleSlotRequest,
  classroomDetailSchema,
  classroomJoinCodeSummarySchema,
  classroomScheduleSchema,
  classroomsResponseSchema,
  createClassroomRequestSchema,
  createLectureRequestSchema,
  joinClassroomRequestSchema,
  lectureSummarySchema,
  lecturesResponseSchema,
  resetClassroomJoinCodeRequestSchema,
  scheduleExceptionSummarySchema,
  scheduleSlotSummarySchema,
  studentClassroomListQuerySchema,
  studentClassroomMembershipSummarySchema,
  studentClassroomsResponseSchema,
  updateClassroomRequestSchema,
} from "@attendease/contracts"

import { type AuthApiRequest, toQuery } from "./client.core"

export function buildAuthClientClassroomMethods(request: AuthApiRequest) {
  return {
    listClassrooms(token: string, filters: ClassroomListQuery = {}): Promise<ClassroomSummary[]> {
      return request("/classrooms", {
        method: "GET",
        token,
        query: toQuery(filters),
        parse: classroomsResponseSchema.parse,
      })
    },
    getClassroom(token: string, classroomId: string): Promise<ClassroomDetail> {
      return request(`/classrooms/${classroomId}`, {
        method: "GET",
        token,
        parse: classroomDetailSchema.parse,
      })
    },
    listMyClassrooms(
      token: string,
      filters: StudentClassroomListQuery = {},
    ): Promise<StudentClassroomMembershipSummary[]> {
      const query = studentClassroomListQuerySchema.parse(filters)

      return request("/students/me/classrooms", {
        method: "GET",
        token,
        query: toQuery(query),
        parse: studentClassroomsResponseSchema.parse,
      })
    },
    joinClassroom(
      token: string,
      payload: JoinClassroomRequest,
    ): Promise<StudentClassroomMembershipSummary> {
      return request("/classrooms/join", {
        method: "POST",
        token,
        payload: joinClassroomRequestSchema.parse(payload),
        parse: studentClassroomMembershipSummarySchema.parse,
      })
    },
    createClassroom(token: string, payload: CreateClassroomRequest): Promise<ClassroomDetail> {
      return request("/classrooms", {
        method: "POST",
        token,
        payload: createClassroomRequestSchema.parse(payload),
        parse: classroomDetailSchema.parse,
      })
    },
    updateClassroom(
      token: string,
      classroomId: string,
      payload: UpdateClassroomRequest,
    ): Promise<ClassroomDetail> {
      return request(`/classrooms/${classroomId}`, {
        method: "PATCH",
        token,
        payload: updateClassroomRequestSchema.parse(payload),
        parse: classroomDetailSchema.parse,
      })
    },
    archiveClassroom(token: string, classroomId: string): Promise<ClassroomDetail> {
      return request(`/classrooms/${classroomId}/archive`, {
        method: "POST",
        token,
        parse: classroomDetailSchema.parse,
      })
    },
    getClassroomSchedule(token: string, classroomId: string): Promise<ClassroomSchedule> {
      return request(`/classrooms/${classroomId}/schedule`, {
        method: "GET",
        token,
        parse: classroomScheduleSchema.parse,
      })
    },
    getClassroomJoinCode(
      token: string,
      classroomId: string,
    ): Promise<ClassroomJoinCodeSummary | null> {
      return request(`/classrooms/${classroomId}/join-code`, {
        method: "GET",
        token,
        parse: classroomJoinCodeSummarySchema.nullable().parse,
      })
    },
    resetClassroomJoinCode(
      token: string,
      classroomId: string,
      payload: ResetClassroomJoinCodeRequest = {},
    ): Promise<ClassroomJoinCodeSummary> {
      return request(`/classrooms/${classroomId}/join-code/reset`, {
        method: "POST",
        token,
        payload: resetClassroomJoinCodeRequestSchema.parse(payload),
        parse: classroomJoinCodeSummarySchema.parse,
      })
    },
    createClassroomWeeklySlot(
      token: string,
      classroomId: string,
      payload: CreateScheduleSlotRequest,
    ) {
      return request(`/classrooms/${classroomId}/schedule/weekly-slots`, {
        method: "POST",
        token,
        payload,
        parse: scheduleSlotSummarySchema.parse,
      })
    },
    updateClassroomWeeklySlot(
      token: string,
      classroomId: string,
      slotId: string,
      payload: UpdateScheduleSlotRequest,
    ) {
      return request(`/classrooms/${classroomId}/schedule/weekly-slots/${slotId}`, {
        method: "PATCH",
        token,
        payload,
        parse: scheduleSlotSummarySchema.parse,
      })
    },
    createClassroomScheduleException(
      token: string,
      classroomId: string,
      payload: CreateScheduleExceptionRequest,
    ) {
      return request(`/classrooms/${classroomId}/schedule/exceptions`, {
        method: "POST",
        token,
        payload,
        parse: scheduleExceptionSummarySchema.parse,
      })
    },
    updateClassroomScheduleException(
      token: string,
      classroomId: string,
      exceptionId: string,
      payload: UpdateScheduleExceptionRequest,
    ) {
      return request(`/classrooms/${classroomId}/schedule/exceptions/${exceptionId}`, {
        method: "PATCH",
        token,
        payload,
        parse: scheduleExceptionSummarySchema.parse,
      })
    },
    saveAndNotifyClassroomSchedule(
      token: string,
      classroomId: string,
      payload: SaveAndNotifyScheduleRequest,
    ) {
      return request(`/classrooms/${classroomId}/schedule/save-and-notify`, {
        method: "POST",
        token,
        payload,
        parse: classroomScheduleSchema.parse,
      })
    },
    listClassroomLectures(
      token: string,
      classroomId: string,
      filters: LectureListQuery = {},
    ): Promise<LectureSummary[]> {
      return request(`/classrooms/${classroomId}/lectures`, {
        method: "GET",
        token,
        query: toQuery(filters),
        parse: lecturesResponseSchema.parse,
      })
    },
    createClassroomLecture(
      token: string,
      classroomId: string,
      payload: CreateLectureRequest,
    ): Promise<LectureSummary> {
      return request(`/classrooms/${classroomId}/lectures`, {
        method: "POST",
        token,
        payload: createLectureRequestSchema.parse(payload),
        parse: lectureSummarySchema.parse,
      })
    },
    deleteClassroomLecture(
      token: string,
      classroomId: string,
      lectureId: string,
    ): Promise<{ success: boolean }> {
      return request(`/classrooms/${classroomId}/lectures/${lectureId}`, {
        method: "DELETE",
        token,
        parse: (v) => v as { success: boolean },
      })
    },
  }
}
