import { webTheme } from "@attendease/ui-web"

export const shellStyles = {
  frame: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "264px minmax(0, 1fr)",
    background: webTheme.gradients.page,
  },
  sidebar: {
    borderRight: `1px solid ${webTheme.colors.border}`,
    padding: `${webTheme.spacing.xl}px ${webTheme.spacing.lg}px ${webTheme.spacing.xxl}px`,
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(18px)",
    display: "grid",
    alignContent: "start",
    gap: webTheme.spacing.lg,
  },
  body: {
    padding: `${webTheme.spacing.xl}px ${webTheme.spacing.xl}px 56px`,
    display: "grid",
    gap: webTheme.spacing.lg,
  },
  surface: {
    borderRadius: webTheme.radius.card,
    background: webTheme.colors.surfaceRaised,
    border: `1px solid ${webTheme.colors.border}`,
    boxShadow: webTheme.shadow.card,
    padding: webTheme.spacing.lg,
  },
} as const

export const sectionStyles = {
  rolePill: {
    margin: 0,
    color: webTheme.colors.accent,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontSize: 12,
  },
  sectionHeader: {
    margin: 0,
    color: webTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  sectionTitle: {
    margin: 0,
    color: webTheme.colors.text,
    fontSize: 20,
  },
  sectionTitleLarge: {
    margin: "0 0 12px",
    color: webTheme.colors.primary,
    fontSize: 36,
  },
  sectionDescription: {
    margin: 0,
    color: webTheme.colors.textMuted,
    maxWidth: 880,
    lineHeight: 1.6,
  },
  sectionMetaText: {
    margin: 0,
    color: webTheme.colors.textMuted,
    lineHeight: 1.5,
  },
  sectionLabel: {
    margin: 0,
    color: webTheme.colors.textMuted,
    fontSize: 14,
  },
}

export const metricStyles = {
  grid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  },
  card: {
    padding: webTheme.spacing.md,
  },
  label: {
    color: webTheme.colors.textMuted,
    fontSize: 14,
  },
  value: {
    margin: 0,
    fontSize: 26,
    fontWeight: 700,
  },
}

export const surfaceCardStyles = {
  margin: 0,
  color: webTheme.colors.textMuted,
  lineHeight: 1.6,
}
