import { loadApiEnv } from "@attendease/config"
import type { AuthGoogleExchangeRequest } from "@attendease/contracts"
import { Injectable, UnauthorizedException } from "@nestjs/common"
import { type GetTokenOptions, OAuth2Client } from "google-auth-library"

import type { VerifiedGoogleIdentity } from "./auth.types.js"

@Injectable()
export class GoogleOidcService {
  private readonly env = loadApiEnv(process.env)
  private readonly client = new OAuth2Client(
    this.env.GOOGLE_OIDC_CLIENT_ID,
    this.env.GOOGLE_OIDC_CLIENT_SECRET,
    this.env.GOOGLE_OIDC_REDIRECT_URI,
  )

  async verifyExchange(request: AuthGoogleExchangeRequest): Promise<VerifiedGoogleIdentity> {
    if (request.authorizationCode) {
      const tokenOptions: GetTokenOptions = {
        code: request.authorizationCode,
      }
      const redirectUri = request.redirectUri ?? this.env.GOOGLE_OIDC_REDIRECT_URI

      if (request.codeVerifier) {
        tokenOptions.codeVerifier = request.codeVerifier
      }

      if (redirectUri) {
        tokenOptions.redirect_uri = redirectUri
      }

      const tokenResponse = await this.client.getToken(tokenOptions)
      const { tokens } = tokenResponse

      if (!tokens.id_token) {
        throw new UnauthorizedException("Google exchange did not return an ID token.")
      }

      return this.verifyIdToken(tokens.id_token)
    }

    if (!request.idToken) {
      throw new UnauthorizedException("Google exchange requires an ID token or authorization code.")
    }

    return this.verifyIdToken(request.idToken)
  }

  private async verifyIdToken(idToken: string): Promise<VerifiedGoogleIdentity> {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.env.GOOGLE_OIDC_CLIENT_ID,
    })
    const payload = ticket.getPayload()

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new UnauthorizedException("Google identity could not be verified.")
    }

    return {
      providerSubject: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified,
      displayName: payload.name ?? payload.email,
      avatarUrl: payload.picture ?? null,
      hostedDomain: payload.hd ?? null,
    }
  }
}
