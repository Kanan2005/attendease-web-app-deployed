import { Module } from "@nestjs/common"

import { AcademicModule } from "../academic/academic.module.js"
import { DevicesModule } from "../devices/devices.module.js"
import { AdminAcademicGovernanceService } from "./admin-classroom-governance.service.js"
import { AdminClassroomsController } from "./admin-classrooms.controller.js"
import { AdminDeviceSupportController } from "./admin-device-support.controller.js"
import { AdminDeviceSupportService } from "./admin-device-support.service.js"
import { AdminStudentsController } from "./admin-students.controller.js"

@Module({
  imports: [DevicesModule, AcademicModule],
  controllers: [AdminDeviceSupportController, AdminStudentsController, AdminClassroomsController],
  providers: [AdminDeviceSupportService, AdminAcademicGovernanceService],
  exports: [AdminDeviceSupportService, AdminAcademicGovernanceService],
})
export class AdminModule {}
