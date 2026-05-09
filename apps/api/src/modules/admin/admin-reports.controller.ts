import {
  adminCourseReportRequestSchema,
  adminReportJobSummarySchema,
  adminReportRecentListResponseSchema,
  adminStudentReportRequestSchema,
  adminTeacherReportRequestSchema,
} from "@attendease/contracts"
import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { AdminReportsService } from "./admin-reports.service.js"

@Controller("admin/reports")
@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminReportsController {
  constructor(
    @Inject(AdminReportsService)
    private readonly adminReportsService: AdminReportsService,
  ) {}

  @Post("student")
  async generateStudentReport(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    return adminReportJobSummarySchema.parse(
      await this.adminReportsService.generateStudentReport(
        auth,
        parseWithSchema(adminStudentReportRequestSchema, body ?? {}),
      ),
    )
  }

  @Post("teacher")
  async generateTeacherReport(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    return adminReportJobSummarySchema.parse(
      await this.adminReportsService.generateTeacherReport(
        auth,
        parseWithSchema(adminTeacherReportRequestSchema, body ?? {}),
      ),
    )
  }

  @Post("course")
  async generateCourseReport(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    return adminReportJobSummarySchema.parse(
      await this.adminReportsService.generateCourseReport(
        auth,
        parseWithSchema(adminCourseReportRequestSchema, body ?? {}),
      ),
    )
  }

  @Get("recent")
  async listRecentReports(@CurrentAuth() auth: AuthRequestContext) {
    return adminReportRecentListResponseSchema.parse({
      jobs: await this.adminReportsService.listRecentReports(auth),
    })
  }
}
