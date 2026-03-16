import {
  adminArchiveClassroomRequestSchema,
  adminClassroomGovernanceDetailSchema,
  adminClassroomGovernanceResponseSchema,
  adminClassroomGovernanceSearchQuerySchema,
} from "@attendease/contracts"
import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { AdminAcademicGovernanceService } from "./admin-classroom-governance.service.js"

@Controller("admin/classrooms")
@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminClassroomsController {
  constructor(
    @Inject(AdminAcademicGovernanceService)
    private readonly adminAcademicGovernanceService: AdminAcademicGovernanceService,
  ) {}

  @Get()
  async listClassrooms(
    @CurrentAuth() auth: AuthRequestContext,
    @Query() query: Record<string, string | undefined>,
  ) {
    return adminClassroomGovernanceResponseSchema.parse(
      await this.adminAcademicGovernanceService.listClassroomGovernance(
        auth,
        parseWithSchema(adminClassroomGovernanceSearchQuerySchema, query),
      ),
    )
  }

  @Get(":classroomId")
  async getClassroom(
    @CurrentAuth() auth: AuthRequestContext,
    @Param("classroomId") classroomId: string,
  ) {
    return adminClassroomGovernanceDetailSchema.parse(
      await this.adminAcademicGovernanceService.getClassroomGovernanceDetail(auth, classroomId),
    )
  }

  @Post(":classroomId/archive")
  async archiveClassroom(
    @CurrentAuth() auth: AuthRequestContext,
    @Param("classroomId") classroomId: string,
    @Body() body: unknown,
  ) {
    return adminClassroomGovernanceDetailSchema.parse(
      await this.adminAcademicGovernanceService.archiveClassroom(
        auth,
        classroomId,
        parseWithSchema(adminArchiveClassroomRequestSchema, body),
      ),
    )
  }
}
