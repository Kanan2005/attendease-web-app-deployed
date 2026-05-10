import {
  adminActionAuditQuerySchema,
  adminActionAuditResponseSchema,
  adminSecurityAuditQuerySchema,
  adminSecurityAuditResponseSchema,
} from "@attendease/contracts"
import { Controller, Get, Inject, Logger, Query, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { AdminSecurityService } from "./admin-security.service.js"

@Controller("admin/security")
@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminSecurityController {
  private readonly logger = new Logger(AdminSecurityController.name)

  constructor(
    @Inject(AdminSecurityService)
    private readonly adminSecurityService: AdminSecurityService,
  ) {}

  @Get("events")
  async listSecurityEvents(@Query() query: unknown) {
    try {
      const parsed = parseWithSchema(adminSecurityAuditQuerySchema, query ?? {})
      const result = await this.adminSecurityService.listSecurityEvents(parsed)
      return adminSecurityAuditResponseSchema.parse(result)
    } catch (error) {
      this.logger.error("Failed to list security events", error)
      throw error
    }
  }

  @Get("actions")
  async listAdminActions(@Query() query: unknown) {
    try {
      const parsed = parseWithSchema(adminActionAuditQuerySchema, query ?? {})
      const result = await this.adminSecurityService.listAdminActions(parsed)
      return adminActionAuditResponseSchema.parse(result)
    } catch (error) {
      this.logger.error("Failed to list admin actions", error)
      throw error
    }
  }
}
