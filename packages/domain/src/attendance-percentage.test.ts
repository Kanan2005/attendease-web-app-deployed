import { describe, expect, it } from "vitest"

import { calculateAttendancePercentage } from "./attendance-percentage.js"

describe("calculateAttendancePercentage", () => {
  it("returns zero when there are no eligible sessions", () => {
    expect(
      calculateAttendancePercentage({
        presentCount: 0,
        totalCount: 0,
      }),
    ).toBe(0)
  })

  it("rounds attendance percentage to two decimal places", () => {
    expect(
      calculateAttendancePercentage({
        presentCount: 2,
        totalCount: 3,
      }),
    ).toBe(66.67)
  })

  it("returns whole-number percentages for exact ratios", () => {
    expect(
      calculateAttendancePercentage({
        presentCount: 3,
        totalCount: 4,
      }),
    ).toBe(75)
  })
})
