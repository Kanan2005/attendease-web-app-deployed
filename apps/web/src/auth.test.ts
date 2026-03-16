import { describe, expect, it } from "vitest"

import { createWebAuthBootstrap } from "./auth.js"

describe("web auth bootstrap", () => {
  it("builds web auth configuration and Google exchange payloads", () => {
    const bootstrap = createWebAuthBootstrap({
      NEXT_PUBLIC_API_URL: "http://localhost:4000",
      NEXT_PUBLIC_GOOGLE_OIDC_CLIENT_ID: "web-client-id",
    })

    expect(bootstrap.apiBaseUrl).toBe("http://localhost:4000")
    expect(bootstrap.googleClientId).toBe("web-client-id")
    expect(
      bootstrap.createGoogleExchangePayload({
        requestedRole: "TEACHER",
        idToken: "teacher-google-token",
      }),
    ).toMatchObject({
      platform: "WEB",
      requestedRole: "TEACHER",
      idToken: "teacher-google-token",
    })
  })
})
