import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  Inject,
  Injectable,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"

import { RATE_LIMIT_POLICY_KEY, type RateLimitPolicyName } from "./rate-limit.decorator.js"
import { RateLimitService } from "./rate-limit.service.js"

type RequestLike = {
  ip?: string
  headers?: Record<string, string | string[] | undefined>
  auth?: {
    userId: string
  }
  trustedDevice?: {
    device: {
      id: string
    }
  }
}

type ReplyLike = {
  header?: (name: string, value: string | number) => void
  setHeader?: (name: string, value: string) => void
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(RateLimitService) private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.getAllAndOverride<RateLimitPolicyName | undefined>(
      RATE_LIMIT_POLICY_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (!policy) {
      return true
    }

    const request = context.switchToHttp().getRequest<RequestLike>()
    const reply = context.switchToHttp().getResponse<ReplyLike>()
    const decision = await this.rateLimitService.enforce(policy, request)

    this.setHeader(reply, "retry-after", String(decision.retryAfterSeconds))
    this.setHeader(reply, "x-ratelimit-limit", String(decision.limit))
    this.setHeader(reply, "x-ratelimit-remaining", String(decision.remaining))

    if (!decision.allowed) {
      throw new HttpException("Too many requests. Please try again shortly.", 429)
    }

    return true
  }

  private setHeader(reply: ReplyLike, name: string, value: string) {
    if (typeof reply.header === "function") {
      reply.header(name, value)
      return
    }

    reply.setHeader?.(name, value)
  }
}
