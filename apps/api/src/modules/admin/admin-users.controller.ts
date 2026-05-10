import {
  adminForceLogoutResponseSchema,
  adminUsersAttendanceToggleRequestSchema,
  adminUsersAttendanceToggleResponseSchema,
  adminUsersFilterOptionsSchema,
  adminUserSessionsQuerySchema,
  adminUserSessionsResponseSchema,
  adminUsersStudentListQuerySchema,
  adminUsersStudentListResponseSchema,
  adminUsersStudentProfileSchema,
  adminUsersTeacherListQuerySchema,
  adminUsersTeacherListResponseSchema,
  adminUsersTeacherProfileSchema,
} from "@attendease/contracts"
import { Body, Controller, Get, Inject, Logger, Param, Post, Query, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { AdminSecurityService } from "./admin-security.service.js"
import { AdminUsersService } from "./admin-users.service.js"

@Controller("admin/users")
@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminUsersController {
  private readonly logger = new Logger(AdminUsersController.name)

  constructor(
    @Inject(AdminUsersService)
    private readonly adminUsersService: AdminUsersService,
    @Inject(AdminSecurityService)
    private readonly adminSecurityService: AdminSecurityService,
  ) {}

  @Get("filter-options")
  async getFilterOptions() {
    return adminUsersFilterOptionsSchema.parse(
      await this.adminUsersService.getFilterOptions(),
    )
  }

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

  @Get(":userId/sessions")
  async listUserSessions(
    @Param("userId") userId: string,
    @Query() query: unknown,
  ) {
    try {
      const parsed = parseWithSchema(adminUserSessionsQuerySchema, query ?? {})
      const result = await this.adminSecurityService.listUserSessions(userId, parsed)
      return adminUserSessionsResponseSchema.parse(result)
    } catch (error) {
      this.logger.error(`Failed to list sessions for user ${userId}`, error)
      throw error
    }
  }

  @Post(":userId/force-logout")
  async forceLogout(
    @CurrentAuth() auth: AuthRequestContext,
    @Param("userId") userId: string,
  ) {
    try {
      const result = await this.adminSecurityService.forceLogout(userId, auth.userId)
      return adminForceLogoutResponseSchema.parse(result)
    } catch (error) {
      this.logger.error(`Failed to force-logout user ${userId}`, error)
      throw error
    }
  }
}
