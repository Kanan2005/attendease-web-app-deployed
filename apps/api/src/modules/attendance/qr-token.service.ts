import { createHmac } from "node:crypto"

import { loadApiEnv } from "@attendease/config"
import { type RollingQrTokenPayload, rollingQrTokenPayloadSchema } from "@attendease/contracts"
import { Injectable } from "@nestjs/common"

export type IssuedQrToken = {
  payload: string
  parsed: RollingQrTokenPayload
  slice: number
  expiresAt: Date
}

export type QrTokenValidationResult =
  | {
      accepted: true
      parsed: RollingQrTokenPayload
    }
  | {
      accepted: false
      reason: "INVALID" | "EXPIRED" | "SESSION_MISMATCH"
    }

@Injectable()
export class QrTokenService {
  private readonly env = loadApiEnv(process.env)

  issueToken(params: {
    sessionId: string
    qrSeed: string
    rotationWindowSeconds: number
    now?: Date
  }): IssuedQrToken {
    const issuedAt = params.now ?? new Date()
    const slice = this.getSliceIndex(issuedAt, params.rotationWindowSeconds)
    const parsed = this.buildPayload({
      sessionId: params.sessionId,
      qrSeed: params.qrSeed,
      slice,
    })

    return {
      payload: JSON.stringify(parsed),
      parsed,
      slice,
      expiresAt: new Date((slice + 1) * params.rotationWindowSeconds * 1_000),
    }
  }

  parsePayload(payload: string): RollingQrTokenPayload {
    return rollingQrTokenPayloadSchema.parse(JSON.parse(payload))
  }

  validateToken(params: {
    sessionId: string
    qrSeed: string | null
    rotationWindowSeconds: number | null
    payload: string
    now?: Date
  }): QrTokenValidationResult {
    if (!params.qrSeed || !params.rotationWindowSeconds) {
      return {
        accepted: false,
        reason: "INVALID",
      }
    }

    let parsed: RollingQrTokenPayload

    try {
      parsed = this.parsePayload(params.payload)
    } catch {
      return {
        accepted: false,
        reason: "INVALID",
      }
    }

    if (parsed.sid !== params.sessionId) {
      return {
        accepted: false,
        reason: "SESSION_MISMATCH",
      }
    }

    const expectedSignature = this.createSignature({
      sessionId: params.sessionId,
      qrSeed: params.qrSeed,
      slice: parsed.ts,
    })

    if (parsed.sig !== expectedSignature) {
      return {
        accepted: false,
        reason: "INVALID",
      }
    }

    const now = params.now ?? new Date()
    const currentSlice = this.getSliceIndex(now, params.rotationWindowSeconds)
    const minimumAcceptedSlice = currentSlice - this.env.ATTENDANCE_QR_ALLOWED_CLOCK_SKEW_SLICES

    if (parsed.ts > currentSlice || parsed.ts < minimumAcceptedSlice) {
      return {
        accepted: false,
        reason: "EXPIRED",
      }
    }

    return {
      accepted: true,
      parsed,
    }
  }

  private getSliceIndex(now: Date, rotationWindowSeconds: number): number {
    return Math.floor(now.getTime() / (rotationWindowSeconds * 1_000))
  }

  private buildPayload(params: {
    sessionId: string
    qrSeed: string
    slice: number
  }): RollingQrTokenPayload {
    return rollingQrTokenPayloadSchema.parse({
      v: 1,
      sid: params.sessionId,
      ts: params.slice,
      sig: this.createSignature(params),
    })
  }

  private createSignature(params: {
    sessionId: string
    qrSeed: string
    slice: number
  }): string {
    return createHmac("sha256", params.qrSeed)
      .update(`v1:${params.sessionId}:${params.slice}`)
      .digest("hex")
  }
}
