import {
  studentReportOverviewSchema,
  studentSubjectReportDetailSchema,
  studentSubjectReportParamsSchema,
  studentSubjectReportSummaryResponseSchema,
} from "@attendease/contracts"
import { Controller, Get, Inject, Param, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { ReportsService } from "./reports.service.js"

@Controller("students/me/reports")
@UseGuards(AuthGuard, RolesGuard)
@Roles("STUDENT")
export class StudentReportsController {
  constructor(@Inject(ReportsService) private readonly reportsService: ReportsService) {}

  @Get("overview")
  async getOverview(@CurrentAuth() auth: AuthRequestContext) {
    return studentReportOverviewSchema.parse(
      await this.reportsService.getStudentReportOverview(auth),
    )
  }

  @Get("subjects")
  async listSubjects(@CurrentAuth() auth: AuthRequestContext) {
    return studentSubjectReportSummaryResponseSchema.parse(
      await this.reportsService.listStudentSubjectReports(auth),
    )
  }

  @Get("subjects/:subjectId")
  async getSubject(@CurrentAuth() auth: AuthRequestContext, @Param() params: unknown) {
    return studentSubjectReportDetailSchema.parse(
      await this.reportsService.getStudentSubjectReport(
        auth,
        parseWithSchema(studentSubjectReportParamsSchema, params),
      ),
    )
  }
}
