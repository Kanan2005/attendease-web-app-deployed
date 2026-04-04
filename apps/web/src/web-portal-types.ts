import type { AppRole } from "@attendease/contracts"

export type WebPortalScope = "teacher" | "admin"
export type WebPortalMetricTone = "primary" | "success" | "warning" | "danger"

export interface WebPortalSession {
  accessToken: string
  activeRole: AppRole
  availableRoles: AppRole[]
  displayName: string | null
  email: string | null
}

export interface WebPortalNavItem {
  href: string
  label: string
  description: string
}

export interface WebPortalMetric {
  label: string
  value: string
  tone: WebPortalMetricTone
}

export interface WebPortalQuickAction {
  href: string
  label: string
  description: string
}

export interface WebPortalSpotlightCard {
  href: string
  eyebrow: string
  title: string
  description: string
  ctaLabel: string
  tone: WebPortalMetricTone
}

export interface WebPortalSpotlightSection {
  title: string
  description: string
  cards: WebPortalSpotlightCard[]
}

export interface WebPortalTableShell {
  title: string
  description: string
  columns: string[]
  emptyMessage: string
}

export interface WebPortalChartShell {
  title: string
  description: string
  seriesLabels: string[]
}

export interface WebPortalPageModel {
  eyebrow: string
  title: string
  description: string
  metrics: WebPortalMetric[]
  actions: WebPortalQuickAction[]
  spotlightSections?: WebPortalSpotlightSection[]
  tables: WebPortalTableShell[]
  charts: WebPortalChartShell[]
  notes: string[]
}

export interface WebPortalAccessState {
  allowed: boolean
  title: string
  message: string
  loginHref: string
  loginLabel: string
}
export const webSessionCookieNames = {
  accessToken: "attendease_web_access_token",
  refreshToken: "attendease_web_refresh_token",
  activeRole: "attendease_web_active_role",
  availableRoles: "attendease_web_available_roles",
  displayName: "attendease_web_display_name",
  email: "attendease_web_email",
} as const
