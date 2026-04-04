import { Module } from "@nestjs/common"

import { AcademicModule } from "../academic/academic.module.js"
import { DevicesModule } from "../devices/devices.module.js"
import { AdminAcademicGovernanceService } from "./admin-classroom-governance.service.js"
import { AdminClassroomsController } from "./admin-classrooms.controller.js"
import { AdminDashboardController } from "./admin-dashboard.controller.js"
import { AdminDashboardService } from "./admin-dashboard.service.js"
import { AdminDeviceSupportController } from "./admin-device-support.controller.js"
import { AdminDeviceSupportService } from "./admin-device-support.service.js"
import { AdminStudentsController } from "./admin-students.controller.js"
import { AdminTeachersController } from "./admin-teachers.controller.js"
import { AdminTeachersService } from "./admin-teachers.service.js"

@Module({
  imports: [DevicesModule, AcademicModule],
  controllers: [
    AdminDashboardController,
    AdminDeviceSupportController,
    AdminStudentsController,
    AdminTeachersController,
    AdminClassroomsController,
  ],
  providers: [
    AdminDashboardService,
    AdminDeviceSupportService,
    AdminTeachersService,
    AdminAcademicGovernanceService,
  ],
  exports: [AdminDeviceSupportService, AdminAcademicGovernanceService],
})
export class AdminModule {}
