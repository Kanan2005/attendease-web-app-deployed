import { Module } from "@nestjs/common"

import { AttendanceModule } from "../attendance/attendance.module.js"
import { ReportsModule } from "../reports/reports.module.js"
import { AnalyticsController } from "./analytics.controller.js"
import { AnalyticsService } from "./analytics.service.js"

@Module({
  imports: [AttendanceModule, ReportsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
