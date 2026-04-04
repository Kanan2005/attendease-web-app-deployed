import {
  adminTeacherDetailSchema,
  adminTeacherListResponseSchema,
  adminTeacherSearchQuerySchema,
} from "@attendease/contracts"
import { Controller, Get, Inject, Param, Query, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { AdminTeachersService } from "./admin-teachers.service.js"

@Controller("admin/teachers")
@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminTeachersController {
  constructor(
    @Inject(AdminTeachersService)
    private readonly adminTeachersService: AdminTeachersService,
  ) {}

  @Get()
  async listTeachers(@Query() query: Record<string, string | undefined>) {
    return adminTeacherListResponseSchema.parse(
      await this.adminTeachersService.listTeachers(
        parseWithSchema(adminTeacherSearchQuerySchema, query),
      ),
    )
  }

  @Get(":teacherId")
  async getTeacher(@Param("teacherId") teacherId: string) {
    return adminTeacherDetailSchema.parse(
      await this.adminTeachersService.getTeacherDetail(teacherId),
    )
  }
}
