import { Module } from "@nestjs/common"

import { AcademicModule } from "../academic/academic.module.js"
import { EmailReminderService } from "./email-reminder.service.js"
import { ReportsController } from "./reports.controller.js"
import { ReportsService } from "./reports.service.js"
import { StudentReportsController } from "./student-reports.controller.js"

@Module({
  imports: [AcademicModule],
  controllers: [ReportsController, StudentReportsController],
  providers: [ReportsService, EmailReminderService],
  exports: [ReportsService],
})
export class ReportsModule {}
