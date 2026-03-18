"use client"

import type {
  AnalyticsDistributionResponse,
  AnalyticsModeUsageResponse,
  AnalyticsTrendResponse,
} from "@attendease/contracts"

import { createWebAuthBootstrap } from "../auth"
import { teacherAnalyticsStyles as styles } from "./styles"

export const teacherAnalyticsAutomationBootstrap = createWebAuthBootstrap()

export function WorkflowStateCard(props: { message: string }) {
  return <div style={styles.state}>{props.message}</div>
}

export function WorkflowBanner(props: {
  tone: "success" | "danger" | "warning"
  message: string
}) {
  const palette =
    props.tone === "success"
      ? {
          background: "#ecfdf5",
          border: "1px solid #86efac",
          color: "#166534",
        }
      : props.tone === "warning"
        ? {
            background: "#fff7ed",
            border: "1px solid #fdba74",
            color: "#9a3412",
          }
        : {
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            color: "#991b1b",
          }

  return <div style={{ ...styles.bannerBase, ...palette }}>{props.message}</div>
}

export function renderQueryError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function sumAttendancePoints(points: AnalyticsTrendResponse["weekly"]) {
  return points.reduce(
    (summary, point) => ({
      sessionCount: summary.sessionCount + point.sessionCount,
      presentCount: summary.presentCount + point.presentCount,
      absentCount: summary.absentCount + point.absentCount,
    }),
    {
      sessionCount: 0,
      presentCount: 0,
      absentCount: 0,
    },
  )
}

export function buildDistributionLabel(distribution: AnalyticsDistributionResponse | undefined) {
  if (!distribution || distribution.totalStudents === 0) {
    return "No students in scope"
  }

  const belowThreshold =
    distribution.buckets.find((bucket) => bucket.bucket === "BELOW_75")?.studentCount ?? 0

  return `${belowThreshold} below 75%`
}

export function buildModeLabel(modes: AnalyticsModeUsageResponse | undefined) {
  if (!modes || modes.totals.length === 0) {
    return "No session modes yet"
  }

  return modes.totals.map((row) => `${row.mode}: ${row.sessionCount}`).join(" • ")
}

export function toAnalyticsQueryKey(filters: {
  classroomId?: string | undefined
  classId?: string | undefined
  sectionId?: string | undefined
  subjectId?: string | undefined
  from?: string | undefined
  to?: string | undefined
}) {
  return {
    ...(filters.classroomId ? { classroomId: filters.classroomId } : {}),
    ...(filters.classId ? { classId: filters.classId } : {}),
    ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
    ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
  }
}
