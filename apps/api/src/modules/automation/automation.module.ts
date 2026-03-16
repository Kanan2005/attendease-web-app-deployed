import { Module } from "@nestjs/common"

import { ReportsModule } from "../reports/reports.module.js"
import { AutomationController } from "./automation.controller.js"
import { AutomationService } from "./automation.service.js"

@Module({
  imports: [ReportsModule],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
