import { Global, Module } from "@nestjs/common"

import { InfrastructureModule } from "../../infrastructure/infrastructure.module.js"
import { AcademicModule } from "../academic/academic.module.js"
import { DevicesModule } from "../devices/devices.module.js"
import { AuthController } from "./auth.controller.js"
import { AuthGuard } from "./auth.guard.js"
import { AuthService } from "./auth.service.js"
import { DeviceBindingService } from "./device-binding.service.js"
import { GoogleOidcService } from "./google-oidc.service.js"
import { RolesGuard } from "./roles.guard.js"

@Global()
@Module({
  imports: [InfrastructureModule, AcademicModule, DevicesModule],
  controllers: [AuthController],
  providers: [AuthService, GoogleOidcService, DeviceBindingService, AuthGuard, RolesGuard],
  exports: [AuthService, AuthGuard, RolesGuard, DeviceBindingService],
})
export class AuthModule {}
