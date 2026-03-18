export type WebCopyTone = "primary" | "success" | "warning" | "danger"

const disallowedWebTerms = [
  "shell",
  "foundation",
  "readiness",
  "local verification",
  "live api",
  "route ready",
  "prepared",
  "bootstrap",
] as const

export const webTheme = {
  colors: {
    primary: "var(--ae-primary)",
    primaryStrong: "var(--ae-primary-strong)",
    primaryContrast: "var(--ae-primary-contrast)",
    accent: "var(--ae-accent)",
    accentHover: "var(--ae-accent-hover)",
    accentSoft: "var(--ae-accent-soft)",
    accentBorder: "var(--ae-accent-border)",
    surface: "var(--ae-surface)",
    surfaceRaised: "var(--ae-surface-raised)",
    surfaceMuted: "var(--ae-surface-muted)",
    surfaceTint: "var(--ae-surface-tint)",
    surfaceHero: "var(--ae-surface-hero)",
    border: "var(--ae-border)",
    borderStrong: "var(--ae-border-strong)",
    text: "var(--ae-text)",
    textMuted: "var(--ae-text-muted)",
    textSubtle: "var(--ae-text-subtle)",
    success: "var(--ae-success)",
    successSoft: "var(--ae-success-soft)",
    successBorder: "var(--ae-success-border)",
    warning: "var(--ae-warning)",
    warningSoft: "var(--ae-warning-soft)",
    warningBorder: "var(--ae-warning-border)",
    danger: "var(--ae-danger)",
    dangerSoft: "var(--ae-danger-soft)",
    dangerBorder: "var(--ae-danger-border)",
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    card: 14,
    button: 10,
    pill: 999,
  },
  typography: {
    eyebrow: 11,
    body: 15,
    bodySmall: 13,
    title: 32,
    hero: 48,
  },
  shadow: {
    card: "var(--ae-shadow-card)",
    hero: "var(--ae-shadow-hero)",
    glow: "var(--ae-shadow-glow)",
  },
  gradients: {
    page: "var(--ae-gradient-page)",
    card: "var(--ae-gradient-card)",
    chart: "var(--ae-gradient-chart)",
    accentButton: "linear-gradient(135deg, #A78BFA 0%, #818CF8 100%)",
  },
  animation: {
    fast: "0.15s",
    normal: "0.25s",
    slow: "0.4s",
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    spring: { type: "spring" as const, stiffness: 400, damping: 30 },
  },
  blur: {
    glass: "blur(24px)",
    subtle: "blur(8px)",
  },
} as const

export const webContentRules = {
  maxTitleWords: 5,
  maxDescriptionWords: 24,
  disallowedTerms: disallowedWebTerms,
} as const

export function findWebContentIssues(text: string): string[] {
  const normalized = normalizeCopy(text)

  return disallowedWebTerms
    .filter((term) => normalized.includes(term))
    .map((term) => `Avoid "${term}" in web user-facing copy.`)
}

export function getWebToneColor(tone: WebCopyTone): string {
  switch (tone) {
    case "success":
      return webTheme.colors.success
    case "warning":
      return webTheme.colors.warning
    case "danger":
      return webTheme.colors.danger
    default:
      return webTheme.colors.primary
  }
}

function normalizeCopy(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim()
}
