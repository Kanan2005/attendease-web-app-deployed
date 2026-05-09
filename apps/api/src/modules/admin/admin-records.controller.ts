import {
  adminRecordsArchiveRequestSchema,
  adminRecordsArchiveResponseSchema,
  adminRecordsCourseListResponseSchema,
  adminRecordsCourseSearchQuerySchema,
  adminRecordsCourseSearchResponseSchema,
  adminRecordsDepartmentListResponseSchema,
  adminRecordsStudentListResponseSchema,
  adminRecordsTeacherListResponseSchema,
} from "@attendease/contracts"
import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { AdminRecordsService } from "./admin-records.service.js"

@Controller("admin/records")
@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminRecordsController {
  constructor(
    @Inject(AdminRecordsService)
    private readonly adminRecordsService: AdminRecordsService,
  ) {}

  @Get("departments")
  async listDepartments() {
    return adminRecordsDepartmentListResponseSchema.parse(
      await this.adminRecordsService.listDepartments(),
    )
  }

  @Get("departments/:department/teachers")
  async listTeachersInDepartment(@Param("department") department: string) {
    return adminRecordsTeacherListResponseSchema.parse(
      await this.adminRecordsService.listTeachersInDepartment(decodeURIComponent(department)),
    )
  }

  @Get("teachers/:teacherId/courses")
  async listCoursesByTeacher(@Param("teacherId") teacherId: string) {
    return adminRecordsCourseListResponseSchema.parse(
      await this.adminRecordsService.listCoursesByTeacher(teacherId),
    )
  }

  @Get("courses/search")
  async searchCourses(@Query() query: Record<string, string | undefined>) {
    return adminRecordsCourseSearchResponseSchema.parse(
      await this.adminRecordsService.searchCourses(
        parseWithSchema(adminRecordsCourseSearchQuerySchema, query),
      ),
    )
  }

  @Get("courses/:courseOfferingId/students")
  async listStudentsInCourse(@Param("courseOfferingId") courseOfferingId: string) {
    return adminRecordsStudentListResponseSchema.parse(
      await this.adminRecordsService.listStudentsInCourse(courseOfferingId),
    )
  }

  @Post("courses/:courseOfferingId/archive")
  async archiveCourse(
    @CurrentAuth() auth: AuthRequestContext,
    @Param("courseOfferingId") courseOfferingId: string,
    @Body() body: unknown,
  ) {
    return adminRecordsArchiveResponseSchema.parse(
      await this.adminRecordsService.archiveCourse(
        auth,
        courseOfferingId,
        parseWithSchema(adminRecordsArchiveRequestSchema, body ?? {}),
      ),
    )
  }

  @Post("courses/:courseOfferingId/unarchive")
  async unarchiveCourse(
    @CurrentAuth() auth: AuthRequestContext,
    @Param("courseOfferingId") courseOfferingId: string,
    @Body() body: unknown,
  ) {
    return adminRecordsArchiveResponseSchema.parse(
      await this.adminRecordsService.unarchiveCourse(
        auth,
        courseOfferingId,
        parseWithSchema(adminRecordsArchiveRequestSchema, body ?? {}),
      ),
    )
  }
}
