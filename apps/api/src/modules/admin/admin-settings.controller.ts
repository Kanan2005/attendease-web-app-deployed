import {
  adminSettingsAcademicAddItemRequestSchema,
  adminSettingsAcademicListSchema,
  adminSettingsAcademicRemoveItemRequestSchema,
  adminSettingsAcademicResponseSchema,
  adminSettingsAdminInviteRequestSchema,
  adminSettingsAdminInviteResponseSchema,
  adminSettingsAdminListResponseSchema,
  adminSettingsAdminRevokeRequestSchema,
  adminSettingsAdminRevokeResponseSchema,
  adminSettingsChangePasswordRequestSchema,
  adminSettingsChangePasswordResponseSchema,
  adminSettingsSystemResponseSchema,
  adminSettingsSystemUpdateRequestSchema,
} from "@attendease/contracts"
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { AdminSettingsService } from "./admin-settings.service.js"

@Controller("admin/settings")
@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminSettingsController {
  constructor(
    @Inject(AdminSettingsService)
    private readonly adminSettingsService: AdminSettingsService,
  ) {}

  @Get("academic")
  async getAcademic() {
    return adminSettingsAcademicResponseSchema.parse(await this.adminSettingsService.getAcademic())
  }

  @Get("academic/lists")
  async getAcademicLists() {
    return adminSettingsAcademicListSchema.parse(
      await this.adminSettingsService.getAcademicLists(),
    )
  }

  @Post("academic/lists/add")
  async addAcademicListItem(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    return adminSettingsAcademicListSchema.parse(
      await this.adminSettingsService.addAcademicListItem(
        auth,
        parseWithSchema(adminSettingsAcademicAddItemRequestSchema, body ?? {}),
      ),
    )
  }

  @Post("academic/lists/remove")
  async removeAcademicListItem(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    return adminSettingsAcademicListSchema.parse(
      await this.adminSettingsService.removeAcademicListItem(
        auth,
        parseWithSchema(adminSettingsAcademicRemoveItemRequestSchema, body ?? {}),
      ),
    )
  }

  @Get("system")
  async getSystem() {
    return adminSettingsSystemResponseSchema.parse(await this.adminSettingsService.getSystem())
  }

  @Patch("system")
  async updateSystem(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    return adminSettingsSystemResponseSchema.parse(
      await this.adminSettingsService.updateSystem(
        auth,
        parseWithSchema(adminSettingsSystemUpdateRequestSchema, body ?? {}),
      ),
    )
  }

  @Get("admins")
  async listAdmins(@CurrentAuth() auth: AuthRequestContext) {
    return adminSettingsAdminListResponseSchema.parse(
      await this.adminSettingsService.listAdmins(auth),
    )
  }

  @Post("admins/invite")
  async inviteAdmin(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    return adminSettingsAdminInviteResponseSchema.parse(
      await this.adminSettingsService.inviteAdmin(
        auth,
        parseWithSchema(adminSettingsAdminInviteRequestSchema, body ?? {}),
      ),
    )
  }

  @Delete("admins/:userId")
  async revokeAdmin(
    @CurrentAuth() auth: AuthRequestContext,
    @Param("userId") userId: string,
    @Body() body: unknown,
  ) {
    return adminSettingsAdminRevokeResponseSchema.parse(
      await this.adminSettingsService.revokeAdmin(
        auth,
        userId,
        parseWithSchema(adminSettingsAdminRevokeRequestSchema, body ?? {}),
      ),
    )
  }

  @Post("security/change-password")
  async changePassword(@CurrentAuth() auth: AuthRequestContext, @Body() body: unknown) {
    return adminSettingsChangePasswordResponseSchema.parse(
      await this.adminSettingsService.changeOwnPassword(
        auth,
        parseWithSchema(adminSettingsChangePasswordRequestSchema, body ?? {}),
      ),
    )
  }
}
