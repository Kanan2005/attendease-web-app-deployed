import { buildGoogleExchangeRequest, createAuthApiClient } from "@attendease/auth"
import { loadMobileEnv } from "@attendease/config"
import type { AuthDeviceRegistration } from "@attendease/contracts"

import { mobileEnvSource } from "./mobile-env"

export function createMobileAuthBootstrap(
  source: Record<string, string | undefined> = mobileEnvSource,
) {
  const env = loadMobileEnv(source)

  return {
    apiBaseUrl: env.EXPO_PUBLIC_API_URL,
    googleClientId: env.EXPO_PUBLIC_GOOGLE_OIDC_CLIENT_ID ?? null,
    developmentStudentEmail: null,
    developmentStudentPassword: null,
    developmentInstallId: "student-dev-install",
    developmentPublicKey: "student-dev-public-key",
    developmentDevicePlatform: env.EXPO_PUBLIC_STUDENT_DEV_PLATFORM,
    developmentTeacherEmail: null,
    developmentTeacherPassword: null,
    authClient: createAuthApiClient({
      baseUrl: env.EXPO_PUBLIC_API_URL,
    }),
    createGoogleExchangePayload(input: {
      requestedRole: "TEACHER" | "STUDENT"
      idToken?: string
      authorizationCode?: string
      codeVerifier?: string
      redirectUri?: string
      device?: AuthDeviceRegistration
    }) {
      return buildGoogleExchangeRequest({
        platform: "MOBILE",
        requestedRole: input.requestedRole,
        ...(input.idToken ? { idToken: input.idToken } : {}),
        ...(input.authorizationCode ? { authorizationCode: input.authorizationCode } : {}),
        ...(input.codeVerifier ? { codeVerifier: input.codeVerifier } : {}),
        ...(input.redirectUri ? { redirectUri: input.redirectUri } : {}),
        ...(input.device ? { device: input.device } : {}),
      })
    },
  }
}
