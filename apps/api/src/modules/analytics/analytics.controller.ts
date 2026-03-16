import {
  analyticsComparisonsResponseSchema,
  analyticsDistributionResponseSchema,
  analyticsFiltersSchema,
  analyticsModeUsageResponseSchema,
  analyticsSessionDrilldownResponseSchema,
  analyticsStudentTimelineParamsSchema,
  analyticsStudentTimelineResponseSchema,
  analyticsTrendResponseSchema,
  attendanceSessionParamsSchema,
} from "@attendease/contracts"
import { Controller, Get, Inject, Param, Query, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { AnalyticsService } from "./analytics.service.js"

@Controller("analytics")
@UseGuards(AuthGuard, RolesGuard)
@Roles("TEACHER", "ADMIN")
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analyticsService: AnalyticsService) {}

  @Get("trends")
  async getTrends(@CurrentAuth() auth: AuthRequestContext, @Query() query: unknown) {
    return analyticsTrendResponseSchema.parse(
      await this.analyticsService.getTrendAnalytics(
        auth,
        parseWithSchema(analyticsFiltersSchema, query),
      ),
    )
  }

  @Get("distribution")
  async getDistribution(@CurrentAuth() auth: AuthRequestContext, @Query() query: unknown) {
    return analyticsDistributionResponseSchema.parse(
      await this.analyticsService.getDistributionAnalytics(
        auth,
        parseWithSchema(analyticsFiltersSchema, query),
      ),
    )
  }

  @Get("comparisons")
  async getComparisons(@CurrentAuth() auth: AuthRequestContext, @Query() query: unknown) {
    return analyticsComparisonsResponseSchema.parse(
      await this.analyticsService.getComparisonsAnalytics(
        auth,
        parseWithSchema(analyticsFiltersSchema, query),
      ),
    )
  }

  @Get("modes")
  async getModes(@CurrentAuth() auth: AuthRequestContext, @Query() query: unknown) {
    return analyticsModeUsageResponseSchema.parse(
      await this.analyticsService.getModeUsageAnalytics(
        auth,
        parseWithSchema(analyticsFiltersSchema, query),
      ),
    )
  }

  @Get("students/:studentId/timeline")
  async getStudentTimeline(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Query() query: unknown,
  ) {
    return analyticsStudentTimelineResponseSchema.parse(
      await this.analyticsService.getStudentTimeline(
        auth,
        parseWithSchema(analyticsStudentTimelineParamsSchema, params),
        parseWithSchema(analyticsFiltersSchema, query),
      ),
    )
  }

  @Get("sessions/:sessionId/detail")
  async getSessionDrilldown(@CurrentAuth() auth: AuthRequestContext, @Param() params: unknown) {
    return analyticsSessionDrilldownResponseSchema.parse(
      await this.analyticsService.getSessionDrilldown(
        auth,
        parseWithSchema(attendanceSessionParamsSchema, params),
      ),
    )
  }
}
