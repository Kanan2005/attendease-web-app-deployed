import { describe, expect, it } from "vitest"

import {
  getMobileAttendanceListPollInterval,
  getMobileAttendanceSessionPollInterval,
  hasMobileLiveAttendanceSessions,
  isAttendanceSessionActive,
  mobileAttendanceDiscoveryIdleRefreshIntervalMs,
  mobileAttendanceSessionLiveRefreshIntervalMs,
} from "./attendance-live.js"

describe("attendance live helpers", () => {
  it("polls active mobile sessions and stops once a session is no longer live", () => {
    expect(getMobileAttendanceSessionPollInterval({ status: "ACTIVE" })).toBe(
      mobileAttendanceSessionLiveRefreshIntervalMs,
    )
    expect(getMobileAttendanceSessionPollInterval({ status: "ENDED" })).toBe(false)
  })

  it("uses slower discovery polling when no live session is open", () => {
    expect(getMobileAttendanceListPollInterval([{ status: "ACTIVE" }])).toBe(
      mobileAttendanceSessionLiveRefreshIntervalMs,
    )
    expect(getMobileAttendanceListPollInterval([{ status: "EXPIRED" }])).toBe(
      mobileAttendanceDiscoveryIdleRefreshIntervalMs,
    )
    expect(getMobileAttendanceListPollInterval(null)).toBe(
      mobileAttendanceDiscoveryIdleRefreshIntervalMs,
    )
  })

  it("detects whether any mobile live session is active", () => {
    expect(hasMobileLiveAttendanceSessions([{ status: "ACTIVE" }])).toBe(true)
    expect(hasMobileLiveAttendanceSessions([{ status: "ENDED" }])).toBe(false)
    expect(isAttendanceSessionActive("ACTIVE")).toBe(true)
    expect(isAttendanceSessionActive("EXPIRED")).toBe(false)
  })
})
