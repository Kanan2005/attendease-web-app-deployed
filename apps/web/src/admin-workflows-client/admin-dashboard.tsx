"use client"

import type {
  AdminDashboardAttendanceBracket,
  AdminDashboardLeaderboardEntry,
  AdminDashboardSessionsGraphPoint,
  AdminDashboardSessionsRange,
  AdminDashboardStats,
  AdminDashboardTodayBranchRow,
} from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useState } from "react"

import { adminWorkflowRoutes, webWorkflowQueryKeys } from "../web-workflows"
import { bootstrap } from "./shared"

export function AdminDashboardWorkspace(props: { accessToken: string | null }) {
  const accessToken = props.accessToken ?? ""
  const enabled = Boolean(accessToken)

  const statsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminDashboardStats(),
    enabled,
    queryFn: () => bootstrap.authClient.getAdminDashboardStats(accessToken),
    refetchInterval: 60_000,
  })

  if (statsQuery.isLoading) {
    return <p style={mutedTextStyle}>Loading dashboard…</p>
  }
  if (statsQuery.isError) {
    return (
      <p style={{ ...mutedTextStyle, color: webTheme.colors.danger }}>
        Failed to load dashboard. Please refresh.
      </p>
    )
  }
  if (!statsQuery.data) return null

  return <DashboardContent accessToken={accessToken} stats={statsQuery.data} />
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function DashboardContent(props: { accessToken: string; stats: AdminDashboardStats }) {
  const { stats } = props

  return (
    <div style={{ display: "grid", gap: 28 }}>
      <header className="animate-slide-up">
        <h2 style={pageTitleStyle}>Dashboard</h2>
        <p style={pageSubtitleStyle}>
          Live snapshot of attendance, engagement, and pending actions.
        </p>
      </header>

      <HeroStats stats={stats} />

      <div style={twoColumnStyle}>
        <AttendanceOverviewCard accessToken={props.accessToken} />
        <TodayBranchAttendanceCard accessToken={props.accessToken} />
      </div>

      <div style={twoColumnStyle}>
        <SessionsTrendCard accessToken={props.accessToken} />
        <BranchComparisonCard accessToken={props.accessToken} />
      </div>

      <CourseLeaderboardCard accessToken={props.accessToken} />

      {stats.recentSecurityEvents.length > 0 ? (
        <RecentSecurityCard events={stats.recentSecurityEvents} />
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hero stats — 6 cards organised by priority. Alert cards stand out.
// ---------------------------------------------------------------------------

function HeroStats(props: { stats: AdminDashboardStats }) {
  const { stats } = props
  const { insights } = stats

  const sessionsDelta = insights.sessionsLast7Days - insights.sessionsPrior7Days
  const sessionsDeltaPercent =
    insights.sessionsPrior7Days === 0
      ? null
      : Math.round((sessionsDelta / insights.sessionsPrior7Days) * 100)

  return (
    <div className="stagger-fast" style={heroGridStyle}>
      <HeroCard
        label="Average attendance"
        value={
          insights.averageAttendancePercent === null ? "—" : `${insights.averageAttendancePercent}%`
        }
        accent="primary"
        helper="Across all enrolled students"
      />
      <HeroCard
        label={`Below ${insights.lowAttendanceThresholdPercent}%`}
        value={insights.lowAttendanceStudentCount.toLocaleString()}
        accent={insights.lowAttendanceStudentCount > 0 ? "danger" : "muted"}
        helper="Students at risk"
        href={`${adminWorkflowRoutes.communication}`}
        cta={insights.lowAttendanceStudentCount > 0 ? "Email them →" : undefined}
      />
      <HeroCard
        label="Pending devices"
        value={stats.pendingDeviceRequests.toLocaleString()}
        accent={stats.pendingDeviceRequests > 0 ? "warning" : "muted"}
        helper="Awaiting your approval"
        href={adminWorkflowRoutes.devices}
        cta={stats.pendingDeviceRequests > 0 ? "Review →" : undefined}
      />
      <HeroCard
        label="Sessions (last 7 days)"
        value={insights.sessionsLast7Days.toLocaleString()}
        accent="muted"
        helper={
          sessionsDeltaPercent === null
            ? "First week of activity"
            : sessionsDelta === 0
              ? "Same as prior week"
              : `${sessionsDelta > 0 ? "▲" : "▼"} ${Math.abs(sessionsDeltaPercent)}% vs prior week`
        }
        helperTone={sessionsDelta > 0 ? "success" : sessionsDelta < 0 ? "danger" : "muted"}
      />
      <HeroCard
        label="Active courses"
        value={stats.classrooms.active.toLocaleString()}
        accent="muted"
        helper={`${stats.classrooms.archived.toLocaleString()} archived`}
        href={adminWorkflowRoutes.records}
      />
      <HeroCard
        label="Students"
        value={stats.students.total.toLocaleString()}
        accent="muted"
        helper={`${stats.students.active.toLocaleString()} active · ${stats.students.blocked.toLocaleString()} blocked`}
        href={adminWorkflowRoutes.users}
      />
    </div>
  )
}

type HeroAccent = "primary" | "danger" | "warning" | "muted"

function HeroCard(props: {
  label: string
  value: string
  helper: string
  accent: HeroAccent
  href?: string | undefined
  cta?: string | undefined
  helperTone?: "success" | "danger" | "muted"
}) {
  const valueColor = colorForAccent(props.accent)
  const inner = (
    <div style={{ ...heroCardStyle, borderColor: borderColorForAccent(props.accent) }}>
      <span style={heroLabelStyle}>{props.label}</span>
      <span className="animate-count" style={{ ...heroValueStyle, color: valueColor }}>{props.value}</span>
      <span
        style={{
          ...heroHelperStyle,
          color:
            props.helperTone === "success"
              ? webTheme.colors.success
              : props.helperTone === "danger"
                ? webTheme.colors.danger
                : webTheme.colors.textMuted,
        }}
      >
        {props.helper}
      </span>
      {props.cta ? <span style={{ ...heroCtaStyle, color: valueColor }}>{props.cta}</span> : null}
    </div>
  )
  if (!props.href) return inner
  return (
    <Link href={props.href} style={{ textDecoration: "none" }}>
      {inner}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Phase 4A — Attendance overview pie/donut chart
// ---------------------------------------------------------------------------

const BRACKET_COLORS: Record<string, { fill: string; label: string }> = {
  ">=75%": { fill: "#4caf50", label: "≥ 75%" },
  "50-75%": { fill: "#ff9800", label: "50 – 75%" },
  "<50%": { fill: "#f44336", label: "< 50%" },
}

function AttendanceOverviewCard(props: { accessToken: string }) {
  const query = useQuery({
    queryKey: webWorkflowQueryKeys.adminDashboardAttendanceOverview(),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.getAdminDashboardAttendanceOverview(props.accessToken),
    staleTime: 60_000,
  })

  return (
    <Card>
      <h3 style={cardTitleStyle}>Attendance overview</h3>
      <p style={cardSubtitleStyle}>Student distribution by overall attendance bracket.</p>
      {query.isLoading ? (
        <p style={mutedTextStyle}>Loading…</p>
      ) : query.isError ? (
        <p style={{ color: webTheme.colors.danger }}>Failed to load overview.</p>
      ) : query.data && query.data.totalStudents > 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 8 }}>
          <DonutChart brackets={query.data.brackets} total={query.data.totalStudents} />
          <DonutLegend brackets={query.data.brackets} total={query.data.totalStudents} />
        </div>
      ) : (
        <p style={mutedTextStyle}>No attendance data yet.</p>
      )}
    </Card>
  )
}

function DonutChart(props: { brackets: readonly AdminDashboardAttendanceBracket[]; total: number }) {
  const size = 140
  const cx = size / 2
  const cy = size / 2
  const radius = 52
  const stroke = 18

  let cumAngle = -90
  const arcs = props.brackets
    .filter((b) => b.studentCount > 0)
    .map((b) => {
      const fraction = b.studentCount / props.total
      const angle = fraction * 360
      const startAngle = cumAngle
      cumAngle += angle
      return { bracket: b, startAngle, angle, fraction }
    })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Attendance donut chart">
      <title>Attendance overview</title>
      {arcs.map((arc) => {
        const colors = BRACKET_COLORS[arc.bracket.bracket]
        const startRad = (arc.startAngle * Math.PI) / 180
        const endRad = ((arc.startAngle + arc.angle) * Math.PI) / 180
        const x1 = cx + radius * Math.cos(startRad)
        const y1 = cy + radius * Math.sin(startRad)
        const x2 = cx + radius * Math.cos(endRad)
        const y2 = cy + radius * Math.sin(endRad)
        const largeArc = arc.angle > 180 ? 1 : 0
        const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`
        return (
          <path
            key={arc.bracket.bracket}
            d={d}
            fill="none"
            stroke={colors?.fill ?? "#ccc"}
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        )
      })}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fontSize={22}
        fontWeight={700}
        fill={webTheme.colors.text}
      >
        {props.total}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        fontSize={10}
        fill={webTheme.colors.textMuted}
      >
        students
      </text>
    </svg>
  )
}

function DonutLegend(props: { brackets: readonly AdminDashboardAttendanceBracket[]; total: number }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {props.brackets.map((b) => {
        const colors = BRACKET_COLORS[b.bracket]
        const pct = props.total > 0 ? Math.round((b.studentCount / props.total) * 100) : 0
        return (
          <div key={b.bracket} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: colors?.fill ?? "#ccc",
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                {colors?.label ?? b.bracket}
              </div>
              <div style={{ fontSize: 12, color: webTheme.colors.textMuted }}>
                {b.studentCount} students ({pct}%)
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Phase 4C — Today's branch attendance
// ---------------------------------------------------------------------------

function TodayBranchAttendanceCard(props: { accessToken: string }) {
  const query = useQuery({
    queryKey: webWorkflowQueryKeys.adminDashboardTodayBranchAttendance(),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.getAdminDashboardTodayBranchAttendance(props.accessToken),
    staleTime: 30_000,
  })

  return (
    <Card>
      <h3 style={cardTitleStyle}>Today's attendance by branch</h3>
      <p style={cardSubtitleStyle}>
        {query.data?.date
          ? `Live breakdown for ${new Date(query.data.date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
          : "Real-time attendance from today's sessions."}
      </p>
      {query.isLoading ? (
        <p style={mutedTextStyle}>Loading…</p>
      ) : query.isError ? (
        <p style={{ color: webTheme.colors.danger }}>Failed to load today's data.</p>
      ) : query.data && query.data.branches.length > 0 ? (
        <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
          {query.data.branches.map((row: AdminDashboardTodayBranchRow) => (
            <TodayBranchBar key={row.branch} row={row} />
          ))}
        </div>
      ) : (
        <p style={mutedTextStyle}>No attendance sessions conducted today.</p>
      )}
    </Card>
  )
}

function TodayBranchBar(props: { row: AdminDashboardTodayBranchRow }) {
  const { row } = props
  const pct = row.attendancePercent ?? 0
  const color =
    pct >= 85
      ? "#4caf50"
      : pct >= 70
        ? webTheme.colors.primary
        : pct >= 55
          ? "#ff9800"
          : "#f44336"

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span style={{ fontWeight: 600 }}>{row.branch}</span>
        <span style={{ color: webTheme.colors.textMuted, fontSize: 12 }}>
          {row.attendancePercent === null ? "—" : `${row.attendancePercent}%`} · {row.presentCount}/{row.totalCount}
        </span>
      </div>
      <div
        style={{
          marginTop: 4,
          height: 10,
          borderRadius: 6,
          background: webTheme.colors.surfaceMuted,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.max(2, Math.min(100, pct))}%`,
            height: "100%",
            borderRadius: 6,
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
            transition: "width 300ms ease",
          }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sessions trend — small SVG line chart with range tabs.
// ---------------------------------------------------------------------------

function SessionsTrendCard(props: { accessToken: string }) {
  const [range, setRange] = useState<AdminDashboardSessionsRange>("weekly")

  const query = useQuery({
    queryKey: webWorkflowQueryKeys.adminDashboardSessionsGraph(range),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.getAdminDashboardSessionsGraph(props.accessToken, { range }),
    staleTime: 60_000,
  })

  return (
    <Card>
      <div style={cardHeaderRowStyle}>
        <div>
          <h3 style={cardTitleStyle}>Sessions trend</h3>
          <p style={cardSubtitleStyle}>
            {query.data
              ? `${query.data.totalSessions.toLocaleString()} sessions in this range`
              : "Conducted attendance sessions over time"}
          </p>
        </div>
        <div role="tablist" aria-label="Sessions range" style={tabsStyle}>
          {(["weekly", "monthly", "yearly"] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={range === r}
              onClick={() => setRange(r)}
              style={{
                ...tabButtonStyle,
                color: range === r ? webTheme.colors.primary : webTheme.colors.textMuted,
                background: range === r ? webTheme.colors.surfaceHero : "transparent",
                borderColor: range === r ? webTheme.colors.borderStrong : "transparent",
              }}
            >
              {r === "weekly" ? "7d" : r === "monthly" ? "4w" : "12mo"}
            </button>
          ))}
        </div>
      </div>
      {query.isLoading ? (
        <p style={mutedTextStyle}>Loading sessions…</p>
      ) : query.isError ? (
        <p style={{ color: webTheme.colors.danger }}>Failed to load sessions trend.</p>
      ) : query.data ? (
        <SessionsLineChart points={query.data.points} />
      ) : null}
    </Card>
  )
}

function SessionsLineChart(props: { points: readonly AdminDashboardSessionsGraphPoint[] }) {
  const { points } = props
  const width = 560
  const height = 180
  const padX = 28
  const padY = 24

  if (points.length === 0) {
    return <p style={mutedTextStyle}>No sessions in this range.</p>
  }

  const max = Math.max(1, ...points.map((p) => p.sessionCount))
  const stepX = (width - padX * 2) / Math.max(1, points.length - 1)

  const coords = points.map((p, i) => {
    const x = padX + stepX * i
    const y = height - padY - ((height - padY * 2) * p.sessionCount) / max
    return { x, y, point: p }
  })
  const linePath = buildSmoothPath(coords)
  const areaPath = `${linePath} L${coords[coords.length - 1]?.x ?? padX},${height - padY} L${coords[0]?.x ?? padX},${height - padY} Z`

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label="Sessions trend line chart"
      >
        <title>Sessions trend</title>
        <defs>
          <linearGradient id="sessionAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.03} />
          </linearGradient>
          <linearGradient id="sessionLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={padX}
            x2={width - padX}
            y1={padY + (height - padY * 2) * t}
            y2={padY + (height - padY * 2) * t}
            stroke={webTheme.colors.border}
            strokeDasharray="3 4"
            strokeWidth={1}
          />
        ))}
        <path d={areaPath} fill="url(#sessionAreaGrad)" />
        <path
          d={linePath}
          fill="none"
          stroke="url(#sessionLineGrad)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((c) => (
          <g key={c.point.bucketStart}>
            <circle cx={c.x} cy={c.y} r={3} fill="#3b82f6" />
            <text
              x={c.x}
              y={height - 6}
              textAnchor="middle"
              fontSize={10}
              fill={webTheme.colors.textMuted}
            >
              {c.point.label}
            </text>
            {c.point.sessionCount > 0 ? (
              <text
                x={c.x}
                y={c.y - 8}
                textAnchor="middle"
                fontSize={10}
                fontWeight={600}
                fill={webTheme.colors.text}
              >
                {c.point.sessionCount}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Branch comparison — horizontal bars
// ---------------------------------------------------------------------------

function BranchComparisonCard(props: { accessToken: string }) {
  const query = useQuery({
    queryKey: webWorkflowQueryKeys.adminDashboardBranchComparison(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.getAdminDashboardBranchComparison(props.accessToken),
    staleTime: 60_000,
  })

  return (
    <Card>
      <h3 style={cardTitleStyle}>Branch comparison</h3>
      <p style={cardSubtitleStyle}>Average attendance per branch.</p>
      {query.isLoading ? (
        <p style={mutedTextStyle}>Loading…</p>
      ) : query.isError ? (
        <p style={{ color: webTheme.colors.danger }}>Failed to load branches.</p>
      ) : query.data && query.data.branches.length > 0 ? (
        <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
          {query.data.branches.slice(0, 8).map((row) => (
            <BranchBar
              key={row.branch}
              label={row.branch}
              percent={row.averageAttendancePercent}
              students={row.studentCount}
            />
          ))}
        </div>
      ) : (
        <p style={mutedTextStyle}>No attendance data yet.</p>
      )}
    </Card>
  )
}

function BranchBar(props: {
  label: string
  percent: number | null
  students: number
}) {
  const pct = props.percent ?? 0
  const color =
    pct >= 85
      ? webTheme.colors.success
      : pct >= 70
        ? webTheme.colors.primary
        : pct >= 55
          ? webTheme.colors.warning
          : webTheme.colors.danger

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span style={{ fontWeight: 600 }}>{props.label}</span>
        <span style={{ color: webTheme.colors.textMuted, fontSize: 12 }}>
          {props.percent === null ? "—" : `${props.percent}%`} · {props.students} students
        </span>
      </div>
      <div
        style={{
          marginTop: 4,
          height: 8,
          borderRadius: 6,
          background: webTheme.colors.surfaceMuted,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.max(2, Math.min(100, pct))}%`,
            height: "100%",
            background: color,
            transition: "width 200ms ease",
          }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Course leaderboard — bottom 5 by default (most actionable)
// ---------------------------------------------------------------------------

function CourseLeaderboardCard(props: { accessToken: string }) {
  const [direction, setDirection] = useState<"top" | "bottom">("bottom")
  const query = useQuery({
    queryKey: webWorkflowQueryKeys.adminDashboardLeaderboard(direction),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.getAdminDashboardLeaderboard(props.accessToken, {
        direction,
        limit: 5,
      }),
    staleTime: 60_000,
  })

  return (
    <Card>
      <div style={cardHeaderRowStyle}>
        <div>
          <h3 style={cardTitleStyle}>
            {direction === "bottom" ? "Lowest-attendance courses" : "Top-attendance courses"}
          </h3>
          <p style={cardSubtitleStyle}>
            {direction === "bottom"
              ? "Most actionable: review these courses for intervention."
              : "Where engagement is strongest right now."}
          </p>
        </div>
        <div role="tablist" aria-label="Leaderboard direction" style={tabsStyle}>
          <button
            type="button"
            role="tab"
            aria-selected={direction === "bottom"}
            onClick={() => setDirection("bottom")}
            style={{
              ...tabButtonStyle,
              color: direction === "bottom" ? webTheme.colors.danger : webTheme.colors.textMuted,
              background: direction === "bottom" ? webTheme.colors.dangerSoft : "transparent",
              borderColor: direction === "bottom" ? webTheme.colors.dangerBorder : "transparent",
            }}
          >
            Bottom 5
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={direction === "top"}
            onClick={() => setDirection("top")}
            style={{
              ...tabButtonStyle,
              color: direction === "top" ? webTheme.colors.primary : webTheme.colors.textMuted,
              background: direction === "top" ? webTheme.colors.surfaceHero : "transparent",
              borderColor: direction === "top" ? webTheme.colors.borderStrong : "transparent",
            }}
          >
            Top 5
          </button>
        </div>
      </div>

      {query.isLoading ? (
        <p style={mutedTextStyle}>Loading…</p>
      ) : query.isError ? (
        <p style={{ color: webTheme.colors.danger }}>Failed to load leaderboard.</p>
      ) : query.data && query.data.entries.length > 0 ? (
        <div style={leaderboardListStyle}>
          {query.data.entries.map((entry, idx) => (
            <LeaderboardRow key={entry.courseOfferingId} entry={entry} rank={idx + 1} />
          ))}
        </div>
      ) : (
        <p style={mutedTextStyle}>Not enough attendance data yet.</p>
      )}
    </Card>
  )
}

function LeaderboardRow(props: {
  entry: AdminDashboardLeaderboardEntry
  rank: number
}) {
  const { entry, rank } = props
  const pct = entry.averageAttendancePercent
  const tone =
    pct >= 85
      ? webTheme.colors.success
      : pct >= 70
        ? webTheme.colors.primary
        : pct >= 55
          ? webTheme.colors.warning
          : webTheme.colors.danger

  return (
    <div style={leaderboardRowStyle}>
      <span style={leaderboardRankStyle}>{rank}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          {entry.code ? `${entry.code} · ` : ""}
          {entry.displayTitle}
        </div>
        <div style={{ fontSize: 12, color: webTheme.colors.textMuted }}>
          {entry.teacherName} · {entry.studentCount} students · {entry.sessionsConducted} sessions
        </div>
      </div>
      <InlineBar percent={pct} color={tone} />
      <span style={{ fontWeight: 700, fontSize: 16, color: tone, minWidth: 42, textAlign: "right" }}>{pct}%</span>
    </div>
  )
}

function InlineBar(props: { percent: number; color: string }) {
  return (
    <div
      style={{
        width: 60,
        height: 8,
        borderRadius: 4,
        background: webTheme.colors.surfaceMuted,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: `${Math.max(2, Math.min(100, props.percent))}%`,
          height: "100%",
          borderRadius: 4,
          background: props.color,
          transition: "width 200ms ease",
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recent security events
// ---------------------------------------------------------------------------

function RecentSecurityCard(props: {
  events: AdminDashboardStats["recentSecurityEvents"]
}) {
  return (
    <Card>
      <h3 style={cardTitleStyle}>Recent security events</h3>
      <p style={cardSubtitleStyle}>Five most recent flags from across the institution.</p>
      <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
        {props.events.slice(0, 5).map((event) => (
          <div key={event.id} style={securityRowStyle}>
            <span style={securityBadgeStyle}>{formatEventType(event.eventType)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{event.userDisplayName}</div>
              <div style={{ fontSize: 11, color: webTheme.colors.textMuted }}>
                {event.userEmail}
              </div>
            </div>
            <span style={{ fontSize: 11, color: webTheme.colors.textMuted }}>
              {new Date(event.createdAt).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function formatEventType(eventType: string): string {
  return eventType
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function Card(props: { children: React.ReactNode }) {
  return <section className="animate-scale-in" style={cardStyle}>{props.children}</section>
}

function colorForAccent(accent: HeroAccent): string {
  switch (accent) {
    case "primary":
      return webTheme.colors.primary
    case "danger":
      return webTheme.colors.danger
    case "warning":
      return webTheme.colors.warning
    case "muted":
      return webTheme.colors.text
  }
}

function borderColorForAccent(accent: HeroAccent): string {
  switch (accent) {
    case "primary":
      return webTheme.colors.borderStrong
    case "danger":
      return webTheme.colors.dangerBorder
    case "warning":
      return webTheme.colors.warning
    case "muted":
      return webTheme.colors.border
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const pageTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 700,
  color: webTheme.colors.text,
  letterSpacing: "-0.02em",
}

const pageSubtitleStyle: React.CSSProperties = {
  margin: "4px 0 0",
  fontSize: 14,
  color: webTheme.colors.textMuted,
}

const heroGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
}

const heroCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  borderRadius: 14,
  border: `1px solid ${webTheme.colors.border}`,
  background: webTheme.colors.surfaceRaised,
  padding: "18px 18px 16px",
  minHeight: 116,
}

const heroLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: webTheme.colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
}

const heroValueStyle: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  lineHeight: 1.1,
}

const heroHelperStyle: React.CSSProperties = {
  fontSize: 12,
  marginTop: 2,
}

const heroCtaStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  marginTop: 4,
}

const twoColumnStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
}

const cardStyle: React.CSSProperties = {
  borderRadius: 14,
  border: `1px solid ${webTheme.colors.border}`,
  background: webTheme.colors.surfaceRaised,
  padding: 22,
}

const cardHeaderRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 12,
  flexWrap: "wrap",
}

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 600,
  color: webTheme.colors.text,
}

const cardSubtitleStyle: React.CSSProperties = {
  margin: "2px 0 0",
  fontSize: 12,
  color: webTheme.colors.textMuted,
}

const tabsStyle: React.CSSProperties = {
  display: "inline-flex",
  gap: 4,
  padding: 3,
  borderRadius: 10,
  background: webTheme.colors.surfaceMuted,
}

const tabButtonStyle: React.CSSProperties = {
  border: "1px solid transparent",
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 8,
  cursor: "pointer",
  transition: "all 120ms ease",
}

const leaderboardListStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
}

const leaderboardRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "10px 12px",
  borderRadius: 10,
  background: webTheme.colors.surfaceMuted,
}

const leaderboardRankStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  background: webTheme.colors.surfaceHero,
  color: webTheme.colors.primary,
  fontSize: 11,
  fontWeight: 700,
  flexShrink: 0,
}

const securityRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 12px",
  borderRadius: 10,
  background: webTheme.colors.surfaceMuted,
}

const securityBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  borderRadius: 6,
  padding: "3px 8px",
  fontSize: 11,
  fontWeight: 600,
  background: webTheme.colors.surfaceHero,
  color: webTheme.colors.primary,
  flexShrink: 0,
}

const mutedTextStyle: React.CSSProperties = {
  fontSize: 13,
  color: webTheme.colors.textMuted,
  margin: "8px 0",
}

// ---------------------------------------------------------------------------
// SVG helpers
// ---------------------------------------------------------------------------

function buildSmoothPath(
  coords: readonly { x: number; y: number }[],
): string {
  if (coords.length === 0) return ""
  if (coords.length === 1) return `M${coords[0]!.x},${coords[0]!.y}`
  if (coords.length === 2) {
    return `M${coords[0]!.x},${coords[0]!.y} L${coords[1]!.x},${coords[1]!.y}`
  }

  let d = `M${coords[0]!.x},${coords[0]!.y}`
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1]!
    const curr = coords[i]!
    const tension = 0.3
    const cpx1 = prev.x + (curr.x - prev.x) * tension
    const cpx2 = curr.x - (curr.x - prev.x) * tension
    d += ` C${cpx1},${prev.y} ${cpx2},${curr.y} ${curr.x},${curr.y}`
  }
  return d
}
