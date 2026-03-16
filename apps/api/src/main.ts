import "reflect-metadata"

import { resolveApiCorsAllowedOrigins } from "@attendease/config"
import { NestFactory } from "@nestjs/core"
import { FastifyAdapter } from "@nestjs/platform-fastify"

import { AppModule } from "./app.module.js"
import { API_ENV } from "./infrastructure/api-env.js"
import { ApiLoggerService } from "./infrastructure/api-logger.service.js"

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    new FastifyAdapter({
      logger: false,
      disableRequestLogging: true,
    }),
  )
  const env = app.get(API_ENV)
  const logger = app.get(ApiLoggerService)
  const allowedOrigins = resolveApiCorsAllowedOrigins(process.env)

  app.useLogger(logger)
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "authorization",
      "content-type",
      "x-attendease-device-install-id",
      "x-attendease-device-platform",
      "x-attendease-device-public-key",
      "x-attendease-device-app-version",
      "x-attendease-device-model",
      "x-attendease-device-os-version",
    ],
  })

  await app.listen(env.API_PORT, "0.0.0.0")
}

void bootstrap()
