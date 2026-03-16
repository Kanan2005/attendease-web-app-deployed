import { Module } from "@nestjs/common"

import { DatabaseModule } from "./database/database.module.js"
import { HealthController } from "./health/health.controller.js"
import { HealthService } from "./health/health.service.js"
import { InfrastructureModule } from "./infrastructure/infrastructure.module.js"
import { AcademicModule } from "./modules/academic/academic.module.js"
import { AdminModule } from "./modules/admin/admin.module.js"
import { AnalyticsModule } from "./modules/analytics/analytics.module.js"
import { AttendanceModule } from "./modules/attendance/attendance.module.js"
import { AuthModule } from "./modules/auth/auth.module.js"
import { AutomationModule } from "./modules/automation/automation.module.js"
import { DevicesModule } from "./modules/devices/devices.module.js"
import { ExportsModule } from "./modules/exports/exports.module.js"
import { ReportsModule } from "./modules/reports/reports.module.js"

@Module({
  imports: [
    InfrastructureModule,
    DatabaseModule,
    AcademicModule,
    AnalyticsModule,
    AutomationModule,
    AttendanceModule,
    DevicesModule,
    AuthModule,
    AdminModule,
    ExportsModule,
    ReportsModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
