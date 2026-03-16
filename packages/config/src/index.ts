import { z } from "zod"

const envBooleanSchema = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value
  }

  if (typeof value === "number") {
    return value !== 0
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()

    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true
    }

    if (["false", "0", "no", "off", ""].includes(normalized)) {
      return false
    }
  }

  return value
}, z.boolean())

const optionalStringSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined
  }

  return value
}, z.string().min(1).optional())

const optionalUrlSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined
  }

  return value
}, z.string().url().optional())

const optionalEmailSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined
  }

  return value
}, z.string().email().optional())

const baseNodeEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_VERSION: z.string().default("0.1.0"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
})

const baseObservabilityEnvSchema = {
  REQUEST_ID_HEADER: z.string().min(1).default("x-request-id"),
  SENTRY_DSN: optionalUrlSchema,
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
  TRACING_ENABLED: envBooleanSchema.default(false),
  OTEL_SERVICE_NAME: z.string().min(1).default("attendease"),
  OTEL_EXPORTER_OTLP_ENDPOINT: optionalUrlSchema,
} as const

const baseRateLimitEnvSchema = {
  RATE_LIMIT_ENABLED: envBooleanSchema.default(true),
  RATE_LIMIT_STORE_MODE: z.enum(["memory", "redis"]).default("memory"),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  ATTENDANCE_MARK_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(6),
  ATTENDANCE_MARK_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
} as const

const baseFeatureFlagEnvSchema = {
  FEATURE_BLUETOOTH_ATTENDANCE_ENABLED: envBooleanSchema.default(true),
  FEATURE_EMAIL_AUTOMATION_ENABLED: envBooleanSchema.default(true),
  FEATURE_STRICT_DEVICE_BINDING_MODE: z.enum(["DISABLED", "AUDIT", "ENFORCE"]).default("ENFORCE"),
} as const

const baseWorkerGuardrailEnvSchema = {
  ROSTER_IMPORT_BATCH_SIZE: z.coerce.number().int().positive().default(10),
  ANNOUNCEMENT_FANOUT_BATCH_SIZE: z.coerce.number().int().positive().default(20),
  ANALYTICS_REFRESH_BATCH_SIZE: z.coerce.number().int().positive().default(20),
  EXPORT_JOB_BATCH_SIZE: z.coerce.number().int().positive().default(10),
  EMAIL_AUTOMATION_SCHEDULE_BATCH_SIZE: z.coerce.number().int().positive().default(100),
  EMAIL_AUTOMATION_PROCESS_BATCH_SIZE: z.coerce.number().int().positive().default(10),
  ROSTER_IMPORT_STUCK_TIMEOUT_MS: z.coerce.number().int().positive().default(900000),
  OUTBOX_STUCK_TIMEOUT_MS: z.coerce.number().int().positive().default(900000),
  EXPORT_JOB_STUCK_TIMEOUT_MS: z.coerce.number().int().positive().default(900000),
  EMAIL_AUTOMATION_STUCK_DISPATCH_TIMEOUT_MS: z.coerce.number().int().positive().default(900000),
  QUEUE_HEALTH_STALE_AFTER_MS: z.coerce.number().int().positive().default(900000),
} as const

const sharedStorageEnvSchema = {
  STORAGE_ENDPOINT: z.string().url().default("http://localhost:9000"),
  STORAGE_PUBLIC_ENDPOINT: optionalUrlSchema,
  STORAGE_REGION: z.string().min(1).default("us-east-1"),
  STORAGE_BUCKET: z.string().min(1).default("attendease-local"),
  STORAGE_ACCESS_KEY: z.string().min(1).default("minioadmin"),
  STORAGE_SECRET_KEY: z.string().min(1).default("minioadmin"),
  STORAGE_FORCE_PATH_STYLE: envBooleanSchema.default(true),
  STORAGE_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  EXPORT_FILE_TTL_HOURS: z.coerce.number().int().positive().default(72),
} as const

export const apiEnvSchema = baseNodeEnvSchema.extend({
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_CORS_ALLOWED_ORIGINS: z
    .string()
    .default(
      "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001",
    ),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://attendease:attendease@localhost:5432/attendease"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  AUTH_ISSUER: z.string().min(1).default("attendease-api"),
  AUTH_AUDIENCE: z.string().min(1).default("attendease-clients"),
  AUTH_ACCESS_TOKEN_SECRET: z
    .string()
    .min(32)
    .default("attendease-dev-access-token-secret-attendease"),
  AUTH_ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  AUTH_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  GOOGLE_OIDC_CLIENT_ID: z.string().min(1).default("attendease-google-client-id"),
  GOOGLE_OIDC_CLIENT_SECRET: optionalStringSchema,
  GOOGLE_OIDC_REDIRECT_URI: optionalUrlSchema,
  GOOGLE_TEACHER_ALLOWED_DOMAINS: z.string().default(""),
  GOOGLE_STUDENT_ALLOWED_DOMAINS: z.string().default(""),
  DEVICE_ATTESTATION_ANDROID_MODE: z
    .enum(["disabled", "placeholder", "native"])
    .default("placeholder"),
  DEVICE_ATTESTATION_APPLE_MODE: z
    .enum(["disabled", "placeholder", "native"])
    .default("placeholder"),
  ATTENDANCE_QR_ALLOWED_CLOCK_SKEW_SLICES: z.coerce.number().int().min(0).max(3).default(1),
  ATTENDANCE_BLUETOOTH_ALLOWED_CLOCK_SKEW_SLICES: z.coerce.number().int().min(0).max(3).default(1),
  ATTENDANCE_BLUETOOTH_PROTOCOL_VERSION: z.coerce.number().int().min(1).max(5).default(1),
  ATTENDANCE_BLUETOOTH_SERVICE_UUID: z
    .string()
    .uuid()
    .default("12345678-1234-5678-1234-56789abc0001"),
  ATTENDANCE_GPS_MAX_ACCURACY_METERS: z.coerce.number().int().positive().default(150),
  ...baseObservabilityEnvSchema,
  ...baseRateLimitEnvSchema,
  ...baseFeatureFlagEnvSchema,
  ...baseWorkerGuardrailEnvSchema,
  OTEL_SERVICE_NAME: z.string().min(1).default("attendease-api"),
  ...sharedStorageEnvSchema,
})

export const workerEnvSchema = baseNodeEnvSchema.extend({
  WORKER_PORT: z.coerce.number().int().positive().default(4010),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://attendease:attendease@localhost:5432/attendease"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  EMAIL_PROVIDER_MODE: z.enum(["console", "ses"]).default("console"),
  EMAIL_FROM_ADDRESS: z.string().email().default("noreply@attendease.local"),
  EMAIL_REPLY_TO_ADDRESS: optionalEmailSchema,
  AWS_SES_REGION: z.string().min(1).default("us-east-1"),
  AWS_SES_ACCESS_KEY_ID: z.string().min(1).default("attendease-ses-access-key"),
  AWS_SES_SECRET_ACCESS_KEY: z.string().min(1).default("attendease-ses-secret-key"),
  AWS_SES_ENDPOINT: optionalUrlSchema,
  AWS_SES_CONFIGURATION_SET: optionalStringSchema,
  WORKER_CYCLE_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  ...baseObservabilityEnvSchema,
  ...baseFeatureFlagEnvSchema,
  ...baseWorkerGuardrailEnvSchema,
  OTEL_SERVICE_NAME: z.string().min(1).default("attendease-worker"),
  ...sharedStorageEnvSchema,
})

export const webEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
  WEB_INTERNAL_API_URL: optionalUrlSchema,
  NEXT_PUBLIC_GOOGLE_OIDC_CLIENT_ID: optionalStringSchema,
  NEXT_PUBLIC_APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_FEATURE_BLUETOOTH_ATTENDANCE_ENABLED: envBooleanSchema.default(true),
  NEXT_PUBLIC_FEATURE_EMAIL_AUTOMATION_ENABLED: envBooleanSchema.default(true),
})

export const mobileEnvSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
  EXPO_PUBLIC_GOOGLE_OIDC_CLIENT_ID: optionalStringSchema,
  EXPO_PUBLIC_APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  EXPO_PUBLIC_ATTENDANCE_BLUETOOTH_SERVICE_UUID: z
    .string()
    .uuid()
    .default("12345678-1234-5678-1234-56789abc0001"),
  EXPO_PUBLIC_DEVICE_ATTESTATION_ANDROID_MODE: z
    .enum(["disabled", "placeholder", "native"])
    .default("placeholder"),
  EXPO_PUBLIC_DEVICE_ATTESTATION_APPLE_MODE: z
    .enum(["disabled", "placeholder", "native"])
    .default("placeholder"),
  EXPO_PUBLIC_FEATURE_BLUETOOTH_ATTENDANCE_ENABLED: envBooleanSchema.default(true),
  EXPO_PUBLIC_FEATURE_EMAIL_AUTOMATION_ENABLED: envBooleanSchema.default(true),
  EXPO_PUBLIC_STUDENT_DEV_EMAIL: optionalEmailSchema,
  EXPO_PUBLIC_STUDENT_DEV_PASSWORD: optionalStringSchema,
  EXPO_PUBLIC_STUDENT_DEV_INSTALL_ID: optionalStringSchema,
  EXPO_PUBLIC_STUDENT_DEV_PUBLIC_KEY: optionalStringSchema,
  EXPO_PUBLIC_STUDENT_DEV_PLATFORM: z.enum(["ANDROID", "IOS"]).default("ANDROID"),
  EXPO_PUBLIC_TEACHER_DEV_EMAIL: optionalEmailSchema,
  EXPO_PUBLIC_TEACHER_DEV_PASSWORD: optionalStringSchema,
})

export type ApiEnv = z.infer<typeof apiEnvSchema>
export type WorkerEnv = z.infer<typeof workerEnvSchema>
export type WebEnv = z.infer<typeof webEnvSchema>
export type MobileEnv = z.infer<typeof mobileEnvSchema>

let cachedApiEnv: ApiEnv | null = null
let cachedWorkerEnv: WorkerEnv | null = null
let cachedWebEnv: WebEnv | null = null
let cachedMobileEnv: MobileEnv | null = null

export function loadApiEnv(source: Record<string, string | undefined> = process.env): ApiEnv {
  if (source === process.env && process.env.NODE_ENV !== "test" && cachedApiEnv) {
    return cachedApiEnv
  }

  const parsed = apiEnvSchema.parse({
    ...source,
    RATE_LIMIT_ENABLED:
      source.NODE_ENV === "test" && source.RATE_LIMIT_ENABLED === undefined
        ? "false"
        : source.RATE_LIMIT_ENABLED,
  })

  if (source === process.env && process.env.NODE_ENV !== "test") {
    cachedApiEnv = parsed
  }

  return parsed
}

export function loadWorkerEnv(source: Record<string, string | undefined> = process.env): WorkerEnv {
  if (source === process.env && process.env.NODE_ENV !== "test" && cachedWorkerEnv) {
    return cachedWorkerEnv
  }

  const parsed = workerEnvSchema.parse(source)

  if (source === process.env && process.env.NODE_ENV !== "test") {
    cachedWorkerEnv = parsed
  }

  return parsed
}

export function resolveApiCorsAllowedOrigins(
  source: Record<string, string | undefined> = process.env,
) {
  return loadApiEnv(source)
    .API_CORS_ALLOWED_ORIGINS.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function loadWebEnv(source: Record<string, string | undefined> = process.env): WebEnv {
  if (source === process.env && process.env.NODE_ENV !== "test" && cachedWebEnv) {
    return cachedWebEnv
  }

  const parsed = webEnvSchema.parse(source)

  if (source === process.env && process.env.NODE_ENV !== "test") {
    cachedWebEnv = parsed
  }

  return parsed
}

export function loadMobileEnv(source: Record<string, string | undefined> = process.env): MobileEnv {
  if (source === process.env && process.env.NODE_ENV !== "test" && cachedMobileEnv) {
    return cachedMobileEnv
  }

  const parsed = mobileEnvSchema.parse(source)

  if (source === process.env && process.env.NODE_ENV !== "test") {
    cachedMobileEnv = parsed
  }

  return parsed
}
