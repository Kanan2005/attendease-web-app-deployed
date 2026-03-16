import { type ApiEnv, loadApiEnv } from "@attendease/config"

export const API_ENV = Symbol("API_ENV")

export function createApiEnv(source: Record<string, string | undefined> = process.env): ApiEnv {
  return loadApiEnv(source)
}
