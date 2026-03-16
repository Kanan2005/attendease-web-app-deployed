import {
  adminStudentManagementDetailSchema,
  adminStudentManagementSearchQuerySchema,
  adminStudentManagementSummariesResponseSchema,
  adminUpdateStudentStatusRequestSchema,
  adminUpdateStudentStatusResponseSchema,
} from "@attendease/contracts"
import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { AdminDeviceSupportService } from "./admin-device-support.service.js"

@Controller("admin/students")
@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminStudentsController {
  constructor(
    @Inject(AdminDeviceSupportService)
    private readonly adminDeviceSupportService: AdminDeviceSupportService,
  ) {}

  @Get()
  async listStudents(@Query() query: Record<string, string | undefined>) {
    return adminStudentManagementSummariesResponseSchema.parse(
      await this.adminDeviceSupportService.listStudentManagement(
        parseWithSchema(adminStudentManagementSearchQuerySchema, query),
      ),
    )
  }

  @Get(":studentId")
  async getStudent(@Param("studentId") studentId: string) {
    return adminStudentManagementDetailSchema.parse(
      await this.adminDeviceSupportService.getStudentManagementDetail(studentId),
    )
  }

  @Post(":studentId/status")
  async updateStudentStatus(
    @CurrentAuth() auth: AuthRequestContext,
    @Param("studentId") studentId: string,
    @Body() body: unknown,
  ) {
    return adminUpdateStudentStatusResponseSchema.parse(
      await this.adminDeviceSupportService.updateStudentStatus(
        auth,
        studentId,
        parseWithSchema(adminUpdateStudentStatusRequestSchema, body),
      ),
    )
  }
}
