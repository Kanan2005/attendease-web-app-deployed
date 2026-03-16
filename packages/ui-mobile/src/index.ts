export type MobileCopyTone = "neutral" | "positive" | "warning" | "critical"

const disallowedMobileTerms = [
  "shell",
  "foundation",
  "readiness",
  "local verification",
  "live api",
  "route ready",
  "bootstrap",
] as const

export const mobileTheme = {
  colors: {
    // Core
    primary: "#00D4AA",
    primaryStrong: "#00E8BC",
    primaryContrast: "#0D0D0D",
    accent: "#FF6B6B",
    accentSoft: "rgba(255, 107, 107, 0.12)",

    // Surfaces (dark)
    surface: "#0D0D0D",
    surfaceRaised: "#1A1A2E",
    surfaceMuted: "#141422",
    surfaceTint: "#1E1E32",
    surfaceHero: "#16213E",
    surfaceGlass: "rgba(255, 255, 255, 0.06)",

    // Borders
    border: "rgba(255, 255, 255, 0.08)",
    borderStrong: "rgba(255, 255, 255, 0.15)",
    borderAccent: "rgba(0, 212, 170, 0.3)",

    // Typography
    text: "#F8F8F8",
    textMuted: "#A0A0B0",
    textSubtle: "#6C6C80",

    // Semantic
    success: "#00E676",
    successSoft: "rgba(0, 230, 118, 0.12)",
    successBorder: "rgba(0, 230, 118, 0.25)",
    warning: "#FFD600",
    warningSoft: "rgba(255, 214, 0, 0.12)",
    warningBorder: "rgba(255, 214, 0, 0.25)",
    danger: "#FF5252",
    dangerSoft: "rgba(255, 82, 82, 0.12)",
    dangerBorder: "rgba(255, 82, 82, 0.25)",

    // Tab bar
    tabBar: "#0D0D0D",
    tabActive: "#00D4AA",
    tabInactive: "#6C6C80",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  radius: {
    sm: 8,
    card: 16,
    button: 12,
    chip: 999,
    full: 9999,
  },
  typography: {
    eyebrow: 11,
    caption: 13,
    bodySmall: 14,
    body: 16,
    title: 22,
    hero: 32,
  },
  shadow: {
    card: {
      shadowColor: "#00D4AA",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    glow: {
      shadowColor: "#00D4AA",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 8,
    },
  },
} as const

export const mobileContentRules = {
  maxTitleWords: 5,
  maxDescriptionWords: 22,
  disallowedTerms: disallowedMobileTerms,
} as const

export function findMobileContentIssues(text: string): string[] {
  const normalized = normalizeCopy(text)

  return disallowedMobileTerms
    .filter((term) => normalized.includes(term))
    .map((term) => `Avoid "${term}" in mobile user-facing copy.`)
}

export function getMobileToneColor(tone: MobileCopyTone): string {
  switch (tone) {
    case "positive":
      return mobileTheme.colors.success
    case "warning":
      return mobileTheme.colors.warning
    case "critical":
      return mobileTheme.colors.danger
    default:
      return mobileTheme.colors.primary
  }
}

function normalizeCopy(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim()
}
