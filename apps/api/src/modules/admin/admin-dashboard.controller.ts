import { adminDashboardStatsSchema } from "@attendease/contracts"
import { Controller, Get, Inject, Logger, UseGuards } from "@nestjs/common"

import { AuthGuard } from "../auth/auth.guard.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { AdminDashboardService } from "./admin-dashboard.service.js"

@Controller("admin/dashboard")
@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminDashboardController {
  private readonly logger = new Logger(AdminDashboardController.name)

  constructor(
    @Inject(AdminDashboardService)
    private readonly adminDashboardService: AdminDashboardService,
  ) {}

  @Get("stats")
  async getStats() {
    try {
      const raw = await this.adminDashboardService.getDashboardStats()
      return adminDashboardStatsSchema.parse(raw)
    } catch (error) {
      this.logger.error("Failed to get dashboard stats", error)
      throw error
    }
  }
}
