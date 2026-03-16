export interface AttendancePercentageInput {
  presentCount: number
  totalCount: number
}

export function calculateAttendancePercentage(input: AttendancePercentageInput): number {
  if (input.totalCount <= 0) {
    return 0
  }

  return Math.round((input.presentCount / input.totalCount) * 10_000) / 100
}
