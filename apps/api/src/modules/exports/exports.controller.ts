import {
  createExportJobRequestSchema,
  exportJobDetailSchema,
  exportJobListQuerySchema,
  exportJobParamsSchema,
  exportJobsResponseSchema,
} from "@attendease/contracts"
import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { ExportsService } from "./exports.service.js"

@Controller("exports")
@UseGuards(AuthGuard, RolesGuard)
@Roles("TEACHER", "ADMIN")
export class ExportsController {
  constructor(@Inject(ExportsService) private readonly exportsService: ExportsService) {}

  @Post()
  async createExportJob(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    return exportJobDetailSchema.parse(
      await this.exportsService.createExportJob(
        auth,
        parseWithSchema(createExportJobRequestSchema, body),
      ),
    )
  }

  @Get()
  async listExportJobs(@CurrentAuth() auth: AuthRequestContext, @Query() query: unknown) {
    return exportJobsResponseSchema.parse(
      await this.exportsService.listExportJobs(
        auth,
        parseWithSchema(exportJobListQuerySchema, query),
      ),
    )
  }

  @Get(":exportJobId")
  async getExportJob(@CurrentAuth() auth: AuthRequestContext, @Param() params: unknown) {
    return exportJobDetailSchema.parse(
      await this.exportsService.getExportJob(auth, parseWithSchema(exportJobParamsSchema, params)),
    )
  }
}
