import type { AppRole } from "@attendease/contracts"
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"

import type { AuthRequestContext } from "./auth.types.js"
import { ROLES_METADATA_KEY } from "./roles.decorator.js"

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<AppRole[]>(ROLES_METADATA_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? []

    if (requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest<{ auth?: AuthRequestContext }>()

    if (!request.auth) {
      throw new ForbiddenException("Authentication context is missing.")
    }

    if (!requiredRoles.includes(request.auth.activeRole)) {
      throw new ForbiddenException("The active role cannot access this resource.")
    }

    return true
  }
}
