export type MobileCopyTone = "neutral" | "positive" | "warning" | "critical"
export type MobileColorScheme = "light" | "dark"

const disallowedMobileTerms = [
  "shell",
  "foundation",
  "readiness",
  "local verification",
  "live api",
  "route ready",
  "bootstrap",
] as const

// ── Palette tokens (shared across themes) ──
const palette = {
  // Brand
  indigo: "#6366F1",
  indigoLight: "#818CF8",
  indigoDark: "#4F46E5",
  teal: "#14B8A6",
  tealLight: "#2DD4BF",
  tealDark: "#0D9488",
  coral: "#F87171",
  coralDark: "#EF4444",
  amber: "#FBBF24",
  amberDark: "#F59E0B",
  emerald: "#34D399",
  emeraldDark: "#10B981",
  white: "#FFFFFF",
  black: "#000000",
} as const

const lightColors = {
  primary: palette.indigo,
  primaryStrong: palette.indigoDark,
  primarySoft: "rgba(99, 102, 241, 0.08)",
  primaryContrast: palette.white,
  accent: palette.teal,
  accentSoft: "rgba(20, 184, 166, 0.08)",
  surface: "#F8FAFC",
  surfaceRaised: palette.white,
  surfaceMuted: "#F1F5F9",
  surfaceTint: "#EEF2FF",
  surfaceHero: "#EEF2FF",
  surfaceGlass: "rgba(255, 255, 255, 0.85)",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  borderAccent: "rgba(99, 102, 241, 0.25)",
  text: "#0F172A",
  textMuted: "#475569",
  textSubtle: "#94A3B8",
  success: palette.emeraldDark,
  successSoft: "rgba(16, 185, 129, 0.08)",
  successBorder: "rgba(16, 185, 129, 0.2)",
  warning: palette.amberDark,
  warningSoft: "rgba(245, 158, 11, 0.08)",
  warningBorder: "rgba(245, 158, 11, 0.2)",
  danger: palette.coralDark,
  dangerSoft: "rgba(239, 68, 68, 0.07)",
  dangerBorder: "rgba(239, 68, 68, 0.2)",
  tabBar: palette.white,
  tabActive: palette.indigo,
  tabInactive: "#94A3B8",
  overlay: "rgba(15, 23, 42, 0.4)",
  gradient1: "#EEF2FF",
  gradient2: "#E0E7FF",
  gradient3: "#F8FAFC",
} as const

const darkColors = {
  primary: palette.indigoLight,
  primaryStrong: palette.indigo,
  primarySoft: "rgba(129, 140, 248, 0.12)",
  primaryContrast: palette.white,
  accent: palette.tealLight,
  accentSoft: "rgba(45, 212, 191, 0.12)",
  surface: "#0F172A",
  surfaceRaised: "#1E293B",
  surfaceMuted: "#1E293B",
  surfaceTint: "#1E293B",
  surfaceHero: "rgba(99, 102, 241, 0.12)",
  surfaceGlass: "rgba(30, 41, 59, 0.85)",
  border: "rgba(148, 163, 184, 0.12)",
  borderStrong: "rgba(148, 163, 184, 0.2)",
  borderAccent: "rgba(129, 140, 248, 0.3)",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  textSubtle: "#64748B",
  success: palette.emerald,
  successSoft: "rgba(52, 211, 153, 0.12)",
  successBorder: "rgba(52, 211, 153, 0.25)",
  warning: palette.amber,
  warningSoft: "rgba(251, 191, 36, 0.12)",
  warningBorder: "rgba(251, 191, 36, 0.25)",
  danger: palette.coral,
  dangerSoft: "rgba(248, 113, 113, 0.12)",
  dangerBorder: "rgba(248, 113, 113, 0.25)",
  tabBar: "#0F172A",
  tabActive: palette.indigoLight,
  tabInactive: "#64748B",
  overlay: "rgba(0, 0, 0, 0.6)",
  gradient1: "#1E293B",
  gradient2: "rgba(99, 102, 241, 0.08)",
  gradient3: "#0F172A",
} as const

export type MobileColors = { readonly [K in keyof typeof lightColors]: string }

let _scheme: MobileColorScheme = "light"

/** Set the active color scheme. Call once from root layout. */
export function setMobileColorScheme(scheme: MobileColorScheme) {
  _scheme = scheme
}

/** Get current active color scheme */
export function getMobileColorScheme(): MobileColorScheme {
  return _scheme
}

/** Get the colors for the active scheme */
export function getColors(): MobileColors {
  return _scheme === "dark" ? darkColors : lightColors
}

/**
 * Static theme object — uses light colors by default.
 * For dynamic theme-aware rendering, call getColors() instead.
 */
export const mobileTheme = {
  colors: lightColors,
  darkColors,
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
      shadowColor: "#6366F1",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    soft: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    glow: {
      shadowColor: "#6366F1",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 6,
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
