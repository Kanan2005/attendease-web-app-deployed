import type {
  AttendanceSessionHistoryItem,
  AttendanceSessionStatus,
  AttendanceSessionSummary,
  LiveAttendanceSessionSummary,
} from "@attendease/contracts"

type MobileLiveSessionStatusLike =
  | Pick<AttendanceSessionSummary, "status">
  | Pick<AttendanceSessionHistoryItem, "status">
  | Pick<LiveAttendanceSessionSummary, "status">

export const mobileAttendanceSessionLiveRefreshIntervalMs = 5_000
export const mobileAttendanceDiscoveryIdleRefreshIntervalMs = 15_000

export function hasMobileLiveAttendanceSessions(
  sessions: ReadonlyArray<MobileLiveSessionStatusLike> | null,
) {
  return Boolean(sessions?.some((session) => session.status === "ACTIVE"))
}

export function getMobileAttendanceSessionPollInterval(
  session: MobileLiveSessionStatusLike | null,
): number | false {
  if (!session || session.status !== "ACTIVE") {
    return false
  }

  return mobileAttendanceSessionLiveRefreshIntervalMs
}

export function getMobileAttendanceListPollInterval(
  sessions: ReadonlyArray<MobileLiveSessionStatusLike> | null,
) {
  return hasMobileLiveAttendanceSessions(sessions)
    ? mobileAttendanceSessionLiveRefreshIntervalMs
    : mobileAttendanceDiscoveryIdleRefreshIntervalMs
}

export function isAttendanceSessionActive(status: AttendanceSessionStatus | null | undefined) {
  return status === "ACTIVE"
}
