import {
  createSemesterRequestSchema,
  semesterListQuerySchema,
  semesterParamsSchema,
  semesterSummarySchema,
  semestersResponseSchema,
  updateSemesterRequestSchema,
} from "@attendease/contracts"
import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { SemestersService } from "./semesters.service.js"

@Controller("admin/semesters")
@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
export class SemestersController {
  constructor(@Inject(SemestersService) private readonly semestersService: SemestersService) {}

  @Get()
  async listSemesters(@Query() query: unknown) {
    return semestersResponseSchema.parse(
      await this.semestersService.listSemesters(parseWithSchema(semesterListQuerySchema, query)),
    )
  }

  @Get(":semesterId")
  async getSemester(@Param() params: unknown) {
    return semesterSummarySchema.parse(
      await this.semestersService.getSemesterById(
        parseWithSchema(semesterParamsSchema, params).semesterId,
      ),
    )
  }

  @Post()
  async createSemester(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    return semesterSummarySchema.parse(
      await this.semestersService.createSemester(
        auth.userId,
        parseWithSchema(createSemesterRequestSchema, body),
      ),
    )
  }

  @Patch(":semesterId")
  async updateSemester(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    return semesterSummarySchema.parse(
      await this.semestersService.updateSemester(
        auth.userId,
        parseWithSchema(semesterParamsSchema, params).semesterId,
        parseWithSchema(updateSemesterRequestSchema, body),
      ),
    )
  }

  @Post(":semesterId/activate")
  async activateSemester(@CurrentAuth() auth: AuthRequestContext, @Param() params: unknown) {
    return semesterSummarySchema.parse(
      await this.semestersService.activateSemester(
        auth.userId,
        parseWithSchema(semesterParamsSchema, params).semesterId,
      ),
    )
  }

  @Post(":semesterId/archive")
  async archiveSemester(@CurrentAuth() auth: AuthRequestContext, @Param() params: unknown) {
    return semesterSummarySchema.parse(
      await this.semestersService.archiveSemester(
        auth.userId,
        parseWithSchema(semesterParamsSchema, params).semesterId,
      ),
    )
  }
}
