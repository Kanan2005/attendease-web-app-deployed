import { loadApiEnv } from "@attendease/config"
import type { GpsValidationReason } from "@attendease/contracts"
import { Injectable } from "@nestjs/common"

export type GpsValidationInput = {
  anchorLatitude: number | null
  anchorLongitude: number | null
  radiusMeters: number | null
  latitude: number
  longitude: number
  accuracyMeters: number
}

export type GpsValidationResult =
  | {
      accepted: true
      distanceMeters: number
      accuracyMeters: number
    }
  | {
      accepted: false
      reason: GpsValidationReason
      distanceMeters: number | null
      accuracyMeters: number
    }

@Injectable()
export class GpsValidatorService {
  private readonly env = loadApiEnv(process.env)

  validate(input: GpsValidationInput): GpsValidationResult {
    if (
      input.anchorLatitude === null ||
      input.anchorLongitude === null ||
      input.radiusMeters === null
    ) {
      return {
        accepted: false,
        reason: "MISSING_ANCHOR",
        distanceMeters: null,
        accuracyMeters: input.accuracyMeters,
      }
    }

    if (!Number.isFinite(input.accuracyMeters) || input.accuracyMeters <= 0) {
      return {
        accepted: false,
        reason: "MISSING_LOCATION",
        distanceMeters: null,
        accuracyMeters: input.accuracyMeters,
      }
    }

    if (input.accuracyMeters > this.env.ATTENDANCE_GPS_MAX_ACCURACY_METERS) {
      return {
        accepted: false,
        reason: "ACCURACY_TOO_LOW",
        distanceMeters: null,
        accuracyMeters: input.accuracyMeters,
      }
    }

    const distanceMeters = haversineMeters(
      input.anchorLatitude,
      input.anchorLongitude,
      input.latitude,
      input.longitude,
    )

    if (distanceMeters > input.radiusMeters) {
      return {
        accepted: false,
        reason: "OUT_OF_RADIUS",
        distanceMeters,
        accuracyMeters: input.accuracyMeters,
      }
    }

    return {
      accepted: true,
      distanceMeters,
      accuracyMeters: input.accuracyMeters,
    }
  }
}

function haversineMeters(
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number,
): number {
  const earthRadiusMeters = 6_371_000
  const latitudeDelta = degreesToRadians(endLatitude - startLatitude)
  const longitudeDelta = degreesToRadians(endLongitude - startLongitude)
  const startLatitudeRadians = degreesToRadians(startLatitude)
  const endLatitudeRadians = degreesToRadians(endLatitude)

  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2) *
      Math.cos(startLatitudeRadians) *
      Math.cos(endLatitudeRadians)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusMeters * c
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180
}
