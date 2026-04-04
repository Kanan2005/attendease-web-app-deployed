import {
  sendThresholdEmailsRequestSchema,
  sendThresholdEmailsResponseSchema,
  teacherDaywiseAttendanceReportResponseSchema,
  teacherReportFiltersSchema,
  teacherStudentAttendancePercentageReportResponseSchema,
  teacherSubjectwiseAttendanceReportResponseSchema,
} from "@attendease/contracts"
import { Body, Controller, Get, Inject, Post, Query, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { EmailReminderService } from "./email-reminder.service.js"
import { ReportsService } from "./reports.service.js"

@Controller("reports")
@UseGuards(AuthGuard, RolesGuard)
@Roles("TEACHER", "ADMIN")
export class ReportsController {
  constructor(
    @Inject(ReportsService) private readonly reportsService: ReportsService,
    @Inject(EmailReminderService) private readonly emailReminderService: EmailReminderService,
  ) {}

  @Get("daywise")
  async listDaywise(@CurrentAuth() auth: AuthRequestContext, @Query() query: unknown) {
    return teacherDaywiseAttendanceReportResponseSchema.parse(
      await this.reportsService.listTeacherDaywiseReport(
        auth,
        parseWithSchema(teacherReportFiltersSchema, query),
      ),
    )
  }

  @Get("subjectwise")
  async listSubjectwise(@CurrentAuth() auth: AuthRequestContext, @Query() query: unknown) {
    return teacherSubjectwiseAttendanceReportResponseSchema.parse(
      await this.reportsService.listTeacherSubjectwiseReport(
        auth,
        parseWithSchema(teacherReportFiltersSchema, query),
      ),
    )
  }

  @Get("students/percentages")
  async listStudentPercentages(@CurrentAuth() auth: AuthRequestContext, @Query() query: unknown) {
    return teacherStudentAttendancePercentageReportResponseSchema.parse(
      await this.reportsService.listTeacherStudentPercentageReport(
        auth,
        parseWithSchema(teacherReportFiltersSchema, query),
      ),
    )
  }

  @Post("send-threshold-emails")
  async sendThresholdEmails(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    return sendThresholdEmailsResponseSchema.parse(
      await this.emailReminderService.sendThresholdEmails(
        auth,
        parseWithSchema(sendThresholdEmailsRequestSchema, body),
      ),
    )
  }
}
