import {
  joinClassroomRequestSchema,
  studentClassroomListQuerySchema,
  studentClassroomMembershipSummarySchema,
  studentClassroomsResponseSchema,
} from "@attendease/contracts"
import { Body, Controller, Get, Inject, Post, Query, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { JoinCodesService } from "./join-codes.service.js"
import { RosterService } from "./roster.service.js"

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class StudentClassroomsController {
  constructor(
    @Inject(JoinCodesService) private readonly joinCodesService: JoinCodesService,
    @Inject(RosterService) private readonly rosterService: RosterService,
  ) {}

  @Get("students/me/classrooms")
  @Roles("STUDENT")
  async listMyClassrooms(@CurrentAuth() auth: AuthRequestContext, @Query() query: unknown) {
    return studentClassroomsResponseSchema.parse(
      await this.rosterService.listStudentClassrooms(
        auth.userId,
        parseWithSchema(studentClassroomListQuerySchema, query),
      ),
    )
  }

  @Post("classrooms/join")
  @Roles("STUDENT")
  async joinClassroom(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    return studentClassroomMembershipSummarySchema.parse(
      await this.joinCodesService.joinClassroom(
        auth,
        parseWithSchema(joinClassroomRequestSchema, body),
      ),
    )
  }
}
