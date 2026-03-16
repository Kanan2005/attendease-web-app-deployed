import { describe, expect, it } from "vitest"

import {
  loadApiEnv,
  loadMobileEnv,
  loadWebEnv,
  loadWorkerEnv,
  resolveApiCorsAllowedOrigins,
} from "./index"

describe("config loaders", () => {
  it("parses api env with defaults", () => {
    const env = loadApiEnv({
      DATABASE_URL: "postgresql://example",
      REDIS_URL: "redis://localhost:6379",
    })

    expect(env.API_PORT).toBe(4000)
    expect(env.API_CORS_ALLOWED_ORIGINS).toContain("http://localhost:3000")
    expect(env.NODE_ENV).toBe("development")
    expect(env.AUTH_ACCESS_TOKEN_TTL_MINUTES).toBe(15)
    expect(env.GOOGLE_OIDC_CLIENT_ID).toBe("attendease-google-client-id")
    expect(env.DEVICE_ATTESTATION_ANDROID_MODE).toBe("placeholder")
    expect(env.ATTENDANCE_QR_ALLOWED_CLOCK_SKEW_SLICES).toBe(1)
    expect(env.ATTENDANCE_BLUETOOTH_ALLOWED_CLOCK_SKEW_SLICES).toBe(1)
    expect(env.ATTENDANCE_BLUETOOTH_PROTOCOL_VERSION).toBe(1)
    expect(env.ATTENDANCE_BLUETOOTH_SERVICE_UUID).toBe("12345678-1234-5678-1234-56789abc0001")
    expect(env.ATTENDANCE_GPS_MAX_ACCURACY_METERS).toBe(150)
    expect(env.REQUEST_ID_HEADER).toBe("x-request-id")
    expect(env.RATE_LIMIT_ENABLED).toBe(true)
    expect(env.RATE_LIMIT_STORE_MODE).toBe("memory")
    expect(env.AUTH_RATE_LIMIT_MAX).toBe(10)
    expect(env.ATTENDANCE_MARK_RATE_LIMIT_MAX).toBe(6)
    expect(env.FEATURE_BLUETOOTH_ATTENDANCE_ENABLED).toBe(true)
    expect(env.FEATURE_EMAIL_AUTOMATION_ENABLED).toBe(true)
    expect(env.FEATURE_STRICT_DEVICE_BINDING_MODE).toBe("ENFORCE")
    expect(env.ROSTER_IMPORT_BATCH_SIZE).toBe(10)
    expect(env.ANNOUNCEMENT_FANOUT_BATCH_SIZE).toBe(20)
    expect(env.ANALYTICS_REFRESH_BATCH_SIZE).toBe(20)
    expect(env.EXPORT_JOB_BATCH_SIZE).toBe(10)
    expect(env.EMAIL_AUTOMATION_SCHEDULE_BATCH_SIZE).toBe(100)
    expect(env.EMAIL_AUTOMATION_PROCESS_BATCH_SIZE).toBe(10)
    expect(env.ROSTER_IMPORT_STUCK_TIMEOUT_MS).toBe(900000)
    expect(env.OUTBOX_STUCK_TIMEOUT_MS).toBe(900000)
    expect(env.EXPORT_JOB_STUCK_TIMEOUT_MS).toBe(900000)
    expect(env.EMAIL_AUTOMATION_STUCK_DISPATCH_TIMEOUT_MS).toBe(900000)
    expect(env.OTEL_SERVICE_NAME).toBe("attendease-api")
    expect(env.STORAGE_ENDPOINT).toBe("http://localhost:9000")
    expect(env.STORAGE_PUBLIC_ENDPOINT).toBeUndefined()
    expect(env.STORAGE_BUCKET).toBe("attendease-local")
    expect(env.STORAGE_SIGNED_URL_TTL_SECONDS).toBe(900)
    expect(env.EXPORT_FILE_TTL_HOURS).toBe(72)
  })

  it("parses worker env with defaults", () => {
    const env = loadWorkerEnv({
      DATABASE_URL: "postgresql://example",
      REDIS_URL: "redis://localhost:6379",
    })

    expect(env.WORKER_PORT).toBe(4010)
    expect(env.LOG_LEVEL).toBe("info")
    expect(env.REQUEST_ID_HEADER).toBe("x-request-id")
    expect(env.OTEL_SERVICE_NAME).toBe("attendease-worker")
    expect(env.WORKER_CYCLE_INTERVAL_MS).toBe(5000)
    expect(env.FEATURE_EMAIL_AUTOMATION_ENABLED).toBe(true)
    expect(env.FEATURE_BLUETOOTH_ATTENDANCE_ENABLED).toBe(true)
    expect(env.FEATURE_STRICT_DEVICE_BINDING_MODE).toBe("ENFORCE")
    expect(env.EXPORT_JOB_BATCH_SIZE).toBe(10)
    expect(env.EMAIL_AUTOMATION_STUCK_DISPATCH_TIMEOUT_MS).toBe(900000)
    expect(env.STORAGE_ENDPOINT).toBe("http://localhost:9000")
    expect(env.STORAGE_PUBLIC_ENDPOINT).toBeUndefined()
    expect(env.STORAGE_REGION).toBe("us-east-1")
    expect(env.STORAGE_FORCE_PATH_STYLE).toBe(true)
  })

  it("rejects invalid observability and rate-limit values", () => {
    expect(() =>
      loadApiEnv({
        DATABASE_URL: "postgresql://example",
        REDIS_URL: "redis://localhost:6379",
        AUTH_RATE_LIMIT_MAX: "0",
      }),
    ).toThrowError()

    expect(() =>
      loadWorkerEnv({
        DATABASE_URL: "postgresql://example",
        REDIS_URL: "redis://localhost:6379",
        SENTRY_TRACES_SAMPLE_RATE: "2",
      }),
    ).toThrowError()

    expect(() =>
      loadApiEnv({
        DATABASE_URL: "postgresql://example",
        REDIS_URL: "redis://localhost:6379",
        FEATURE_STRICT_DEVICE_BINDING_MODE: "STRICT",
      } as never),
    ).toThrowError()

    expect(() =>
      loadWorkerEnv({
        DATABASE_URL: "postgresql://example",
        REDIS_URL: "redis://localhost:6379",
        EXPORT_JOB_BATCH_SIZE: "0",
      }),
    ).toThrowError()
  })

  it("disables rate limits by default in test env unless explicitly enabled", () => {
    const env = loadApiEnv({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://example",
      REDIS_URL: "redis://localhost:6379",
    })

    expect(env.RATE_LIMIT_ENABLED).toBe(false)
  })

  it("parses boolean env flags from common string values", () => {
    const env = loadApiEnv({
      DATABASE_URL: "postgresql://example",
      REDIS_URL: "redis://localhost:6379",
      TRACING_ENABLED: "on",
      RATE_LIMIT_ENABLED: "false",
      STORAGE_FORCE_PATH_STYLE: "0",
      FEATURE_EMAIL_AUTOMATION_ENABLED: "off",
    })

    expect(env.TRACING_ENABLED).toBe(true)
    expect(env.RATE_LIMIT_ENABLED).toBe(false)
    expect(env.STORAGE_FORCE_PATH_STYLE).toBe(false)
    expect(env.FEATURE_EMAIL_AUTOMATION_ENABLED).toBe(false)
  })

  it("normalizes the allowed browser origins for API CORS", () => {
    expect(
      resolveApiCorsAllowedOrigins({
        DATABASE_URL: "postgresql://example",
        REDIS_URL: "redis://localhost:6379",
        API_CORS_ALLOWED_ORIGINS: " http://localhost:3000 , http://127.0.0.1:3000 ",
      }),
    ).toEqual(["http://localhost:3000", "http://127.0.0.1:3000"])
  })

  it("parses an explicit public storage endpoint for signed download URLs", () => {
    const env = loadApiEnv({
      DATABASE_URL: "postgresql://example",
      REDIS_URL: "redis://localhost:6379",
      STORAGE_PUBLIC_ENDPOINT: "http://localhost:9000",
    })

    expect(env.STORAGE_ENDPOINT).toBe("http://localhost:9000")
    expect(env.STORAGE_PUBLIC_ENDPOINT).toBe("http://localhost:9000")
  })

  it("parses public web env", () => {
    const env = loadWebEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_API_URL: "http://localhost:4000",
      WEB_INTERNAL_API_URL: "http://api:4000",
      NEXT_PUBLIC_GOOGLE_OIDC_CLIENT_ID: "google-web-client-id",
    })

    expect(env.NEXT_PUBLIC_APP_ENV).toBe("development")
    expect(env.WEB_INTERNAL_API_URL).toBe("http://api:4000")
    expect(env.NEXT_PUBLIC_GOOGLE_OIDC_CLIENT_ID).toBe("google-web-client-id")
    expect(env.NEXT_PUBLIC_FEATURE_BLUETOOTH_ATTENDANCE_ENABLED).toBe(true)
    expect(env.NEXT_PUBLIC_FEATURE_EMAIL_AUTOMATION_ENABLED).toBe(true)
  })

  it("parses public mobile env", () => {
    const env = loadMobileEnv({
      EXPO_PUBLIC_API_URL: "http://localhost:4000",
      EXPO_PUBLIC_GOOGLE_OIDC_CLIENT_ID: "google-mobile-client-id",
      EXPO_PUBLIC_STUDENT_DEV_EMAIL: "student.one@attendease.dev",
      EXPO_PUBLIC_STUDENT_DEV_PASSWORD: "StudentOnePass123!",
      EXPO_PUBLIC_TEACHER_DEV_EMAIL: "teacher.one@attendease.dev",
      EXPO_PUBLIC_TEACHER_DEV_PASSWORD: "TeacherOnePass123!",
      EXPO_PUBLIC_FEATURE_BLUETOOTH_ATTENDANCE_ENABLED: "false",
    })

    expect(env.EXPO_PUBLIC_APP_ENV).toBe("development")
    expect(env.EXPO_PUBLIC_GOOGLE_OIDC_CLIENT_ID).toBe("google-mobile-client-id")
    expect(env.EXPO_PUBLIC_DEVICE_ATTESTATION_ANDROID_MODE).toBe("placeholder")
    expect(env.EXPO_PUBLIC_ATTENDANCE_BLUETOOTH_SERVICE_UUID).toBe(
      "12345678-1234-5678-1234-56789abc0001",
    )
    expect(env.EXPO_PUBLIC_FEATURE_BLUETOOTH_ATTENDANCE_ENABLED).toBe(false)
    expect(env.EXPO_PUBLIC_FEATURE_EMAIL_AUTOMATION_ENABLED).toBe(true)
    expect(env.EXPO_PUBLIC_STUDENT_DEV_EMAIL).toBe("student.one@attendease.dev")
    expect(env.EXPO_PUBLIC_STUDENT_DEV_PLATFORM).toBe("ANDROID")
    expect(env.EXPO_PUBLIC_TEACHER_DEV_EMAIL).toBe("teacher.one@attendease.dev")
  })
})
