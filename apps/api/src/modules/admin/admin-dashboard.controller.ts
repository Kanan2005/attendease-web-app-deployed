import {
  adminDashboardBranchComparisonResponseSchema,
  adminDashboardLeaderboardQuerySchema,
  adminDashboardLeaderboardResponseSchema,
  adminDashboardSessionsGraphQuerySchema,
  adminDashboardSessionsGraphResponseSchema,
  adminDashboardStatsSchema,
} from "@attendease/contracts"
import { Controller, Get, Inject, Logger, Query, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
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

  @Get("sessions-graph")
  async getSessionsGraph(@Query() query: unknown) {
    return adminDashboardSessionsGraphResponseSchema.parse(
      await this.adminDashboardService.getSessionsGraph(
        parseWithSchema(adminDashboardSessionsGraphQuerySchema, query ?? {}),
      ),
    )
  }

  @Get("branch-comparison")
  async getBranchComparison() {
    return adminDashboardBranchComparisonResponseSchema.parse(
      await this.adminDashboardService.getBranchComparison(),
    )
  }

  @Get("course-leaderboard")
  async getLeaderboard(@Query() query: unknown) {
    return adminDashboardLeaderboardResponseSchema.parse(
      await this.adminDashboardService.getLeaderboard(
        parseWithSchema(adminDashboardLeaderboardQuerySchema, query ?? {}),
      ),
    )
  }
}
