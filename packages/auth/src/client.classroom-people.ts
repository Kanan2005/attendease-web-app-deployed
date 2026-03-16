import {
  type AddClassroomStudentRequest,
  type AnnouncementListQuery,
  type AnnouncementSummary,
  type ClassroomRosterListQuery,
  type ClassroomRosterMemberSummary,
  type ClassroomStudentListQuery,
  type ClassroomStudentSummary,
  type CreateAnnouncementRequest,
  type CreateClassroomRosterMemberRequest,
  type CreateRosterImportJobRequest,
  type RosterImportJobDetail,
  type RosterImportJobListQuery,
  type RosterImportJobSummary,
  type UpdateClassroomRosterMemberRequest,
  type UpdateClassroomStudentRequest,
  addClassroomStudentRequestSchema,
  announcementListQuerySchema,
  announcementSummarySchema,
  announcementsResponseSchema,
  classroomRosterListQuerySchema,
  classroomRosterMemberSummarySchema,
  classroomRosterResponseSchema,
  classroomStudentListQuerySchema,
  classroomStudentsResponseSchema,
  createAnnouncementRequestSchema,
  createClassroomRosterMemberRequestSchema,
  createRosterImportJobRequestSchema,
  rosterImportJobDetailSchema,
  rosterImportJobListQuerySchema,
  rosterImportJobsResponseSchema,
  updateClassroomRosterMemberRequestSchema,
  updateClassroomStudentRequestSchema,
} from "@attendease/contracts"

import { type AuthApiRequest, toQuery } from "./client.core"

export function buildAuthClientClassroomPeopleMethods(request: AuthApiRequest) {
  return {
    listClassroomAnnouncements(
      token: string,
      classroomId: string,
      filters: AnnouncementListQuery = {},
    ): Promise<AnnouncementSummary[]> {
      const query = announcementListQuerySchema.parse(filters)

      return request(`/classrooms/${classroomId}/stream`, {
        method: "GET",
        token,
        query: toQuery(query),
        parse: announcementsResponseSchema.parse,
      })
    },
    createClassroomAnnouncement(
      token: string,
      classroomId: string,
      payload: CreateAnnouncementRequest,
    ): Promise<AnnouncementSummary> {
      return request(`/classrooms/${classroomId}/announcements`, {
        method: "POST",
        token,
        payload: createAnnouncementRequestSchema.parse(payload),
        parse: announcementSummarySchema.parse,
      })
    },
    listClassroomRoster(
      token: string,
      classroomId: string,
      filters: ClassroomRosterListQuery = {},
    ): Promise<ClassroomRosterMemberSummary[]> {
      const query = classroomRosterListQuerySchema.parse(filters)

      return request(`/classrooms/${classroomId}/students`, {
        method: "GET",
        token,
        query: toQuery(query),
        parse: classroomRosterResponseSchema.parse,
      })
    },
    listClassroomStudents(
      token: string,
      classroomId: string,
      filters: ClassroomStudentListQuery = {},
    ): Promise<ClassroomStudentSummary[]> {
      const query = classroomStudentListQuerySchema.parse(filters)

      return request(`/classrooms/${classroomId}/students`, {
        method: "GET",
        token,
        query: toQuery(query),
        parse: classroomStudentsResponseSchema.parse,
      })
    },
    addClassroomRosterMember(
      token: string,
      classroomId: string,
      payload: CreateClassroomRosterMemberRequest,
    ): Promise<ClassroomRosterMemberSummary> {
      return request(`/classrooms/${classroomId}/students`, {
        method: "POST",
        token,
        payload: createClassroomRosterMemberRequestSchema.parse(payload),
        parse: classroomRosterMemberSummarySchema.parse,
      })
    },
    addClassroomStudent(
      token: string,
      classroomId: string,
      payload: AddClassroomStudentRequest,
    ): Promise<ClassroomStudentSummary> {
      return request(`/classrooms/${classroomId}/students`, {
        method: "POST",
        token,
        payload: addClassroomStudentRequestSchema.parse(payload),
        parse: classroomRosterMemberSummarySchema.parse,
      })
    },
    updateClassroomRosterMember(
      token: string,
      classroomId: string,
      enrollmentId: string,
      payload: UpdateClassroomRosterMemberRequest,
    ): Promise<ClassroomRosterMemberSummary> {
      return request(`/classrooms/${classroomId}/students/${enrollmentId}`, {
        method: "PATCH",
        token,
        payload: updateClassroomRosterMemberRequestSchema.parse(payload),
        parse: classroomRosterMemberSummarySchema.parse,
      })
    },
    updateClassroomStudent(
      token: string,
      classroomId: string,
      enrollmentId: string,
      payload: UpdateClassroomStudentRequest,
    ): Promise<ClassroomStudentSummary> {
      return request(`/classrooms/${classroomId}/students/${enrollmentId}`, {
        method: "PATCH",
        token,
        payload: updateClassroomStudentRequestSchema.parse(payload),
        parse: classroomRosterMemberSummarySchema.parse,
      })
    },
    removeClassroomRosterMember(
      token: string,
      classroomId: string,
      enrollmentId: string,
    ): Promise<ClassroomRosterMemberSummary> {
      return request(`/classrooms/${classroomId}/students/${enrollmentId}`, {
        method: "DELETE",
        token,
        parse: classroomRosterMemberSummarySchema.parse,
      })
    },
    removeClassroomStudent(
      token: string,
      classroomId: string,
      enrollmentId: string,
    ): Promise<ClassroomStudentSummary> {
      return request(`/classrooms/${classroomId}/students/${enrollmentId}`, {
        method: "DELETE",
        token,
        parse: classroomRosterMemberSummarySchema.parse,
      })
    },
    listRosterImportJobs(
      token: string,
      classroomId: string,
      filters: RosterImportJobListQuery = {},
    ): Promise<RosterImportJobSummary[]> {
      const query = rosterImportJobListQuerySchema.parse(filters)

      return request(`/classrooms/${classroomId}/roster-imports`, {
        method: "GET",
        token,
        query: toQuery(query),
        parse: rosterImportJobsResponseSchema.parse,
      })
    },
    getRosterImportJob(
      token: string,
      classroomId: string,
      jobId: string,
    ): Promise<RosterImportJobDetail> {
      return request(`/classrooms/${classroomId}/roster-imports/${jobId}`, {
        method: "GET",
        token,
        parse: rosterImportJobDetailSchema.parse,
      })
    },
    createRosterImportJob(
      token: string,
      classroomId: string,
      payload: CreateRosterImportJobRequest,
    ): Promise<RosterImportJobDetail> {
      return request(`/classrooms/${classroomId}/roster-imports`, {
        method: "POST",
        token,
        payload: createRosterImportJobRequestSchema.parse(payload),
        parse: rosterImportJobDetailSchema.parse,
      })
    },
    applyRosterImportJob(
      token: string,
      classroomId: string,
      jobId: string,
    ): Promise<RosterImportJobDetail> {
      return request(`/classrooms/${classroomId}/roster-imports/${jobId}/apply`, {
        method: "POST",
        token,
        parse: rosterImportJobDetailSchema.parse,
      })
    },
  }
}
