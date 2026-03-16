import { BadRequestException } from "@nestjs/common"
import { describe, expect, it } from "vitest"

import { LocationAnchorService } from "./location-anchor.service.js"

describe("LocationAnchorService", () => {
  const service = new LocationAnchorService()

  it("resolves a teacher-selected anchor with classroom defaults", () => {
    const resolved = service.resolveForSession({
      request: {
        classroomId: "classroom_1",
        anchorType: "TEACHER_SELECTED",
        anchorLatitude: 28.6139,
        anchorLongitude: 77.209,
      },
      defaultRadiusMeters: 100,
      classroomDisplayTitle: "Mathematics - Semester 6 A",
      now: new Date("2026-03-14T10:00:00.000Z"),
    })

    expect(resolved.anchorType).toBe("TEACHER_SELECTED")
    expect(resolved.radiusMeters).toBe(100)
    expect(resolved.anchorLabel).toBe("Mathematics - Semester 6 A")
    expect(resolved.anchorResolvedAt.toISOString()).toBe("2026-03-14T10:00:00.000Z")
  })

  it("rejects non-positive radius values", () => {
    expect(() =>
      service.resolveForSession({
        request: {
          classroomId: "classroom_1",
          anchorType: "CLASSROOM_FIXED",
          anchorLatitude: 28.6139,
          anchorLongitude: 77.209,
          gpsRadiusMeters: 0,
        },
        defaultRadiusMeters: 100,
        classroomDisplayTitle: "Mathematics - Semester 6 A",
      }),
    ).toThrow(BadRequestException)
  })
})
