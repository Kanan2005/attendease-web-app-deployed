import { buildGoogleExchangeRequest, createAuthApiClient } from "@attendease/auth"
import { loadWebEnv } from "@attendease/config"

import { webEnvSource } from "./web-env"

export function createWebAuthBootstrap(
  source: Record<string, string | undefined> = webEnvSource,
) {
  const env = loadWebEnv(source)

  return {
    apiBaseUrl: env.NEXT_PUBLIC_API_URL,
    googleClientId: env.NEXT_PUBLIC_GOOGLE_OIDC_CLIENT_ID ?? null,
    authClient: createAuthApiClient({
      baseUrl: env.NEXT_PUBLIC_API_URL,
    }),
    createGoogleExchangePayload(input: {
      requestedRole: "TEACHER" | "STUDENT"
      idToken?: string
      authorizationCode?: string
      codeVerifier?: string
      redirectUri?: string
    }) {
      return buildGoogleExchangeRequest({
        platform: "WEB",
        requestedRole: input.requestedRole,
        ...(input.idToken ? { idToken: input.idToken } : {}),
        ...(input.authorizationCode ? { authorizationCode: input.authorizationCode } : {}),
        ...(input.codeVerifier ? { codeVerifier: input.codeVerifier } : {}),
        ...(input.redirectUri ? { redirectUri: input.redirectUri } : {}),
      })
    },
  }
}
