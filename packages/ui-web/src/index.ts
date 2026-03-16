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
    primary: "#FFFFFF",
    primaryStrong: "#F5F5F5",
    primaryContrast: "#0D0D0D",
    accent: "#C9A96E",
    accentSoft: "rgba(201, 169, 110, 0.12)",
    surface: "#1A1A1A",
    surfaceRaised: "#1E1E1E",
    surfaceMuted: "#141414",
    surfaceTint: "#222222",
    surfaceHero: "#0D0D0D",
    border: "rgba(255, 255, 255, 0.08)",
    borderStrong: "rgba(255, 255, 255, 0.15)",
    text: "#FFFFFF",
    textMuted: "#A0A0A0",
    textSubtle: "#666666",
    success: "#34D399",
    successSoft: "rgba(52, 211, 153, 0.12)",
    successBorder: "rgba(52, 211, 153, 0.3)",
    warning: "#FBBF24",
    warningSoft: "rgba(251, 191, 36, 0.12)",
    warningBorder: "rgba(251, 191, 36, 0.3)",
    danger: "#F87171",
    dangerSoft: "rgba(248, 113, 113, 0.12)",
    dangerBorder: "rgba(248, 113, 113, 0.3)",
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
    card: 16,
    button: 12,
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
    card: "0 8px 32px rgba(0, 0, 0, 0.4)",
    hero: "0 16px 48px rgba(0, 0, 0, 0.6)",
  },
  gradients: {
    page: "linear-gradient(180deg, #0D0D0D 0%, #111111 50%, #0A0A0A 100%)",
    chart:
      "linear-gradient(135deg, rgba(201, 169, 110, 0.06) 0%, transparent 60%)",
  },
  animation: {
    fast: "0.15s",
    normal: "0.3s",
    slow: "0.5s",
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    spring: { type: "spring" as const, stiffness: 400, damping: 30 },
  },
  blur: {
    glass: "blur(20px)",
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
