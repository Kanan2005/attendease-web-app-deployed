import { type ExecutionContext, createParamDecorator } from "@nestjs/common"

import type { TrustedDeviceRequestContext } from "./devices.types.js"

export const CurrentTrustedDevice = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TrustedDeviceRequestContext => {
    const request = context.switchToHttp().getRequest<{
      trustedDevice?: TrustedDeviceRequestContext
    }>()

    if (!request.trustedDevice) {
      throw new Error("Trusted device request context is missing.")
    }

    return request.trustedDevice
  },
)
