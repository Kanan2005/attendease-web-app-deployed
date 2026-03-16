import { webTheme } from "@attendease/ui-web"

export const shellStyles = {
  frame: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateRows: "64px minmax(0, 1fr)",
    background: webTheme.gradients.page,
  },
  topNav: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
    background: "rgba(13, 13, 13, 0.85)",
    backdropFilter: webTheme.blur.glass,
    WebkitBackdropFilter: webTheme.blur.glass,
    borderBottom: `1px solid ${webTheme.colors.border}`,
  },
  topNavLeft: {
    display: "flex",
    alignItems: "center",
    gap: 24,
  },
  topNavRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  body: {
    paddingTop: 64,
    padding: "96px 48px 56px",
    maxWidth: 1200,
    width: "100%",
    margin: "0 auto",
    display: "grid",
    gap: webTheme.spacing.lg,
    alignContent: "start",
  },
  surface: {
    borderRadius: webTheme.radius.card,
    background: webTheme.colors.surfaceRaised,
    border: `1px solid ${webTheme.colors.border}`,
    boxShadow: webTheme.shadow.card,
    padding: webTheme.spacing.lg,
    transition: `all ${webTheme.animation.normal} ${webTheme.animation.easing}`,
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
    fontSize: 32,
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  sectionDescription: {
    margin: 0,
    color: webTheme.colors.textMuted,
    maxWidth: 600,
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
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  },
  card: {
    padding: webTheme.spacing.lg,
  },
  label: {
    color: webTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: 8,
  },
  value: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
}

export const surfaceCardStyles = {
  margin: 0,
  color: webTheme.colors.textMuted,
  lineHeight: 1.6,
}
