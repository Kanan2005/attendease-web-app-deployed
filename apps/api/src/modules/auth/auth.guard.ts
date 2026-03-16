import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"

import { ApiRequestContextService } from "../../infrastructure/request-context.service.js"
import { AuthService } from "./auth.service.js"
import type { AuthRequestContext } from "./auth.types.js"

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(ApiRequestContextService)
    private readonly requestContext: ApiRequestContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>
      auth?: AuthRequestContext
    }>()
    const authorizationHeader = request.headers?.authorization
    const token = this.extractBearerToken(authorizationHeader)

    if (!token) {
      throw new UnauthorizedException("Missing bearer token.")
    }

    request.auth = await this.authService.validateAccessToken(token)
    this.requestContext.update({
      userId: request.auth.userId,
      role: request.auth.activeRole,
    })

    return true
  }

  private extractBearerToken(headerValue: string | string[] | undefined): string | null {
    const normalizedHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue

    if (!normalizedHeader?.startsWith("Bearer ")) {
      return null
    }

    return normalizedHeader.slice("Bearer ".length).trim() || null
  }
}
