import { createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"

import { buildTeacherInvalidationKeys } from "../teacher-query"
import { buildTeacherLoginRequest } from "../teacher-session"

const env = loadMobileEnv(process.env as Record<string, string | undefined>)
const authClient = createAuthApiClient({
  baseUrl: env.EXPO_PUBLIC_API_URL,
})

export { authClient, buildTeacherInvalidationKeys, buildTeacherLoginRequest }
