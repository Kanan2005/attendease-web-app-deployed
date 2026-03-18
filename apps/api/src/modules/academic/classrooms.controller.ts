import {
  classroomDetailSchema,
  classroomJoinCodeSummarySchema,
  classroomLectureParamsSchema,
  classroomListQuerySchema,
  classroomParamsSchema,
  classroomRosterListQuerySchema,
  classroomRosterMemberParamsSchema,
  classroomRosterMemberSummarySchema,
  classroomRosterResponseSchema,
  classroomScheduleSchema,
  classroomsResponseSchema,
  createClassroomRequestSchema,
  createClassroomRosterMemberRequestSchema,
  createLectureRequestSchema,
  createScheduleExceptionRequestSchema,
  createScheduleSlotRequestSchema,
  lectureListQuerySchema,
  lectureSummarySchema,
  lecturesResponseSchema,
  resetClassroomJoinCodeRequestSchema,
  saveAndNotifyScheduleRequestSchema,
  scheduleExceptionParamsSchema,
  scheduleExceptionSummarySchema,
  scheduleSlotParamsSchema,
  scheduleSlotSummarySchema,
  updateClassroomRequestSchema,
  updateClassroomRosterMemberRequestSchema,
  updateScheduleExceptionRequestSchema,
  updateScheduleSlotRequestSchema,
} from "@attendease/contracts"
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { ClassroomsService } from "./classrooms.service.js"
import { JoinCodesService } from "./join-codes.service.js"
import { LecturesService } from "./lectures.service.js"
import { RosterService } from "./roster.service.js"
import { SchedulingService } from "./scheduling.service.js"

@Controller("classrooms")
@UseGuards(AuthGuard, RolesGuard)
export class ClassroomsController {
  constructor(
    @Inject(ClassroomsService) private readonly classroomsService: ClassroomsService,
    @Inject(JoinCodesService) private readonly joinCodesService: JoinCodesService,
    @Inject(RosterService) private readonly rosterService: RosterService,
    @Inject(LecturesService) private readonly lecturesService: LecturesService,
    @Inject(SchedulingService) private readonly schedulingService: SchedulingService,
  ) {}

  @Get()
  @Roles("TEACHER", "ADMIN")
  async listClassrooms(@CurrentAuth() auth: AuthRequestContext, @Query() query: unknown) {
    return classroomsResponseSchema.parse(
      await this.classroomsService.listClassrooms(
        auth,
        parseWithSchema(classroomListQuerySchema, query),
      ),
    )
  }

  @Post()
  @Roles("TEACHER", "ADMIN")
  async createClassroom(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    return classroomDetailSchema.parse(
      await this.classroomsService.createClassroom(
        auth,
        parseWithSchema(createClassroomRequestSchema, body),
      ),
    )
  }

  @Get(":classroomId")
  @Roles("TEACHER", "ADMIN", "STUDENT")
  async getClassroom(@CurrentAuth() auth: AuthRequestContext, @Param() params: unknown) {
    return classroomDetailSchema.parse(
      await this.classroomsService.getClassroom(
        auth,
        parseWithSchema(classroomParamsSchema, params).classroomId,
      ),
    )
  }

  @Get(":classroomId/join-code")
  @Roles("TEACHER", "ADMIN")
  async getJoinCode(@CurrentAuth() auth: AuthRequestContext, @Param() params: unknown) {
    return classroomJoinCodeSummarySchema
      .nullable()
      .parse(
        await this.joinCodesService.getClassroomJoinCode(
          auth,
          parseWithSchema(classroomParamsSchema, params).classroomId,
        ),
      )
  }

  @Post(":classroomId/join-code/reset")
  @Roles("TEACHER", "ADMIN")
  async resetJoinCode(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    return classroomJoinCodeSummarySchema.parse(
      await this.joinCodesService.resetClassroomJoinCode(
        auth,
        parseWithSchema(classroomParamsSchema, params).classroomId,
        parseWithSchema(resetClassroomJoinCodeRequestSchema, body ?? {}),
      ),
    )
  }

  @Patch(":classroomId")
  @Roles("TEACHER", "ADMIN")
  async updateClassroom(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    return classroomDetailSchema.parse(
      await this.classroomsService.updateClassroom(
        auth,
        parseWithSchema(classroomParamsSchema, params).classroomId,
        parseWithSchema(updateClassroomRequestSchema, body),
      ),
    )
  }

  @Post(":classroomId/archive")
  @Roles("TEACHER", "ADMIN")
  async archiveClassroom(@CurrentAuth() auth: AuthRequestContext, @Param() params: unknown) {
    return classroomDetailSchema.parse(
      await this.classroomsService.archiveClassroom(
        auth,
        parseWithSchema(classroomParamsSchema, params).classroomId,
      ),
    )
  }

  @Get(":classroomId/schedule")
  @Roles("TEACHER", "ADMIN", "STUDENT")
  async getSchedule(@CurrentAuth() auth: AuthRequestContext, @Param() params: unknown) {
    return classroomScheduleSchema.parse(
      await this.schedulingService.getSchedule(
        auth,
        parseWithSchema(classroomParamsSchema, params).classroomId,
      ),
    )
  }

  @Post(":classroomId/schedule/weekly-slots")
  @Roles("TEACHER", "ADMIN")
  async createWeeklySlot(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    return scheduleSlotSummarySchema.parse(
      await this.schedulingService.createWeeklySlot(
        auth,
        parseWithSchema(classroomParamsSchema, params).classroomId,
        parseWithSchema(createScheduleSlotRequestSchema, body),
      ),
    )
  }

  @Patch(":classroomId/schedule/weekly-slots/:slotId")
  @Roles("TEACHER", "ADMIN")
  async updateWeeklySlot(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    const parsedParams = parseWithSchema(scheduleSlotParamsSchema, params)

    return scheduleSlotSummarySchema.parse(
      await this.schedulingService.updateWeeklySlot(
        auth,
        parsedParams.classroomId,
        parsedParams.slotId,
        parseWithSchema(updateScheduleSlotRequestSchema, body),
      ),
    )
  }

  @Post(":classroomId/schedule/exceptions")
  @Roles("TEACHER", "ADMIN")
  async createScheduleException(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    return scheduleExceptionSummarySchema.parse(
      await this.schedulingService.createScheduleException(
        auth,
        parseWithSchema(classroomParamsSchema, params).classroomId,
        parseWithSchema(createScheduleExceptionRequestSchema, body),
      ),
    )
  }

  @Patch(":classroomId/schedule/exceptions/:exceptionId")
  @Roles("TEACHER", "ADMIN")
  async updateScheduleException(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    const parsedParams = parseWithSchema(scheduleExceptionParamsSchema, params)

    return scheduleExceptionSummarySchema.parse(
      await this.schedulingService.updateScheduleException(
        auth,
        parsedParams.classroomId,
        parsedParams.exceptionId,
        parseWithSchema(updateScheduleExceptionRequestSchema, body),
      ),
    )
  }

  @Post(":classroomId/schedule/save-and-notify")
  @Roles("TEACHER", "ADMIN")
  async saveAndNotifySchedule(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    return classroomScheduleSchema.parse(
      await this.schedulingService.saveAndNotify(
        auth,
        parseWithSchema(classroomParamsSchema, params).classroomId,
        parseWithSchema(saveAndNotifyScheduleRequestSchema, body),
      ),
    )
  }

  @Get(":classroomId/lectures")
  @Roles("TEACHER", "ADMIN", "STUDENT")
  async listLectures(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Query() query: unknown,
  ) {
    return lecturesResponseSchema.parse(
      await this.lecturesService.listLectures(
        auth,
        parseWithSchema(classroomParamsSchema, params).classroomId,
        parseWithSchema(lectureListQuerySchema, query),
      ),
    )
  }

  @Get(":classroomId/students")
  @Roles("TEACHER", "ADMIN")
  async listRoster(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Query() query: unknown,
  ) {
    return classroomRosterResponseSchema.parse(
      await this.rosterService.listClassroomRoster(
        auth,
        parseWithSchema(classroomParamsSchema, params).classroomId,
        parseWithSchema(classroomRosterListQuerySchema, query),
      ),
    )
  }

  @Post(":classroomId/students")
  @Roles("TEACHER", "ADMIN")
  async addRosterMember(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    return classroomRosterMemberSummarySchema.parse(
      await this.rosterService.addClassroomRosterMember(
        auth,
        parseWithSchema(classroomParamsSchema, params).classroomId,
        parseWithSchema(createClassroomRosterMemberRequestSchema, body),
      ),
    )
  }

  @Patch(":classroomId/students/:enrollmentId")
  @Roles("TEACHER", "ADMIN")
  async updateRosterMember(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    const parsedParams = parseWithSchema(classroomRosterMemberParamsSchema, params)

    return classroomRosterMemberSummarySchema.parse(
      await this.rosterService.updateClassroomRosterMember(
        auth,
        parsedParams.classroomId,
        parsedParams.enrollmentId,
        parseWithSchema(updateClassroomRosterMemberRequestSchema, body),
      ),
    )
  }

  @Delete(":classroomId/students/:enrollmentId")
  @Roles("TEACHER", "ADMIN")
  async removeRosterMember(@CurrentAuth() auth: AuthRequestContext, @Param() params: unknown) {
    const parsedParams = parseWithSchema(classroomRosterMemberParamsSchema, params)

    return classroomRosterMemberSummarySchema.parse(
      await this.rosterService.removeClassroomRosterMember(
        auth,
        parsedParams.classroomId,
        parsedParams.enrollmentId,
      ),
    )
  }

  @Post(":classroomId/lectures")
  @Roles("TEACHER", "ADMIN")
  async createLecture(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    return lectureSummarySchema.parse(
      await this.lecturesService.createLecture(
        auth,
        parseWithSchema(classroomParamsSchema, params).classroomId,
        parseWithSchema(createLectureRequestSchema, body),
      ),
    )
  }

  @Delete(":classroomId/lectures/:lectureId")
  @Roles("TEACHER", "ADMIN")
  async deleteLecture(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
  ) {
    const parsed = parseWithSchema(classroomLectureParamsSchema, params)
    return this.lecturesService.deleteLecture(auth, parsed.classroomId, parsed.lectureId)
  }
}
