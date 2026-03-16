import { Module } from "@nestjs/common"

import { InfrastructureModule } from "../../infrastructure/infrastructure.module.js"
import { AcademicModule } from "../academic/academic.module.js"
import { DevicesModule } from "../devices/devices.module.js"
import { AttendanceHistoryController } from "./attendance-history.controller.js"
import { AttendanceHistoryService } from "./attendance-history.service.js"
import { AttendanceRealtimeService } from "./attendance-realtime.service.js"
import { BluetoothAttendanceController } from "./bluetooth-attendance.controller.js"
import { BluetoothAttendanceService } from "./bluetooth-attendance.service.js"
import { BluetoothTokenService } from "./bluetooth-token.service.js"
import { GpsValidatorService } from "./gps-validator.service.js"
import { LocationAnchorService } from "./location-anchor.service.js"
import { QrAttendanceController } from "./qr-attendance.controller.js"
import { QrAttendanceService } from "./qr-attendance.service.js"
import { QrTokenService } from "./qr-token.service.js"
import { StudentAttendanceHistoryController } from "./student-attendance-history.controller.js"

@Module({
  imports: [InfrastructureModule, AcademicModule, DevicesModule],
  controllers: [
    AttendanceHistoryController,
    StudentAttendanceHistoryController,
    QrAttendanceController,
    BluetoothAttendanceController,
  ],
  providers: [
    AttendanceHistoryService,
    AttendanceRealtimeService,
    BluetoothAttendanceService,
    BluetoothTokenService,
    GpsValidatorService,
    LocationAnchorService,
    QrAttendanceService,
    QrTokenService,
  ],
  exports: [
    AttendanceHistoryService,
    AttendanceRealtimeService,
    BluetoothTokenService,
    GpsValidatorService,
    LocationAnchorService,
    QrTokenService,
  ],
})
export class AttendanceModule {}
