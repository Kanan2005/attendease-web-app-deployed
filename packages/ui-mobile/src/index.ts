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
    primary: "#17181d",
    primaryStrong: "#0f1115",
    primaryContrast: "#fffaf2",
    accent: "#ea5b2a",
    accentSoft: "#fff0e6",
    surface: "#f6f1e8",
    surfaceRaised: "#fffaf2",
    surfaceMuted: "#f0e8db",
    surfaceTint: "#f7ede3",
    surfaceHero: "#efe3d3",
    border: "#e3d5c2",
    borderStrong: "#cfbaa1",
    text: "#1d1d1f",
    textMuted: "#6e6254",
    textSubtle: "#8d8273",
    success: "#1f7a4d",
    successSoft: "#edf8f1",
    successBorder: "#bfdcc9",
    warning: "#b4690e",
    warningSoft: "#fbf2e2",
    warningBorder: "#e8cb93",
    danger: "#b93815",
    dangerSoft: "#feeee7",
    dangerBorder: "#efb9a9",
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
  radius: {
    card: 28,
    button: 18,
    chip: 999,
  },
  typography: {
    eyebrow: 12,
    body: 16,
    bodySmall: 14,
    title: 28,
    hero: 38,
  },
  shadow: {
    card: "0 22px 52px rgba(35, 29, 24, 0.12)",
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
