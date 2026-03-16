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
    primary: "#17181d",
    primaryStrong: "#0f1115",
    primaryContrast: "#fffaf2",
    accent: "#ea5b2a",
    accentSoft: "#fff0e6",
    surface: "#f7f1e7",
    surfaceRaised: "#fffaf2",
    surfaceMuted: "#f1eadf",
    surfaceTint: "#f8eee2",
    surfaceHero: "#efe1d0",
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
    danger: "#b42318",
    dangerSoft: "#feeee7",
    dangerBorder: "#efb9a9",
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  radius: {
    card: 30,
    button: 18,
    pill: 999,
  },
  typography: {
    eyebrow: 12,
    body: 16,
    bodySmall: 14,
    title: 34,
    hero: 48,
  },
  shadow: {
    card: "0 28px 64px rgba(35, 29, 24, 0.12)",
    hero: "0 32px 88px rgba(35, 29, 24, 0.16)",
  },
  gradients: {
    page: "radial-gradient(circle at top left, rgba(234, 91, 42, 0.12), transparent 34%), linear-gradient(180deg, #fbf6ef 0%, #f4eadc 100%)",
    chart:
      "radial-gradient(circle at top left, rgba(234, 91, 42, 0.18), transparent 44%), linear-gradient(180deg, #fbf6ef 0%, #f4eadc 100%)",
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
