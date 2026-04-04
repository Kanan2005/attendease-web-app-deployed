import type {
  StudentReportOverview,
  StudentSubjectReportDetail,
  StudentSubjectReportParams,
  StudentSubjectReportSummary,
  TeacherDaywiseAttendanceReportResponse,
  TeacherReportFilters,
  TeacherStudentAttendancePercentageReportResponse,
  TeacherSubjectwiseAttendanceReportResponse,
} from "@attendease/contracts"
import { Prisma } from "@attendease/db"
import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common"

import { DatabaseService } from "../../database/database.service.js"
import { AssignmentsService } from "../academic/assignments.service.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import {
  type StudentOverviewRow,
  type StudentSubjectAggregateRow,
  type TeacherDaywiseRollupRow,
  type TeacherStudentPercentageRow,
  type TeacherSubjectwiseRollupRow,
  toStudentReportOverview,
  toStudentSubjectReportDetail,
  toStudentSubjectReportSummaries,
  toTeacherDaywiseAttendanceReportRow,
  toTeacherStudentAttendancePercentageReportRow,
  toTeacherSubjectwiseAttendanceReportRow,
} from "./reports.models.js"

const nonDroppedEnrollmentStatuses = ["ACTIVE", "PENDING", "BLOCKED"] as const

function toDateOnlyString(value: string | undefined): string | null {
  if (!value) {
    return null
  }

  return new Date(value).toISOString().slice(0, 10)
}

function appendCondition(conditions: Prisma.Sql[], condition: Prisma.Sql) {
  conditions.push(condition)
}

function buildWhereClause(conditions: Prisma.Sql[]): Prisma.Sql {
  if (conditions.length === 0) {
    return Prisma.empty
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
}

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AssignmentsService) private readonly assignmentsService: AssignmentsService,
  ) {}

  async listTeacherDaywiseReport(
    auth: AuthRequestContext,
    filters: TeacherReportFilters,
  ): Promise<TeacherDaywiseAttendanceReportResponse> {
    await this.assertTeacherReportAccess(auth, filters)

    const rows = await this.database.prisma.$queryRaw<TeacherDaywiseRollupRow[]>(
      Prisma.sql`
        SELECT
          attendance_date,
          course_offering_id,
          course_offering_code,
          course_offering_title,
          class_id,
          class_code,
          class_title,
          section_id,
          section_code,
          section_title,
          subject_id,
          subject_code,
          subject_title,
          session_count,
          total_students,
          present_count,
          absent_count,
          last_session_at
        FROM "report_daywise_attendance_rollup"
        ${this.buildTeacherRollupWhere(auth, filters)}
        ORDER BY attendance_date DESC, course_offering_code ASC
      `,
    )

    return rows.map(toTeacherDaywiseAttendanceReportRow)
  }

  async listTeacherSubjectwiseReport(
    auth: AuthRequestContext,
    filters: TeacherReportFilters,
  ): Promise<TeacherSubjectwiseAttendanceReportResponse> {
    await this.assertTeacherReportAccess(auth, filters)

    const rows = await this.database.prisma.$queryRaw<TeacherSubjectwiseRollupRow[]>(
      Prisma.sql`
        SELECT
          course_offering_id,
          course_offering_code,
          course_offering_title,
          class_id,
          class_code,
          class_title,
          section_id,
          section_code,
          section_title,
          subject_id,
          subject_code,
          subject_title,
          SUM(session_count)::INTEGER AS total_sessions,
          SUM(total_students)::INTEGER AS total_students,
          SUM(present_count)::INTEGER AS present_count,
          SUM(absent_count)::INTEGER AS absent_count,
          MAX(last_session_at) AS last_session_at
        FROM "report_daywise_attendance_rollup"
        ${this.buildTeacherRollupWhere(auth, filters)}
        GROUP BY
          course_offering_id,
          course_offering_code,
          course_offering_title,
          class_id,
          class_code,
          class_title,
          section_id,
          section_code,
          section_title,
          subject_id,
          subject_code,
          subject_title
        ORDER BY subject_code ASC, course_offering_code ASC
      `,
    )

    return rows.map(toTeacherSubjectwiseAttendanceReportRow)
  }

  async listTeacherStudentPercentageReport(
    auth: AuthRequestContext,
    filters: TeacherReportFilters,
  ): Promise<TeacherStudentAttendancePercentageReportResponse> {
    await this.assertTeacherReportAccess(auth, filters)

    const fromDate = toDateOnlyString(filters.from)
    const toDate = toDateOnlyString(filters.to)
    const joinConditions: Prisma.Sql[] = [
      Prisma.sql`session.id = record."sessionId"`,
      Prisma.sql`session.status IN ('ENDED', 'EXPIRED')`,
    ]

    if (fromDate) {
      appendCondition(
        joinConditions,
        Prisma.sql`COALESCE(session."startedAt"::date, session."endedAt"::date, session."createdAt"::date) >= ${fromDate}::date`,
      )
    }

    if (toDate) {
      appendCondition(
        joinConditions,
        Prisma.sql`COALESCE(session."startedAt"::date, session."endedAt"::date, session."createdAt"::date) <= ${toDate}::date`,
      )
    }

    const whereConditions: Prisma.Sql[] = [
      Prisma.sql`enrollment.status IN (${Prisma.join(nonDroppedEnrollmentStatuses)})`,
    ]

    if (auth.activeRole === "TEACHER") {
      appendCondition(whereConditions, Prisma.sql`course."primaryTeacherId" = ${auth.userId}`)
    }

    if (filters.classroomId) {
      appendCondition(whereConditions, Prisma.sql`course.id = ${filters.classroomId}`)
    }

    if (filters.classId) {
      appendCondition(whereConditions, Prisma.sql`enrollment."classId" = ${filters.classId}`)
    }

    if (filters.sectionId) {
      appendCondition(whereConditions, Prisma.sql`enrollment."sectionId" = ${filters.sectionId}`)
    }

    if (filters.subjectId) {
      appendCondition(whereConditions, Prisma.sql`enrollment."subjectId" = ${filters.subjectId}`)
    }

    const rows = await this.database.prisma.$queryRaw<TeacherStudentPercentageRow[]>(
      Prisma.sql`
        SELECT
          enrollment."courseOfferingId" AS course_offering_id,
          course.code AS course_offering_code,
          course."displayTitle" AS course_offering_title,
          enrollment."classId" AS class_id,
          class.code AS class_code,
          class.title AS class_title,
          enrollment."sectionId" AS section_id,
          section.code AS section_code,
          section.title AS section_title,
          enrollment."subjectId" AS subject_id,
          subject.code AS subject_code,
          subject.title AS subject_title,
          enrollment."studentId" AS student_id,
          student.email AS student_email,
          student."displayName" AS student_name,
          student_profile."rollNumber" AS student_roll_number,
          student_profile."parentEmail" AS student_parent_email,
          enrollment.status AS enrollment_status,
          COUNT(session.id)::INTEGER AS total_sessions,
          COUNT(session.id) FILTER (WHERE record.status = 'PRESENT')::INTEGER AS present_sessions,
          COUNT(session.id) FILTER (WHERE record.status = 'ABSENT')::INTEGER AS absent_sessions,
          MAX(COALESCE(session."endedAt", session."startedAt")) AS last_session_at,
          COALESCE(email_counts.sent_count, 0)::INTEGER AS email_sent_count
        FROM "enrollments" AS enrollment
        JOIN "course_offerings" AS course ON course.id = enrollment."courseOfferingId"
        JOIN "classes" AS class ON class.id = enrollment."classId"
        JOIN "sections" AS section ON section.id = enrollment."sectionId"
        JOIN "subjects" AS subject ON subject.id = enrollment."subjectId"
        JOIN "users" AS student ON student.id = enrollment."studentId"
        LEFT JOIN "student_profiles" AS student_profile
          ON student_profile."userId" = student.id
        LEFT JOIN "attendance_records" AS record
          ON record."enrollmentId" = enrollment.id
        LEFT JOIN "attendance_sessions" AS session
          ON ${Prisma.join(joinConditions, " AND ")}
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::INTEGER AS sent_count
          FROM "email_logs" AS el
          WHERE el."studentId" = enrollment."studentId"
            AND el.status = 'SENT'
        ) AS email_counts ON TRUE
        ${buildWhereClause(whereConditions)}
        GROUP BY
          enrollment."courseOfferingId",
          course.code,
          course."displayTitle",
          enrollment."classId",
          class.code,
          class.title,
          enrollment."sectionId",
          section.code,
          section.title,
          enrollment."subjectId",
          subject.code,
          subject.title,
          enrollment."studentId",
          student.email,
          student."displayName",
          student_profile."rollNumber",
          student_profile."parentEmail",
          enrollment.status,
          email_counts.sent_count
        ORDER BY subject_code ASC, course_offering_code ASC, student_email ASC
      `,
    )

    return rows.map(toTeacherStudentAttendancePercentageReportRow)
  }

  async getStudentReportOverview(auth: AuthRequestContext): Promise<StudentReportOverview> {
    const [row] = await this.database.prisma.$queryRaw<StudentOverviewRow[]>(
      Prisma.sql`
        SELECT
          student_id,
          tracked_classroom_count,
          total_sessions,
          present_sessions,
          absent_sessions,
          last_session_at
        FROM "report_student_report_overview"
        WHERE student_id = ${auth.userId}
      `,
    )

    return toStudentReportOverview(auth.userId, row ?? null)
  }

  async listStudentSubjectReports(
    auth: AuthRequestContext,
  ): Promise<StudentSubjectReportSummary[]> {
    const rows = await this.listStudentSubjectRows(auth.userId)
    return toStudentSubjectReportSummaries(rows)
  }

  async getStudentSubjectReport(
    auth: AuthRequestContext,
    params: StudentSubjectReportParams,
  ): Promise<StudentSubjectReportDetail> {
    const rows = await this.listStudentSubjectRows(auth.userId)
    const detail = toStudentSubjectReportDetail(params.subjectId, rows)

    if (!detail) {
      throw new NotFoundException("Student subject report not found.")
    }

    return detail
  }

  async assertTeacherReportAccess(
    auth: AuthRequestContext,
    filters: TeacherReportFilters,
  ): Promise<void> {
    if (auth.activeRole !== "TEACHER") {
      return
    }

    if (filters.classroomId) {
      await this.assignmentsService.ensureTeacherCanManageCourseOffering(
        auth.userId,
        filters.classroomId,
      )
      return
    }

    if (!filters.classId && !filters.sectionId && !filters.subjectId) {
      return
    }

    const matchingAssignment = await this.database.prisma.teacherAssignment.findFirst({
      where: {
        teacherId: auth.userId,
        status: "ACTIVE",
        ...(filters.classId ? { classId: filters.classId } : {}),
        ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
        ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      },
      select: {
        id: true,
      },
    })

    if (!matchingAssignment) {
      throw new ForbiddenException("The teacher cannot access reports for the requested scope.")
    }
  }

  private buildTeacherRollupWhere(
    auth: AuthRequestContext,
    filters: TeacherReportFilters,
  ): Prisma.Sql {
    const conditions: Prisma.Sql[] = []
    const fromDate = toDateOnlyString(filters.from)
    const toDate = toDateOnlyString(filters.to)

    if (auth.activeRole === "TEACHER") {
      appendCondition(conditions, Prisma.sql`teacher_id = ${auth.userId}`)
    }

    if (filters.classroomId) {
      appendCondition(conditions, Prisma.sql`course_offering_id = ${filters.classroomId}`)
    }

    if (filters.classId) {
      appendCondition(conditions, Prisma.sql`class_id = ${filters.classId}`)
    }

    if (filters.sectionId) {
      appendCondition(conditions, Prisma.sql`section_id = ${filters.sectionId}`)
    }

    if (filters.subjectId) {
      appendCondition(conditions, Prisma.sql`subject_id = ${filters.subjectId}`)
    }

    if (fromDate) {
      appendCondition(conditions, Prisma.sql`attendance_date >= ${fromDate}::date`)
    }

    if (toDate) {
      appendCondition(conditions, Prisma.sql`attendance_date <= ${toDate}::date`)
    }

    return buildWhereClause(conditions)
  }

  private async listStudentSubjectRows(studentId: string): Promise<StudentSubjectAggregateRow[]> {
    return this.database.prisma.$queryRaw<StudentSubjectAggregateRow[]>(
      Prisma.sql`
        SELECT
          subject_id,
          subject_code,
          subject_title,
          course_offering_id,
          course_offering_code,
          course_offering_title,
          total_sessions,
          present_sessions,
          absent_sessions,
          last_session_at
        FROM "report_student_attendance_percentage"
        WHERE student_id = ${studentId}
          AND enrollment_status IN (${Prisma.join(nonDroppedEnrollmentStatuses)})
        ORDER BY subject_code ASC, course_offering_code ASC
      `,
    )
  }
}
