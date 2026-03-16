import { Module } from "@nestjs/common"

import { AcademicController } from "./academic.controller.js"
import { AnnouncementsService } from "./announcements.service.js"
import { AssignmentsService } from "./assignments.service.js"
import { ClassroomCommunicationsController } from "./classroom-communications.controller.js"
import { ClassroomsController } from "./classrooms.controller.js"
import { ClassroomsService } from "./classrooms.service.js"
import { EnrollmentsService } from "./enrollments.service.js"
import { JoinCodesService } from "./join-codes.service.js"
import { LecturesService } from "./lectures.service.js"
import { RosterImportsService } from "./roster-imports.service.js"
import { RosterService } from "./roster.service.js"
import { SchedulingService } from "./scheduling.service.js"
import { SemestersController } from "./semesters.controller.js"
import { SemestersService } from "./semesters.service.js"
import { StudentClassroomsController } from "./student-classrooms.controller.js"

@Module({
  controllers: [
    AcademicController,
    ClassroomCommunicationsController,
    StudentClassroomsController,
    SemestersController,
    ClassroomsController,
  ],
  providers: [
    AssignmentsService,
    EnrollmentsService,
    SemestersService,
    ClassroomsService,
    JoinCodesService,
    RosterService,
    RosterImportsService,
    AnnouncementsService,
    SchedulingService,
    LecturesService,
  ],
  exports: [
    AssignmentsService,
    EnrollmentsService,
    SemestersService,
    ClassroomsService,
    JoinCodesService,
    RosterService,
    RosterImportsService,
    AnnouncementsService,
    SchedulingService,
    LecturesService,
  ],
})
export class AcademicModule {}
