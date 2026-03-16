import { StyleSheet } from "react-native"

import { type MobileColors, getColors, mobileTheme } from "./index"

/** Build animated styles for the given color set */
export function buildAnimatedStyles(c: MobileColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surfaceRaised,
      borderRadius: mobileTheme.radius.card,
      padding: mobileTheme.spacing.xl,
      gap: mobileTheme.spacing.md,
      borderWidth: 1,
      borderColor: c.border,
      ...mobileTheme.shadow.soft,
    },
    glow: {
      ...mobileTheme.shadow.glow,
      borderColor: c.borderAccent,
    },
    glass: {
      backgroundColor: c.surfaceGlass,
      borderRadius: mobileTheme.radius.card,
      padding: mobileTheme.spacing.xl,
      gap: mobileTheme.spacing.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    gradientHeader: {
      paddingHorizontal: mobileTheme.spacing.xl,
      paddingTop: mobileTheme.spacing.xxxl,
      paddingBottom: mobileTheme.spacing.xl,
      gap: mobileTheme.spacing.sm,
      borderRadius: mobileTheme.radius.card,
    },
    eyebrow: {
      color: c.primary,
      fontSize: mobileTheme.typography.eyebrow,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1.5,
    },
    heroTitle: {
      color: c.text,
      fontSize: mobileTheme.typography.hero,
      fontWeight: "800",
      lineHeight: 40,
    },
    subtitle: {
      color: c.textMuted,
      fontSize: mobileTheme.typography.body,
      lineHeight: 24,
    },
    statCard: {
      minWidth: "47%",
      flexGrow: 1,
      borderRadius: mobileTheme.radius.card,
      backgroundColor: c.surfaceTint,
      padding: mobileTheme.spacing.lg,
      gap: 4,
      borderWidth: 1,
      borderColor: c.border,
    },
    statLabel: {
      color: c.textSubtle,
      fontSize: mobileTheme.typography.eyebrow,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    statValue: {
      fontSize: mobileTheme.typography.title,
      fontWeight: "800",
    },
    chip: {
      borderRadius: mobileTheme.radius.chip,
      paddingHorizontal: mobileTheme.spacing.lg,
      paddingVertical: mobileTheme.spacing.sm,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceRaised,
    },
    chipPrimary: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    chipLabel: {
      color: c.text,
      fontSize: mobileTheme.typography.bodySmall,
      fontWeight: "700",
    },
    chipLabelPrimary: {
      color: c.primaryContrast,
    },
    button: {
      borderRadius: mobileTheme.radius.button,
      paddingVertical: mobileTheme.spacing.lg,
      alignItems: "center" as const,
    },
    buttonPrimary: {
      backgroundColor: c.primary,
    },
    buttonSecondary: {
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
    },
    buttonDanger: {
      backgroundColor: c.danger,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonLabel: {
      fontSize: mobileTheme.typography.body,
      fontWeight: "700",
      color: c.text,
    },
    buttonLabelPrimary: {
      color: c.primaryContrast,
    },
    buttonLabelDanger: {
      color: "#fff",
    },
    skeleton: {
      borderRadius: mobileTheme.radius.sm,
      backgroundColor: c.surfaceTint,
    },
    pill: {
      borderRadius: mobileTheme.radius.chip,
      paddingHorizontal: mobileTheme.spacing.md,
      paddingVertical: 4,
      alignSelf: "flex-start" as const,
    },
    pillText: {
      fontSize: mobileTheme.typography.eyebrow,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
  })
}

/** Default styles (for static imports — uses getColors() at call time) */
export const animatedStyles = buildAnimatedStyles(getColors())
