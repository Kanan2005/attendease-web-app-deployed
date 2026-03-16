import { createHmac } from "node:crypto"

import { loadApiEnv } from "@attendease/config"
import {
  type RollingBluetoothTokenPayload,
  rollingBluetoothTokenPayloadSchema,
} from "@attendease/contracts"
import { Injectable } from "@nestjs/common"

export type IssuedBluetoothToken = {
  payload: string
  parsed: RollingBluetoothTokenPayload
  slice: number
  expiresAt: Date
}

export type BluetoothTokenValidationResult =
  | {
      accepted: true
      parsed: RollingBluetoothTokenPayload
    }
  | {
      accepted: false
      reason: "INVALID" | "EXPIRED" | "SESSION_MISMATCH"
    }

@Injectable()
export class BluetoothTokenService {
  private readonly env = loadApiEnv(process.env)

  issueToken(params: {
    publicId: string
    bleSeed: string
    protocolVersion: number
    rotationWindowSeconds: number
    now?: Date
  }): IssuedBluetoothToken {
    const issuedAt = params.now ?? new Date()
    const slice = this.getSliceIndex(issuedAt, params.rotationWindowSeconds)
    const parsed = this.buildPayload({
      publicId: params.publicId,
      bleSeed: params.bleSeed,
      protocolVersion: params.protocolVersion,
      slice,
    })

    return {
      payload: JSON.stringify(parsed),
      parsed,
      slice,
      expiresAt: new Date((slice + 1) * params.rotationWindowSeconds * 1_000),
    }
  }

  parsePayload(payload: string): RollingBluetoothTokenPayload {
    return rollingBluetoothTokenPayloadSchema.parse(JSON.parse(payload))
  }

  validateToken(params: {
    publicId: string | null
    bleSeed: string | null
    protocolVersion: number | null
    rotationWindowSeconds: number | null
    payload: string
    now?: Date
  }): BluetoothTokenValidationResult {
    if (
      !params.publicId ||
      !params.bleSeed ||
      !params.protocolVersion ||
      !params.rotationWindowSeconds
    ) {
      return {
        accepted: false,
        reason: "INVALID",
      }
    }

    let parsed: RollingBluetoothTokenPayload

    try {
      parsed = this.parsePayload(params.payload)
    } catch {
      return {
        accepted: false,
        reason: "INVALID",
      }
    }

    if (parsed.pid !== params.publicId || parsed.v !== params.protocolVersion) {
      return {
        accepted: false,
        reason: "SESSION_MISMATCH",
      }
    }

    const expectedEphemeralId = this.createEphemeralId({
      publicId: params.publicId,
      bleSeed: params.bleSeed,
      protocolVersion: params.protocolVersion,
      slice: parsed.ts,
    })

    if (parsed.eid !== expectedEphemeralId) {
      return {
        accepted: false,
        reason: "INVALID",
      }
    }

    const now = params.now ?? new Date()
    const currentSlice = this.getSliceIndex(now, params.rotationWindowSeconds)
    const minimumAcceptedSlice =
      currentSlice - this.env.ATTENDANCE_BLUETOOTH_ALLOWED_CLOCK_SKEW_SLICES

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
    publicId: string
    bleSeed: string
    protocolVersion: number
    slice: number
  }): RollingBluetoothTokenPayload {
    return rollingBluetoothTokenPayloadSchema.parse({
      v: params.protocolVersion,
      pid: params.publicId,
      ts: params.slice,
      eid: this.createEphemeralId(params),
    })
  }

  private createEphemeralId(params: {
    publicId: string
    bleSeed: string
    protocolVersion: number
    slice: number
  }): string {
    return createHmac("sha256", params.bleSeed)
      .update(`v${params.protocolVersion}:${params.publicId}:${params.slice}`)
      .digest("hex")
  }
}
