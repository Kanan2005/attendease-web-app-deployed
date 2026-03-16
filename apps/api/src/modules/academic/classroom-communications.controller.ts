import {
  announcementListQuerySchema,
  announcementSummarySchema,
  announcementsResponseSchema,
  classroomParamsSchema,
  createAnnouncementRequestSchema,
  createRosterImportJobRequestSchema,
  rosterImportJobDetailSchema,
  rosterImportJobListQuerySchema,
  rosterImportJobParamsSchema,
  rosterImportJobsResponseSchema,
} from "@attendease/contracts"
import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { AnnouncementsService } from "./announcements.service.js"
import { RosterImportsService } from "./roster-imports.service.js"

@Controller("classrooms")
@UseGuards(AuthGuard, RolesGuard)
export class ClassroomCommunicationsController {
  constructor(
    @Inject(AnnouncementsService) private readonly announcementsService: AnnouncementsService,
    @Inject(RosterImportsService) private readonly rosterImportsService: RosterImportsService,
  ) {}

  @Get(":classroomId/stream")
  @Roles("TEACHER", "ADMIN", "STUDENT")
  async listStream(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Query() query: unknown,
  ) {
    return announcementsResponseSchema.parse(
      await this.announcementsService.listClassroomStream(
        auth,
        parseWithSchema(classroomParamsSchema, params).classroomId,
        parseWithSchema(announcementListQuerySchema, query),
      ),
    )
  }

  @Post(":classroomId/announcements")
  @Roles("TEACHER", "ADMIN")
  async createAnnouncement(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    return announcementSummarySchema.parse(
      await this.announcementsService.createAnnouncement(
        auth,
        parseWithSchema(classroomParamsSchema, params).classroomId,
        parseWithSchema(createAnnouncementRequestSchema, body),
      ),
    )
  }

  @Get(":classroomId/roster-imports")
  @Roles("TEACHER", "ADMIN")
  async listRosterImportJobs(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Query() query: unknown,
  ) {
    return rosterImportJobsResponseSchema.parse(
      await this.rosterImportsService.listRosterImportJobs(
        auth,
        parseWithSchema(classroomParamsSchema, params).classroomId,
        parseWithSchema(rosterImportJobListQuerySchema, query),
      ),
    )
  }

  @Get(":classroomId/roster-imports/:jobId")
  @Roles("TEACHER", "ADMIN")
  async getRosterImportJob(@CurrentAuth() auth: AuthRequestContext, @Param() params: unknown) {
    const parsedParams = parseWithSchema(rosterImportJobParamsSchema, params)

    return rosterImportJobDetailSchema.parse(
      await this.rosterImportsService.getRosterImportJob(
        auth,
        parsedParams.classroomId,
        parsedParams.jobId,
      ),
    )
  }

  @Post(":classroomId/roster-imports")
  @Roles("TEACHER", "ADMIN")
  async createRosterImportJob(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    return rosterImportJobDetailSchema.parse(
      await this.rosterImportsService.createRosterImportJob(
        auth,
        parseWithSchema(classroomParamsSchema, params).classroomId,
        parseWithSchema(createRosterImportJobRequestSchema, body),
      ),
    )
  }

  @Post(":classroomId/roster-imports/:jobId/apply")
  @Roles("TEACHER", "ADMIN")
  async applyRosterImportJob(@CurrentAuth() auth: AuthRequestContext, @Param() params: unknown) {
    const parsedParams = parseWithSchema(rosterImportJobParamsSchema, params)

    return rosterImportJobDetailSchema.parse(
      await this.rosterImportsService.applyRosterImportJob(
        auth,
        parsedParams.classroomId,
        parsedParams.jobId,
      ),
    )
  }
}
