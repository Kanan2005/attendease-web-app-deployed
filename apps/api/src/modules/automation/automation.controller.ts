import {
  createEmailAutomationRuleRequestSchema,
  emailAutomationRuleListQuerySchema,
  emailAutomationRuleParamsSchema,
  emailAutomationRuleResponseSchema,
  emailAutomationRulesResponseSchema,
  emailDispatchRunListQuerySchema,
  emailDispatchRunsResponseSchema,
  emailLogListQuerySchema,
  emailLogsResponseSchema,
  lowAttendanceEmailPreviewRequestSchema,
  lowAttendanceEmailPreviewResponseSchema,
  manualLowAttendanceEmailSendRequestSchema,
  manualLowAttendanceEmailSendResponseSchema,
  updateEmailAutomationRuleRequestSchema,
} from "@attendease/contracts"
import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common"

import { FeatureFlagsService } from "../../infrastructure/feature-flags.service.js"
import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { AutomationService } from "./automation.service.js"

@Controller("automation/email")
@UseGuards(AuthGuard, RolesGuard)
@Roles("TEACHER", "ADMIN")
export class AutomationController {
  constructor(
    @Inject(AutomationService) private readonly automationService: AutomationService,
    @Inject(FeatureFlagsService) private readonly featureFlags: FeatureFlagsService,
  ) {}

  @Get("rules")
  async listRules(@CurrentAuth() auth: AuthRequestContext, @Query() query: unknown) {
    this.featureFlags.assertEmailAutomationEnabled()

    return emailAutomationRulesResponseSchema.parse(
      await this.automationService.listRules(
        auth,
        parseWithSchema(emailAutomationRuleListQuerySchema, query),
      ),
    )
  }

  @Post("rules")
  async createRule(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    this.featureFlags.assertEmailAutomationEnabled()

    return emailAutomationRuleResponseSchema.parse(
      await this.automationService.createRule(
        auth,
        parseWithSchema(createEmailAutomationRuleRequestSchema, body),
      ),
    )
  }

  @Patch("rules/:ruleId")
  async updateRule(
    @CurrentAuth() auth: AuthRequestContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ) {
    this.featureFlags.assertEmailAutomationEnabled()

    return emailAutomationRuleResponseSchema.parse(
      await this.automationService.updateRule(
        auth,
        parseWithSchema(emailAutomationRuleParamsSchema, params),
        parseWithSchema(updateEmailAutomationRuleRequestSchema, body),
      ),
    )
  }

  @Post("preview")
  async preview(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    this.featureFlags.assertEmailAutomationEnabled()

    return lowAttendanceEmailPreviewResponseSchema.parse(
      await this.automationService.previewManualEmail(
        auth,
        parseWithSchema(lowAttendanceEmailPreviewRequestSchema, body),
      ),
    )
  }

  @Post("send-manual")
  async sendManual(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    this.featureFlags.assertEmailAutomationEnabled()

    return manualLowAttendanceEmailSendResponseSchema.parse(
      await this.automationService.queueManualEmailSend(
        auth,
        parseWithSchema(manualLowAttendanceEmailSendRequestSchema, body),
      ),
    )
  }

  @Get("runs")
  async listRuns(@CurrentAuth() auth: AuthRequestContext, @Query() query: unknown) {
    this.featureFlags.assertEmailAutomationEnabled()

    return emailDispatchRunsResponseSchema.parse(
      await this.automationService.listDispatchRuns(
        auth,
        parseWithSchema(emailDispatchRunListQuerySchema, query),
      ),
    )
  }

  @Get("logs")
  async listLogs(@CurrentAuth() auth: AuthRequestContext, @Query() query: unknown) {
    this.featureFlags.assertEmailAutomationEnabled()

    return emailLogsResponseSchema.parse(
      await this.automationService.listEmailLogs(
        auth,
        parseWithSchema(emailLogListQuerySchema, query),
      ),
    )
  }
}
