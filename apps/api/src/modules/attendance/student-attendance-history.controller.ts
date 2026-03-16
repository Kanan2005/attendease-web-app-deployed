import {
  studentAttendanceHistoryListQuerySchema,
  studentAttendanceHistoryResponseSchema,
} from "@attendease/contracts"
import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { AttendanceHistoryService } from "./attendance-history.service.js"

@Controller("students/me/history")
@UseGuards(AuthGuard, RolesGuard)
@Roles("STUDENT")
export class StudentAttendanceHistoryController {
  constructor(
    @Inject(AttendanceHistoryService)
    private readonly attendanceHistoryService: AttendanceHistoryService,
  ) {}

  @Get()
  async listStudentHistory(@CurrentAuth() auth: AuthRequestContext, @Query() query: unknown) {
    return studentAttendanceHistoryResponseSchema.parse(
      await this.attendanceHistoryService.listStudentHistory(
        auth,
        parseWithSchema(studentAttendanceHistoryListQuerySchema, query),
      ),
    )
  }
}
