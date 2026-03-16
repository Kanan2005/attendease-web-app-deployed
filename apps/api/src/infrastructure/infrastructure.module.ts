import { Global, type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common"
import { APP_FILTER } from "@nestjs/core"

import { API_ENV, createApiEnv } from "./api-env.js"
import { ApiExceptionFilter } from "./api-exception.filter.js"
import { ApiLoggerService } from "./api-logger.service.js"
import { ApiMonitoringService } from "./api-monitoring.service.js"
import { FeatureFlagsService } from "./feature-flags.service.js"
import { RateLimitGuard } from "./rate-limit.guard.js"
import { RateLimitService } from "./rate-limit.service.js"
import { RequestContextMiddleware } from "./request-context.middleware.js"
import { ApiRequestContextService } from "./request-context.service.js"

@Global()
@Module({
  providers: [
    {
      provide: API_ENV,
      useFactory: createApiEnv,
    },
    ApiRequestContextService,
    ApiLoggerService,
    ApiMonitoringService,
    FeatureFlagsService,
    RateLimitService,
    RateLimitGuard,
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
  ],
  exports: [
    API_ENV,
    ApiRequestContextService,
    ApiLoggerService,
    ApiMonitoringService,
    FeatureFlagsService,
    RateLimitService,
    RateLimitGuard,
  ],
})
export class InfrastructureModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("*")
  }
}
