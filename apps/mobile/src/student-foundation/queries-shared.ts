import { createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"

import { createMobileDeviceTrustBootstrap } from "../device-trust"
import { buildStudentInvalidationKeys } from "../student-query"

const env = loadMobileEnv(process.env as Record<string, string | undefined>)
const authClient = createAuthApiClient({
  baseUrl: env.EXPO_PUBLIC_API_URL,
})
const deviceTrustBootstrap = createMobileDeviceTrustBootstrap(
  process.env as Record<string, string | undefined>,
)

export { authClient, deviceTrustBootstrap, buildStudentInvalidationKeys }
