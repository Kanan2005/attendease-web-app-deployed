import { SetMetadata } from "@nestjs/common"

export const RATE_LIMIT_POLICY_KEY = "attendease:rate-limit-policy"

export type RateLimitPolicyName = "auth" | "attendance_mark"

export const RateLimit = (policy: RateLimitPolicyName) => SetMetadata(RATE_LIMIT_POLICY_KEY, policy)
