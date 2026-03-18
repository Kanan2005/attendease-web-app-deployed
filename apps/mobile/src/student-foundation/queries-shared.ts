import { createAuthApiClient } from "@attendease/auth"

import { mobileEnv } from "../mobile-env"
import { createMobileDeviceTrustBootstrap } from "../device-trust"
import { buildStudentInvalidationKeys } from "../student-query"

const authClient = createAuthApiClient({
  baseUrl: mobileEnv.EXPO_PUBLIC_API_URL,
})
const deviceTrustBootstrap = createMobileDeviceTrustBootstrap()

export { authClient, deviceTrustBootstrap, buildStudentInvalidationKeys }
