import { type ExecutionContext, createParamDecorator } from "@nestjs/common"

import type { AuthRequestContext } from "./auth.types.js"

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthRequestContext => {
    const request = context.switchToHttp().getRequest<{ auth?: AuthRequestContext }>()

    if (!request.auth) {
      throw new Error("Authenticated request context is missing.")
    }

    return request.auth
  },
)
