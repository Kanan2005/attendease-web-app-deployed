import { webTheme } from "@attendease/ui-web"

export const shellStyles = {
  frame: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateRows: "60px minmax(0, 1fr)",
    background: webTheme.gradients.page,
  },
  topNav: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 28px",
    background: "var(--ae-nav-bg)",
    backdropFilter: webTheme.blur.glass,
    WebkitBackdropFilter: webTheme.blur.glass,
    borderBottom: `1px solid ${webTheme.colors.border}`,
  },
  topNavLeft: {
    display: "flex",
    alignItems: "center",
    gap: 20,
  },
  topNavRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  body: {
    paddingTop: 60,
    padding: "88px 40px 48px",
    maxWidth: 1120,
    width: "100%",
    margin: "0 auto",
    display: "grid",
    gap: webTheme.spacing.lg,
    alignContent: "start",
  },
  surface: {
    borderRadius: 16,
    background: "var(--ae-card-surface)",
    border: "1px solid var(--ae-card-border)",
    boxShadow: "var(--ae-card-shadow)",
    padding: webTheme.spacing.lg,
    transition: `all ${webTheme.animation.normal} ${webTheme.animation.easing}`,
    position: "relative" as const,
    overflow: "hidden" as const,
  },
} as const

export const sectionStyles = {
  rolePill: {
    margin: 0,
    color: webTheme.colors.accent,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontSize: 11,
  },
  sectionHeader: {
    margin: 0,
    color: webTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  sectionTitle: {
    margin: 0,
    color: webTheme.colors.text,
    fontSize: 20,
    fontWeight: 600,
  },
  sectionTitleLarge: {
    margin: "0 0 8px",
    color: webTheme.colors.primary,
    fontSize: 30,
    fontWeight: 700,
    letterSpacing: "-0.025em",
  },
  sectionDescription: {
    margin: 0,
    color: webTheme.colors.textMuted,
    maxWidth: 560,
    lineHeight: 1.6,
    fontSize: 15,
  },
  sectionMetaText: {
    margin: 0,
    color: webTheme.colors.textMuted,
    lineHeight: 1.5,
    fontSize: 14,
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
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  },
  card: {
    padding: webTheme.spacing.lg,
  },
  label: {
    color: webTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: 8,
  },
  value: {
    margin: 0,
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
}

export const surfaceCardStyles = {
  margin: 0,
  color: webTheme.colors.textMuted,
  lineHeight: 1.6,
}
