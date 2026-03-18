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
    developmentStudentEmail: env.EXPO_PUBLIC_STUDENT_DEV_EMAIL ?? null,
    developmentStudentPassword: env.EXPO_PUBLIC_STUDENT_DEV_PASSWORD ?? null,
    developmentInstallId: env.EXPO_PUBLIC_STUDENT_DEV_INSTALL_ID ?? "student-dev-install",
    developmentPublicKey: env.EXPO_PUBLIC_STUDENT_DEV_PUBLIC_KEY ?? "student-dev-public-key",
    developmentDevicePlatform: env.EXPO_PUBLIC_STUDENT_DEV_PLATFORM,
    developmentTeacherEmail: env.EXPO_PUBLIC_TEACHER_DEV_EMAIL ?? null,
    developmentTeacherPassword: env.EXPO_PUBLIC_TEACHER_DEV_PASSWORD ?? null,
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
