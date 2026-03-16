import { Controller, Get, Inject, Res } from "@nestjs/common"

import { HealthService } from "./health.service.js"

type ReplyWithStatusCode = {
  code(statusCode: number): unknown
}

@Controller("health")
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Get()
  getHealth() {
    return this.healthService.getLiveness()
  }

  @Get("ready")
  async getReadiness(@Res({ passthrough: true }) reply: ReplyWithStatusCode) {
    const readiness = await this.healthService.getReadiness()

    if (readiness.status !== "ready") {
      reply.code(503)
    }

    return readiness
  }

  @Get("queues")
  async getQueueHealth() {
    return this.healthService.getQueueHealth()
  }
}
