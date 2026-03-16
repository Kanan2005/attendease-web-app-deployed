import { Module } from "@nestjs/common"

import { ReportsModule } from "../reports/reports.module.js"
import { ExportStorageService } from "./export-storage.service.js"
import { ExportsController } from "./exports.controller.js"
import { ExportsService } from "./exports.service.js"

@Module({
  imports: [ReportsModule],
  controllers: [ExportsController],
  providers: [ExportStorageService, ExportsService],
  exports: [ExportsService],
})
export class ExportsModule {}
