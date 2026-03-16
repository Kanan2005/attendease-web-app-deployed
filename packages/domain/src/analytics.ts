import { calculateAttendancePercentage } from "./attendance-percentage"

export type AttendanceDistributionBucket = "ABOVE_90" | "BETWEEN_75_AND_90" | "BELOW_75"

export type AttendanceDistributionBucketSummary = {
  bucket: AttendanceDistributionBucket
  label: string
  studentCount: number
}

const distributionLabels: Record<AttendanceDistributionBucket, string> = {
  ABOVE_90: "Above 90%",
  BETWEEN_75_AND_90: "75% to 90%",
  BELOW_75: "Below 75%",
}

export function getAttendanceDistributionBucket(percentage: number): AttendanceDistributionBucket {
  if (percentage > 90) {
    return "ABOVE_90"
  }

  if (percentage >= 75) {
    return "BETWEEN_75_AND_90"
  }

  return "BELOW_75"
}

export function getAttendanceDistributionLabel(bucket: AttendanceDistributionBucket): string {
  return distributionLabels[bucket]
}

export function buildAttendanceDistribution(
  percentages: readonly number[],
): AttendanceDistributionBucketSummary[] {
  const counts = new Map<AttendanceDistributionBucket, number>([
    ["ABOVE_90", 0],
    ["BETWEEN_75_AND_90", 0],
    ["BELOW_75", 0],
  ])

  for (const percentage of percentages) {
    const bucket = getAttendanceDistributionBucket(percentage)
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1)
  }

  return (["ABOVE_90", "BETWEEN_75_AND_90", "BELOW_75"] as const).map((bucket) => ({
    bucket,
    label: getAttendanceDistributionLabel(bucket),
    studentCount: counts.get(bucket) ?? 0,
  }))
}

export function calculatePresentAttendancePercentage(input: {
  presentCount: number
  absentCount: number
}): number {
  return calculateAttendancePercentage({
    presentCount: input.presentCount,
    totalCount: input.presentCount + input.absentCount,
  })
}
