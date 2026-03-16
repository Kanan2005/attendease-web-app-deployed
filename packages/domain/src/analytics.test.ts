import { describe, expect, it } from "vitest"

import {
  buildAttendanceDistribution,
  calculatePresentAttendancePercentage,
  getAttendanceDistributionBucket,
} from "./analytics.js"

describe("analytics domain helpers", () => {
  it("assigns attendance percentages into stable dashboard buckets", () => {
    expect(getAttendanceDistributionBucket(95)).toBe("ABOVE_90")
    expect(getAttendanceDistributionBucket(90)).toBe("BETWEEN_75_AND_90")
    expect(getAttendanceDistributionBucket(75)).toBe("BETWEEN_75_AND_90")
    expect(getAttendanceDistributionBucket(74.99)).toBe("BELOW_75")
  })

  it("builds distribution summaries in dashboard order", () => {
    expect(buildAttendanceDistribution([100, 92, 88, 75, 40])).toEqual([
      {
        bucket: "ABOVE_90",
        label: "Above 90%",
        studentCount: 2,
      },
      {
        bucket: "BETWEEN_75_AND_90",
        label: "75% to 90%",
        studentCount: 2,
      },
      {
        bucket: "BELOW_75",
        label: "Below 75%",
        studentCount: 1,
      },
    ])
  })

  it("calculates attendance percentage from present and absent totals", () => {
    expect(
      calculatePresentAttendancePercentage({
        presentCount: 3,
        absentCount: 1,
      }),
    ).toBe(75)
  })
})
