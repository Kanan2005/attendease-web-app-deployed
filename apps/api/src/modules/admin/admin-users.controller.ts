import {
  adminUsersAttendanceToggleRequestSchema,
  adminUsersAttendanceToggleResponseSchema,
  adminUsersStudentListQuerySchema,
  adminUsersStudentListResponseSchema,
  adminUsersStudentProfileSchema,
  adminUsersTeacherListQuerySchema,
  adminUsersTeacherListResponseSchema,
  adminUsersTeacherProfileSchema,
} from "@attendease/contracts"
import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { AdminUsersService } from "./admin-users.service.js"

@Controller("admin/users")
@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminUsersController {
  constructor(
    @Inject(AdminUsersService)
    private readonly adminUsersService: AdminUsersService,
  ) {}

  @Get("students")
  async listStudents(@Query() query: Record<string, string | undefined>) {
    return adminUsersStudentListResponseSchema.parse(
      await this.adminUsersService.listStudents(
        parseWithSchema(adminUsersStudentListQuerySchema, query),
      ),
    )
  }

  @Get("students/:studentId")
  async getStudentProfile(@Param("studentId") studentId: string) {
    return adminUsersStudentProfileSchema.parse(
      await this.adminUsersService.getStudentProfile(studentId),
    )
  }

  @Post("students/:studentId/attendance-disable")
  async disableStudentAttendance(
    @CurrentAuth() auth: AuthRequestContext,
    @Param("studentId") studentId: string,
    @Body() body: unknown,
  ) {
    return adminUsersAttendanceToggleResponseSchema.parse(
      await this.adminUsersService.toggleStudentAttendance(
        auth,
        studentId,
        true,
        parseWithSchema(adminUsersAttendanceToggleRequestSchema, body ?? {}),
      ),
    )
  }

  @Post("students/:studentId/attendance-enable")
  async enableStudentAttendance(
    @CurrentAuth() auth: AuthRequestContext,
    @Param("studentId") studentId: string,
    @Body() body: unknown,
  ) {
    return adminUsersAttendanceToggleResponseSchema.parse(
      await this.adminUsersService.toggleStudentAttendance(
        auth,
        studentId,
        false,
        parseWithSchema(adminUsersAttendanceToggleRequestSchema, body ?? {}),
      ),
    )
  }

  @Get("teachers")
  async listTeachers(@Query() query: Record<string, string | undefined>) {
    return adminUsersTeacherListResponseSchema.parse(
      await this.adminUsersService.listTeachers(
        parseWithSchema(adminUsersTeacherListQuerySchema, query),
      ),
    )
  }

  @Get("teachers/:teacherId")
  async getTeacherProfile(@Param("teacherId") teacherId: string) {
    return adminUsersTeacherProfileSchema.parse(
      await this.adminUsersService.getTeacherProfile(teacherId),
    )
  }
}
