import {
  enrollmentListQuerySchema,
  enrollmentParamsSchema,
  enrollmentSummarySchema,
  enrollmentsResponseSchema,
  teacherAssignmentListQuerySchema,
  teacherAssignmentParamsSchema,
  teacherAssignmentSummarySchema,
  teacherAssignmentsResponseSchema,
} from "@attendease/contracts"
import { Controller, Get, Inject, Param, Query, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { AssignmentsService } from "./assignments.service.js"
import { EnrollmentsService } from "./enrollments.service.js"

@Controller("academic")
@UseGuards(AuthGuard, RolesGuard)
export class AcademicController {
  constructor(
    @Inject(AssignmentsService)
    private readonly assignmentsService: AssignmentsService,
    @Inject(EnrollmentsService)
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  @Get("assignments/me")
  @Roles("TEACHER")
  async getMyAssignments(@CurrentAuth() auth: AuthRequestContext, @Query() query: unknown) {
    return teacherAssignmentsResponseSchema.parse(
      await this.assignmentsService.listTeacherAssignments(
        auth.userId,
        parseWithSchema(teacherAssignmentListQuerySchema, query),
      ),
    )
  }

  @Get("assignments/me/:assignmentId")
  @Roles("TEACHER")
  async getMyAssignment(@CurrentAuth() auth: AuthRequestContext, @Param() params: unknown) {
    return teacherAssignmentSummarySchema.parse(
      await this.assignmentsService.getTeacherAssignment(
        auth.userId,
        parseWithSchema(teacherAssignmentParamsSchema, params).assignmentId,
      ),
    )
  }

  @Get("enrollments/me")
  @Roles("STUDENT")
  async getMyEnrollments(@CurrentAuth() auth: AuthRequestContext, @Query() query: unknown) {
    return enrollmentsResponseSchema.parse(
      await this.enrollmentsService.listStudentEnrollments(
        auth.userId,
        parseWithSchema(enrollmentListQuerySchema, query),
      ),
    )
  }

  @Get("enrollments/me/:enrollmentId")
  @Roles("STUDENT")
  async getMyEnrollment(@CurrentAuth() auth: AuthRequestContext, @Param() params: unknown) {
    return enrollmentSummarySchema.parse(
      await this.enrollmentsService.getStudentEnrollment(
        auth.userId,
        parseWithSchema(enrollmentParamsSchema, params).enrollmentId,
      ),
    )
  }
}
