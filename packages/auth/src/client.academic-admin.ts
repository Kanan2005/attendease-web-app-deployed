import {
  type AdminArchiveClassroomRequest,
  type AdminClassroomGovernanceDetail,
  type AdminClassroomGovernanceSearchQuery,
  type AdminClassroomGovernanceSummary,
  type CreateSemesterRequest,
  type EnrollmentListQuery,
  type EnrollmentSummary,
  type SemesterListQuery,
  type SemesterSummary,
  type TeacherAssignmentListQuery,
  type TeacherAssignmentSummary,
  type UpdateSemesterRequest,
  adminArchiveClassroomRequestSchema,
  adminClassroomGovernanceDetailSchema,
  adminClassroomGovernanceResponseSchema,
  adminClassroomGovernanceSearchQuerySchema,
  enrollmentSummarySchema,
  enrollmentsResponseSchema,
  semesterSummarySchema,
  semestersResponseSchema,
  teacherAssignmentSummarySchema,
  teacherAssignmentsResponseSchema,
} from "@attendease/contracts"

import { type AuthApiRequest, toQuery } from "./client.core"

export function buildAuthClientAcademicAdminMethods(request: AuthApiRequest) {
  return {
    listMyAssignments(
      token: string,
      filters: TeacherAssignmentListQuery = {},
    ): Promise<TeacherAssignmentSummary[]> {
      return request("/academic/assignments/me", {
        method: "GET",
        token,
        query: toQuery(filters),
        parse: teacherAssignmentsResponseSchema.parse,
      })
    },
    getMyAssignment(token: string, assignmentId: string): Promise<TeacherAssignmentSummary> {
      return request(`/academic/assignments/me/${assignmentId}`, {
        method: "GET",
        token,
        parse: teacherAssignmentSummarySchema.parse,
      })
    },
    listMyEnrollments(
      token: string,
      filters: EnrollmentListQuery = {},
    ): Promise<EnrollmentSummary[]> {
      return request("/academic/enrollments/me", {
        method: "GET",
        token,
        query: toQuery(filters),
        parse: enrollmentsResponseSchema.parse,
      })
    },
    getMyEnrollment(token: string, enrollmentId: string): Promise<EnrollmentSummary> {
      return request(`/academic/enrollments/me/${enrollmentId}`, {
        method: "GET",
        token,
        parse: enrollmentSummarySchema.parse,
      })
    },
    listSemesters(token: string, filters: SemesterListQuery = {}): Promise<SemesterSummary[]> {
      return request("/admin/semesters", {
        method: "GET",
        token,
        query: toQuery(filters),
        parse: semestersResponseSchema.parse,
      })
    },
    getSemester(token: string, semesterId: string): Promise<SemesterSummary> {
      return request(`/admin/semesters/${semesterId}`, {
        method: "GET",
        token,
        parse: semesterSummarySchema.parse,
      })
    },
    createSemester(token: string, payload: CreateSemesterRequest): Promise<SemesterSummary> {
      return request("/admin/semesters", {
        method: "POST",
        token,
        payload,
        parse: semesterSummarySchema.parse,
      })
    },
    updateSemester(
      token: string,
      semesterId: string,
      payload: UpdateSemesterRequest,
    ): Promise<SemesterSummary> {
      return request(`/admin/semesters/${semesterId}`, {
        method: "PATCH",
        token,
        payload,
        parse: semesterSummarySchema.parse,
      })
    },
    activateSemester(token: string, semesterId: string): Promise<SemesterSummary> {
      return request(`/admin/semesters/${semesterId}/activate`, {
        method: "POST",
        token,
        parse: semesterSummarySchema.parse,
      })
    },
    archiveSemester(token: string, semesterId: string): Promise<SemesterSummary> {
      return request(`/admin/semesters/${semesterId}/archive`, {
        method: "POST",
        token,
        parse: semesterSummarySchema.parse,
      })
    },
    listAdminClassrooms(
      token: string,
      filters: Partial<AdminClassroomGovernanceSearchQuery> = {},
    ): Promise<AdminClassroomGovernanceSummary[]> {
      const query = adminClassroomGovernanceSearchQuerySchema.parse(filters)

      return request("/admin/classrooms", {
        method: "GET",
        token,
        query: toQuery(query),
        parse: adminClassroomGovernanceResponseSchema.parse,
      })
    },
    getAdminClassroom(token: string, classroomId: string): Promise<AdminClassroomGovernanceDetail> {
      return request(`/admin/classrooms/${classroomId}`, {
        method: "GET",
        token,
        parse: adminClassroomGovernanceDetailSchema.parse,
      })
    },
    archiveAdminClassroom(
      token: string,
      classroomId: string,
      payload: AdminArchiveClassroomRequest,
    ): Promise<AdminClassroomGovernanceDetail> {
      return request(`/admin/classrooms/${classroomId}/archive`, {
        method: "POST",
        token,
        payload: adminArchiveClassroomRequestSchema.parse(payload),
        parse: adminClassroomGovernanceDetailSchema.parse,
      })
    },
  }
}
