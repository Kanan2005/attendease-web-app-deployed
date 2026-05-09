import { Module } from "@nestjs/common"

import { AcademicModule } from "../academic/academic.module.js"
import { DevicesModule } from "../devices/devices.module.js"
import { ExportsModule } from "../exports/exports.module.js"
import { AdminAcademicGovernanceService } from "./admin-classroom-governance.service.js"
import { AdminClassroomsController } from "./admin-classrooms.controller.js"
import { AdminCommunicationController } from "./admin-communication.controller.js"
import { AdminCommunicationService } from "./admin-communication.service.js"
import { AdminDashboardController } from "./admin-dashboard.controller.js"
import { AdminDashboardService } from "./admin-dashboard.service.js"
import { AdminDeviceSupportController } from "./admin-device-support.controller.js"
import { AdminDeviceSupportService } from "./admin-device-support.service.js"
import { AdminRecordsController } from "./admin-records.controller.js"
import { AdminRecordsService } from "./admin-records.service.js"
import { AdminReportsController } from "./admin-reports.controller.js"
import { AdminReportsService } from "./admin-reports.service.js"
import { AdminSettingsController } from "./admin-settings.controller.js"
import { AdminSettingsService } from "./admin-settings.service.js"
import { AdminStudentsController } from "./admin-students.controller.js"
import { AdminTeachersController } from "./admin-teachers.controller.js"
import { AdminTeachersService } from "./admin-teachers.service.js"
import { AdminUsersController } from "./admin-users.controller.js"
import { AdminUsersService } from "./admin-users.service.js"

@Module({
  imports: [DevicesModule, AcademicModule, ExportsModule],
  controllers: [
    AdminDashboardController,
    AdminDeviceSupportController,
    AdminStudentsController,
    AdminTeachersController,
    AdminClassroomsController,
    AdminRecordsController,
    AdminUsersController,
    AdminCommunicationController,
    AdminReportsController,
    AdminSettingsController,
  ],
  providers: [
    AdminDashboardService,
    AdminDeviceSupportService,
    AdminTeachersService,
    AdminAcademicGovernanceService,
    AdminRecordsService,
    AdminUsersService,
    AdminCommunicationService,
    AdminReportsService,
    AdminSettingsService,
  ],
  exports: [AdminDeviceSupportService, AdminAcademicGovernanceService],
})
export class AdminModule {}
