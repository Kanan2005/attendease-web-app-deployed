import { createAuthApiClient } from "@attendease/auth"

import { createMobileDeviceTrustBootstrap } from "../device-trust"
import { mobileEnv } from "../mobile-env"
import { buildStudentInvalidationKeys } from "../student-query"

const authClient = createAuthApiClient({
  baseUrl: mobileEnv.EXPO_PUBLIC_API_URL,
})
const deviceTrustBootstrap = createMobileDeviceTrustBootstrap()

export { authClient, deviceTrustBootstrap, buildStudentInvalidationKeys }
