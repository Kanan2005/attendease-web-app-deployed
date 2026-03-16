import {
  attendanceSessionDetailSchema,
  attendanceSessionHistoryListQuerySchema,
  attendanceSessionHistoryResponseSchema,
  attendanceSessionParamsSchema,
  attendanceSessionStudentsResponseSchema,
  liveAttendanceSessionDiscoveryQuerySchema,
  liveAttendanceSessionsResponseSchema,
  updateAttendanceSessionAttendanceRequestSchema,
  updateAttendanceSessionAttendanceResponseSchema,
} from "@attendease/contracts"
import { Body, Controller, Get, Inject, Param, Patch, Query, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { AttendanceHistoryService } from "./attendance-history.service.js"

@Controller("sessions")
@UseGuards(AuthGuard, RolesGuard)
@Roles("TEACHER", "ADMIN")
export class AttendanceHistoryController {
  constructor(
    @Inject(AttendanceHistoryService)
    private readonly attendanceHistoryService: AttendanceHistoryService,
  ) {}

  @Get()
  async listSessions(@CurrentAuth() auth: AuthRequestContext, @Query() query: unknown) {
    return attendanceSessionHistoryResponseSchema.parse(
      await this.attendanceHistoryService.listSessions(
        auth,
        parseWithSchema(attendanceSessionHistoryListQuerySchema, query),
      ),
    )
  }

  @Get("live")
  @Roles("TEACHER", "ADMIN", "STUDENT")
  async listLiveSessions(@CurrentAuth() auth: AuthRequestContext, @Query() query: unknown) {
    return liveAttendanceSessionsResponseSchema.parse(
      await this.attendanceHistoryService.listLiveSessions(
        auth,
        parseWithSchema(liveAttendanceSessionDiscoveryQuerySchema, query),
      ),
    )
  }

  @Get(":sessionId/students")
  async listSessionStudents(@CurrentAuth() auth: AuthRequestContext, @Param() params: unknown) {
    return attendanceSessionStudentsResponseSchema.parse(
      await this.attendanceHistoryService.listSessionStudents(
        auth,
        parseWithSchema(attendanceSessionParamsSchema, params),
      ),
    )
  }

  @Get(":sessionId")
  async getSessionDetail(@CurrentAuth() auth: AuthRequestContext, @Param() params: unknown) {
    return attendanceSessionDetailSchema.parse(
      await this.attendanceHistoryService.getSessionDetail(
        auth,
        parseWithSchema(attendanceSessionParamsSchema, params),
      ),
    )
  }

  @Patch(":sessionId/attendance")
  async updateSessionAttendance(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    return updateAttendanceSessionAttendanceResponseSchema.parse(
      await this.attendanceHistoryService.updateSessionAttendance(
        auth,
        parseWithSchema(attendanceSessionParamsSchema, params),
        parseWithSchema(updateAttendanceSessionAttendanceRequestSchema, body),
      ),
    )
  }
}
