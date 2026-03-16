import {
  adminApproveReplacementDeviceRequestSchema,
  adminApproveReplacementDeviceResponseSchema,
  adminDelinkStudentDevicesRequestSchema,
  adminDelinkStudentDevicesResponseSchema,
  adminDeviceSupportDetailSchema,
  adminDeviceSupportSearchQuerySchema,
  adminDeviceSupportSummariesResponseSchema,
  adminRevokeDeviceBindingRequestSchema,
  authOperationSuccessSchema,
} from "@attendease/contracts"
import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from "@nestjs/common"

import { parseWithSchema } from "../../shared/zod.js"
import { AuthGuard } from "../auth/auth.guard.js"
import type { AuthRequestContext } from "../auth/auth.types.js"
import { CurrentAuth } from "../auth/current-auth.decorator.js"
import { Roles } from "../auth/roles.decorator.js"
import { RolesGuard } from "../auth/roles.guard.js"
import { AdminDeviceSupportService } from "./admin-device-support.service.js"

@Controller("admin/device-bindings")
@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminDeviceSupportController {
  constructor(
    @Inject(AdminDeviceSupportService)
    private readonly adminDeviceSupportService: AdminDeviceSupportService,
  ) {}

  @Get()
  async listDeviceSupport(@Query() query: Record<string, string | undefined>) {
    return adminDeviceSupportSummariesResponseSchema.parse(
      await this.adminDeviceSupportService.listStudentDeviceSupport(
        parseWithSchema(adminDeviceSupportSearchQuerySchema, query),
      ),
    )
  }

  @Get(":studentId")
  async getStudentDeviceSupport(@Param("studentId") studentId: string) {
    return adminDeviceSupportDetailSchema.parse(
      await this.adminDeviceSupportService.getStudentDeviceSupport(studentId),
    )
  }

  @Post(":bindingId/revoke")
  async revokeDeviceBinding(
    @CurrentAuth() auth: AuthRequestContext,
    @Param("bindingId") bindingId: string,
    @Body() body: unknown,
  ) {
    await this.adminDeviceSupportService.revokeBinding(
      auth,
      bindingId,
      parseWithSchema(adminRevokeDeviceBindingRequestSchema, body),
    )

    return authOperationSuccessSchema.parse({
      success: true,
    })
  }

  @Post(":studentId/delink")
  async delinkStudentDevices(
    @CurrentAuth() auth: AuthRequestContext,
    @Param("studentId") studentId: string,
    @Body() body: unknown,
  ) {
    return adminDelinkStudentDevicesResponseSchema.parse(
      await this.adminDeviceSupportService.delinkStudentDevices(
        auth,
        studentId,
        parseWithSchema(adminDelinkStudentDevicesRequestSchema, body),
      ),
    )
  }

  @Post(":studentId/approve-new-device")
  async approveReplacementDevice(
    @CurrentAuth() auth: AuthRequestContext,
    @Param("studentId") studentId: string,
    @Body() body: unknown,
  ) {
    return adminApproveReplacementDeviceResponseSchema.parse(
      await this.adminDeviceSupportService.approveReplacementDevice(
        auth,
        studentId,
        parseWithSchema(adminApproveReplacementDeviceRequestSchema, body),
      ),
    )
  }
}
