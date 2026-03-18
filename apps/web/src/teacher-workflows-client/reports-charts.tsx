"use client"

import { webTheme } from "@attendease/ui-web"
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { useChartColors, type ChartColors } from "../theme-context"
import type { TeacherWebSummaryCard } from "../teacher-review-workflows-types"

export function ReportSummaryRings(props: { cards: TeacherWebSummaryCard[] }) {
  const cc = useChartColors()
  const attendanceCard =
    props.cards.find((c) => c.label === "Average attendance") ??
    props.cards.find((c) => c.label === "Attendance")

  const attendancePct = attendanceCard
    ? Number.parseFloat(attendanceCard.value.replace("%", "")) || 0
    : 0
  const attendanceData = [
    { name: "Attendance", value: attendancePct, fill: cc.accent },
    { name: "Remaining", value: Math.max(0, 100 - attendancePct), fill: cc.border },
  ].filter((d) => d.value > 0)

  const sessionsCard =
    props.cards.find((c) => c.label === "Lecture sessions") ??
    props.cards.find((c) => c.label === "Sessions")
  const sessionsCount = sessionsCard ? Number.parseInt(sessionsCard.value, 10) || 0 : 0
  const sessionsCap = Math.max(sessionsCount, 30)
  const sessionsData = sessionsCount > 0
    ? [
        { name: "Taken", value: sessionsCount, fill: cc.success },
        { name: "Remaining", value: Math.max(0, sessionsCap - sessionsCount), fill: cc.border },
      ]
    : []

  const studentsCard = props.cards.find((c) => c.label === "Students enrolled" || c.label === "Students")
  const studentsCount = studentsCard ? Number.parseInt(studentsCard.value, 10) || 0 : 0
  const studentsCap = Math.max(studentsCount, 60)
  const studentsData = studentsCount > 0
    ? [
        { name: "Enrolled", value: studentsCount, fill: cc.warning },
        { name: "Remaining", value: Math.max(0, studentsCap - studentsCount), fill: cc.border },
      ]
    : []

  if (attendanceData.length === 0 && sessionsData.length === 0 && studentsData.length === 0) return null

  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap", marginBottom: 24 }}>
      {attendanceData.length > 0 ? (
        <RingItem label="Average attendance" value={`${attendancePct}%`} data={attendanceData} colors={cc} />
      ) : null}
      {sessionsData.length > 0 ? (
        <RingItem label="Sessions taken" value={String(sessionsCount)} data={sessionsData} colors={cc} />
      ) : null}
      {studentsData.length > 0 ? (
        <RingItem label="Students enrolled" value={String(studentsCount)} data={studentsData} colors={cc} />
      ) : null}
    </div>
  )
}

function RingItem(props: {
  label: string
  value: string
  data: Array<{ name: string; value: number; fill: string }>
  colors: ChartColors
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie
            data={props.data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={44}
            outerRadius={60}
            paddingAngle={2}
          >
            {props.data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 13, color: props.colors.textMuted }}>{props.label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: props.colors.text }}>{props.value}</div>
    </div>
  )
}

export interface SessionChartPoint {
  date: string
  dateLabel: string
  pct: number
  title?: string
}

export function ReportSessionTrendChart(props: { data: SessionChartPoint[] }) {
  const cc = useChartColors()

  if (props.data.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: "center",
          color: webTheme.colors.textMuted,
          border: `1px solid ${webTheme.colors.border}`,
          borderRadius: 10,
        }}
      >
        No session data for the selected filters.
      </div>
    )
  }

  return (
    <div style={{ height: 280, marginTop: 8 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={props.data}
          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
        >
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 12, fill: cc.textMuted }}
            stroke={cc.border}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: cc.textMuted }}
            stroke={cc.border}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: cc.surfaceRaised,
              border: `1px solid ${cc.border}`,
              borderRadius: 8,
              color: cc.text,
            }}
            labelStyle={{ color: cc.text }}
            itemStyle={{ color: cc.text }}
            formatter={(value: number) => [`${value}%`, "Attendance"]}
            labelFormatter={(label, payload) => {
              const point = payload?.[0]?.payload as SessionChartPoint | undefined
              return point?.title ? `${point.title} — ${label}` : label
            }}
          />
          <Line
            type="monotone"
            dataKey="pct"
            stroke={cc.accent}
            strokeWidth={2}
            dot={{ fill: cc.accent, r: 4 }}
            name="Attendance %"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
