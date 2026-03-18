import { createAuthApiClient } from "@attendease/auth"

import { mobileEnv } from "../mobile-env"
import { buildTeacherInvalidationKeys } from "../teacher-query"
import { buildTeacherLoginRequest } from "../teacher-session"

const authClient = createAuthApiClient({
  baseUrl: mobileEnv.EXPO_PUBLIC_API_URL,
})

export { authClient, buildTeacherInvalidationKeys, buildTeacherLoginRequest }
