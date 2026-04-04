"use client"

import type { AdminDashboardStats } from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"

import { adminWorkflowRoutes, webWorkflowQueryKeys } from "../web-workflows"
import { bootstrap, styles } from "./shared"

export function AdminDashboardWorkspace(props: { accessToken: string | null }) {
  const statsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminDashboardStats(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.getAdminDashboardStats(props.accessToken ?? ""),
    refetchInterval: 60_000,
  })

  return (
    <div style={styles.grid}>
      <div>
        <h2 style={headingStyle}>Dashboard</h2>
        <p style={subtitleStyle}>Overview of your institution at a glance.</p>
      </div>

      {statsQuery.isLoading ? (
        <p style={subtitleStyle}>Loading stats...</p>
      ) : statsQuery.isError ? (
        <p style={{ color: webTheme.colors.danger }}>
          Failed to load dashboard stats. Please try again.
        </p>
      ) : statsQuery.data ? (
        <DashboardContent stats={statsQuery.data} />
      ) : null}
    </div>
  )
}

function DashboardContent(props: { stats: AdminDashboardStats }) {
  const { stats } = props

  return (
    <>
      <div style={statGridStyle}>
        <StatCard
          label="Total Students"
          value={stats.students.total}
          href={adminWorkflowRoutes.students}
        />
        <StatCard
          label="Active Students"
          value={stats.students.active}
          color={webTheme.colors.success}
        />
        <StatCard
          label="Blocked Students"
          value={stats.students.blocked}
          color={webTheme.colors.danger}
        />
        <StatCard
          label="Pending Students"
          value={stats.students.pending}
          color={webTheme.colors.warning}
        />
      </div>

      <div style={statGridStyle}>
        <StatCard
          label="Total Teachers"
          value={stats.teachers.total}
          href={adminWorkflowRoutes.teachers}
        />
        <StatCard
          label="Active Classrooms"
          value={stats.classrooms.active}
          href={adminWorkflowRoutes.classrooms}
        />
        <StatCard
          label="Active Semesters"
          value={stats.semesters.active}
          href={adminWorkflowRoutes.semesters}
        />
        <StatCard
          label="Pending Device Requests"
          value={stats.pendingDeviceRequests}
          href={adminWorkflowRoutes.devices}
          color={stats.pendingDeviceRequests > 0 ? webTheme.colors.warning : undefined}
        />
      </div>

      <div style={quickActionsStyle}>
        <h3 style={sectionTitleStyle}>Quick Actions</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <QuickAction label="Manage Students" href={adminWorkflowRoutes.students} />
          <QuickAction label="View Teachers" href={adminWorkflowRoutes.teachers} />
          <QuickAction label="Review Devices" href={adminWorkflowRoutes.devices} />
          <QuickAction label="Manage Semesters" href={adminWorkflowRoutes.semesters} />
        </div>
      </div>

      {stats.recentSecurityEvents.length > 0 ? (
        <div style={sectionCardStyle}>
          <h3 style={sectionTitleStyle}>Recent Security Events</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Event</th>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Time</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentSecurityEvents.map((event) => (
                <tr key={event.id}>
                  <td style={styles.td}>
                    <span style={eventBadgeStyle}>{formatEventType(event.eventType)}</span>
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 600 }}>{event.userDisplayName}</div>
                    <div style={{ fontSize: 12, color: webTheme.colors.textMuted }}>
                      {event.userEmail}
                    </div>
                  </td>
                  <td style={{ ...styles.td, fontSize: 13, color: webTheme.colors.textMuted }}>
                    {new Date(event.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  )
}

function StatCard(props: {
  label: string
  value: number
  color?: string | undefined
  href?: string | undefined
}) {
  const card = (
    <div style={statCardStyle}>
      <div style={statLabelStyle}>{props.label}</div>
      <div style={{ ...statValueStyle, color: props.color ?? webTheme.colors.text }}>
        {props.value.toLocaleString()}
      </div>
    </div>
  )

  if (props.href) {
    return (
      <Link href={props.href} style={{ textDecoration: "none" }}>
        {card}
      </Link>
    )
  }

  return card
}

function QuickAction(props: { label: string; href: string }) {
  return (
    <Link href={props.href} style={quickActionButtonStyle}>
      {props.label}
    </Link>
  )
}

function formatEventType(eventType: string): string {
  return eventType
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const headingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 700,
  color: webTheme.colors.text,
  letterSpacing: "-0.02em",
}

const subtitleStyle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 15,
  color: webTheme.colors.textMuted,
  lineHeight: 1.5,
}

const statGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
}

const statCardStyle: React.CSSProperties = {
  borderRadius: 14,
  border: `1px solid ${webTheme.colors.border}`,
  background: webTheme.colors.surfaceRaised,
  padding: "20px 18px",
  transition: `all ${webTheme.animation.normal} ${webTheme.animation.easing}`,
}

const statLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: webTheme.colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 8,
}

const statValueStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  letterSpacing: "-0.02em",
}

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: 16,
  fontWeight: 600,
  color: webTheme.colors.text,
}

const sectionCardStyle: React.CSSProperties = {
  borderRadius: 14,
  border: `1px solid ${webTheme.colors.border}`,
  background: webTheme.colors.surfaceRaised,
  padding: 22,
}

const quickActionsStyle: React.CSSProperties = {
  ...sectionCardStyle,
}

const quickActionButtonStyle: React.CSSProperties = {
  display: "inline-block",
  borderRadius: 10,
  border: `1px solid ${webTheme.colors.border}`,
  background: webTheme.colors.surfaceRaised,
  padding: "10px 18px",
  fontSize: 13,
  fontWeight: 600,
  color: webTheme.colors.accent,
  textDecoration: "none",
  transition: `all ${webTheme.animation.normal} ${webTheme.animation.easing}`,
}

const eventBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  borderRadius: 8,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 600,
  background: webTheme.colors.surfaceMuted,
  color: webTheme.colors.text,
}
