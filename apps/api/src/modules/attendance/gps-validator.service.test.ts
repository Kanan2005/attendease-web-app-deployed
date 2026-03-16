import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { GpsValidatorService } from "./gps-validator.service.js"

describe("GpsValidatorService", () => {
  const originalAccuracy = process.env.ATTENDANCE_GPS_MAX_ACCURACY_METERS

  beforeEach(() => {
    process.env.ATTENDANCE_GPS_MAX_ACCURACY_METERS = "75"
  })

  afterEach(() => {
    process.env.ATTENDANCE_GPS_MAX_ACCURACY_METERS = originalAccuracy
  })

  it("accepts points inside the configured radius", () => {
    const service = new GpsValidatorService()

    const result = service.validate({
      anchorLatitude: 28.6139,
      anchorLongitude: 77.209,
      radiusMeters: 120,
      latitude: 28.614,
      longitude: 77.2091,
      accuracyMeters: 20,
    })

    expect(result.accepted).toBe(true)
    if (result.accepted) {
      expect(result.distanceMeters).toBeLessThan(120)
      expect(result.accuracyMeters).toBe(20)
    }
  })

  it("rejects missing anchor data", () => {
    const service = new GpsValidatorService()

    expect(
      service.validate({
        anchorLatitude: null,
        anchorLongitude: null,
        radiusMeters: 120,
        latitude: 28.614,
        longitude: 77.2091,
        accuracyMeters: 20,
      }),
    ).toEqual({
      accepted: false,
      reason: "MISSING_ANCHOR",
      distanceMeters: null,
      accuracyMeters: 20,
    })
  })

  it("rejects low-accuracy locations before radius evaluation", () => {
    const service = new GpsValidatorService()

    expect(
      service.validate({
        anchorLatitude: 28.6139,
        anchorLongitude: 77.209,
        radiusMeters: 120,
        latitude: 28.614,
        longitude: 77.2091,
        accuracyMeters: 100,
      }),
    ).toEqual({
      accepted: false,
      reason: "ACCURACY_TOO_LOW",
      distanceMeters: null,
      accuracyMeters: 100,
    })
  })

  it("rejects locations outside the allowed radius", () => {
    const service = new GpsValidatorService()

    const result = service.validate({
      anchorLatitude: 28.6139,
      anchorLongitude: 77.209,
      radiusMeters: 50,
      latitude: 28.6205,
      longitude: 77.215,
      accuracyMeters: 20,
    })

    expect(result.accepted).toBe(false)
    if (!result.accepted) {
      expect(result.reason).toBe("OUT_OF_RADIUS")
      expect(result.distanceMeters).not.toBeNull()
      expect(result.distanceMeters ?? 0).toBeGreaterThan(50)
    }
  })
})
