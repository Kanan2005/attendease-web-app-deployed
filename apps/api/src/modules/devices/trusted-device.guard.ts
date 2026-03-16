import { trustedDeviceInstallIdHeaderName } from "@attendease/auth"
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common"

import type { AuthRequestContext } from "../auth/auth.types.js"
import { DevicesService } from "./devices.service.js"
import type { TrustedDeviceRequestContext } from "./devices.types.js"

@Injectable()
export class TrustedDeviceGuard implements CanActivate {
  constructor(@Inject(DevicesService) private readonly devicesService: DevicesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>
      auth?: AuthRequestContext
      trustedDevice?: TrustedDeviceRequestContext
    }>()

    if (!request.auth) {
      throw new ForbiddenException("Authentication context is missing.")
    }

    const readyState = await this.devicesService.getAttendanceReadyState(
      request.auth,
      this.extractInstallId(request.headers?.[trustedDeviceInstallIdHeaderName]),
    )

    request.trustedDevice = {
      device: readyState.device,
      binding: readyState.binding,
      deviceTrust: readyState.deviceTrust,
    }

    return true
  }

  private extractInstallId(headerValue: string | string[] | undefined): string | null {
    const normalizedHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue

    return normalizedHeader?.trim() || null
  }
}
