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

import type { TeacherWebSummaryCard } from "../teacher-review-workflows-types"
import { type ChartColors, useChartColors } from "../theme-context"

export interface ReportRingMetrics {
  attendancePct: number
  qrSessions: number
  bleSessions: number
  manualSessions: number
  studentsAtRisk: number
  totalStudents: number
  attendanceThreshold: number
}

export function ReportSummaryRings(props: {
  cards: TeacherWebSummaryCard[]
  metrics?: ReportRingMetrics
}) {
  const cc = useChartColors()

  const attendancePct = props.metrics
    ? props.metrics.attendancePct
    : (() => {
        const card =
          props.cards.find((c) => c.label === "Average attendance") ??
          props.cards.find((c) => c.label === "Attendance")
        return card ? Number.parseFloat(card.value.replace("%", "")) || 0 : 0
      })()

  const attendanceData = [
    { name: "Attendance", value: attendancePct, fill: cc.accent },
    { name: "Remaining", value: Math.max(0, 100 - attendancePct), fill: cc.border },
  ].filter((d) => d.value > 0)

  const m = props.metrics

  const totalModeSessions = m ? m.qrSessions + m.bleSessions + m.manualSessions : 0
  const modeData =
    m && totalModeSessions > 0
      ? [
          { name: "QR + GPS", value: m.qrSessions, fill: cc.accent },
          { name: "Bluetooth", value: m.bleSessions, fill: cc.success },
          { name: "Manual", value: m.manualSessions, fill: cc.warning },
        ].filter((d) => d.value > 0)
      : []

  const atRiskPct =
    m && m.totalStudents > 0 ? Math.round((m.studentsAtRisk / m.totalStudents) * 100) : null
  const safePct = atRiskPct != null ? 100 - atRiskPct : null
  const studentsData =
    m && atRiskPct != null
      ? [
          { name: "On track", value: safePct ?? 0, fill: cc.success },
          { name: "At risk", value: atRiskPct, fill: cc.warning },
        ].filter((d) => d.value > 0)
      : []

  if (attendanceData.length === 0 && modeData.length === 0 && studentsData.length === 0)
    return null

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 40,
        flexWrap: "wrap",
        marginBottom: 24,
        padding: "28px 24px",
        borderRadius: 16,
        border: "1px solid var(--ae-card-border)",
        background: "var(--ae-card-surface)",
        boxShadow: "var(--ae-card-shadow)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--ae-card-glow)",
          pointerEvents: "none",
        }}
      />
      {attendanceData.length > 0 ? (
        <RingItem
          label="Average attendance"
          value={`${attendancePct}%`}
          data={attendanceData}
          colors={cc}
        />
      ) : null}
      {modeData.length > 0 ? (
        <ModeRingItem
          label="Session modes"
          total={totalModeSessions}
          data={modeData}
          colors={cc}
        />
      ) : null}
      {studentsData.length > 0 && m ? (
        <RingItem
          label={`Students below ${m.attendanceThreshold}%`}
          value={`${m.studentsAtRisk} / ${m.totalStudents}`}
          data={studentsData}
          colors={cc}
        />
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
    <div style={{ textAlign: "center", width: 160, flexShrink: 0, position: "relative", zIndex: 1 }}>
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
            startAngle={90}
            endAngle={-270}
          >
            {props.data.map((entry) => (
              <Cell key={`${entry.name}-${entry.fill}`} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 13, color: props.colors.textMuted, marginTop: 4 }}>{props.label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: props.colors.text, marginTop: 2 }}>{props.value}</div>
    </div>
  )
}

function ModeRingItem(props: {
  label: string
  total: number
  data: Array<{ name: string; value: number; fill: string }>
  colors: ChartColors
}) {
  return (
    <div style={{ textAlign: "center", width: 180, flexShrink: 0, position: "relative", zIndex: 1 }}>
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
            paddingAngle={3}
            startAngle={90}
            endAngle={-270}
          >
            {props.data.map((entry) => (
              <Cell key={`${entry.name}-${entry.fill}`} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 13, color: props.colors.textMuted, marginTop: 4 }}>{props.label}</div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          marginTop: 6,
          flexWrap: "wrap",
        }}
      >
        {props.data.map((entry) => (
          <div
            key={entry.name}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: entry.fill,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 11, color: props.colors.textMuted, whiteSpace: "nowrap" }}>
              {entry.name}
              <strong style={{ color: props.colors.text, marginLeft: 3 }}>{entry.value}</strong>
            </span>
          </div>
        ))}
      </div>
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
          border: "1px solid var(--ae-card-border)",
          borderRadius: 16,
          background: "var(--ae-card-surface)",
          boxShadow: "var(--ae-card-shadow)",
        }}
      >
        No session data for the selected filters.
      </div>
    )
  }

  return (
    <div
      style={{
        height: 320,
        marginTop: 8,
        padding: "20px 16px 16px",
        borderRadius: 16,
        border: "1px solid var(--ae-card-border)",
        background: "var(--ae-card-surface)",
        boxShadow: "var(--ae-card-shadow)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--ae-card-glow)",
          pointerEvents: "none",
        }}
      />
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={props.data} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: cc.textMuted }}
            stroke={cc.border}
            angle={-35}
            textAnchor="end"
            height={56}
            interval={0}
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
              border: "1px solid var(--ae-card-border)",
              borderRadius: 12,
              color: cc.text,
              boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
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
