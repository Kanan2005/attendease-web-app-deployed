import {
  adminCommunicationAudiencePreviewRequestSchema,
  adminCommunicationAudiencePreviewResponseSchema,
  adminCommunicationLogDispatchRequestSchema,
  adminCommunicationLogDispatchResponseSchema,
} from "@attendease/contracts"
import { Body, Controller, Inject, Post, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { AdminCommunicationService } from "./admin-communication.service.js"

@Controller("admin/communication")
@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminCommunicationController {
  constructor(
    @Inject(AdminCommunicationService)
    private readonly adminCommunicationService: AdminCommunicationService,
  ) {}

  @Post("audience-preview")
  async previewAudience(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    return adminCommunicationAudiencePreviewResponseSchema.parse(
      await this.adminCommunicationService.previewAudience(
        auth,
        parseWithSchema(adminCommunicationAudiencePreviewRequestSchema, body ?? {}),
      ),
    )
  }

  @Post("log-dispatch")
  async logDispatch(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    return adminCommunicationLogDispatchResponseSchema.parse(
      await this.adminCommunicationService.logDispatch(
        auth,
        parseWithSchema(adminCommunicationLogDispatchRequestSchema, body ?? {}),
      ),
    )
  }
}
