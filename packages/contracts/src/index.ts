import { z } from "zod"

export * from "./academic"
export * from "./analytics"
export * from "./automation"
export * from "./attendance"
export * from "./auth"
export * from "./auth-profile"
export * from "./devices"
export * from "./exports"
export * from "./reports"

export const serviceNameSchema = z.enum(["api", "web", "worker"])
export type ServiceName = z.infer<typeof serviceNameSchema>

export const healthCheckResponseSchema = z.object({
  service: serviceNameSchema,
  status: z.literal("ok"),
  version: z.string(),
  timestamp: z.string().datetime(),
})

export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>

export const readinessDependencySchema = z.object({
  name: z.string().min(1),
  status: z.enum(["up", "down", "disabled"]),
  latencyMs: z.number().int().nonnegative().nullable(),
  details: z.string().nullable(),
})

export type ReadinessDependency = z.infer<typeof readinessDependencySchema>

export const readinessCheckResponseSchema = z.object({
  service: serviceNameSchema,
  status: z.enum(["ready", "degraded"]),
  version: z.string(),
  timestamp: z.string().datetime(),
  checks: z.array(readinessDependencySchema),
})

export type ReadinessCheckResponse = z.infer<typeof readinessCheckResponseSchema>

export const queueHealthItemSchema = z.object({
  name: z.string().min(1),
  status: z.enum(["healthy", "backlogged", "stalled"]),
  queuedCount: z.number().int().nonnegative(),
  processingCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  staleCount: z.number().int().nonnegative(),
  oldestQueuedAt: z.string().datetime().nullable(),
})

export type QueueHealthItem = z.infer<typeof queueHealthItemSchema>

export const queueHealthResponseSchema = z.object({
  service: serviceNameSchema,
  status: z.enum(["healthy", "degraded"]),
  version: z.string(),
  timestamp: z.string().datetime(),
  queues: z.array(queueHealthItemSchema),
})

export type QueueHealthResponse = z.infer<typeof queueHealthResponseSchema>
