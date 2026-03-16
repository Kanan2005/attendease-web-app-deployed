import { StyleSheet } from "react-native"

import { mobileTheme } from "./index"

export const animatedStyles = StyleSheet.create({
  card: {
    backgroundColor: mobileTheme.colors.surfaceRaised,
    borderRadius: mobileTheme.radius.card,
    padding: mobileTheme.spacing.xl,
    gap: mobileTheme.spacing.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    ...mobileTheme.shadow.card,
  },
  glow: {
    ...mobileTheme.shadow.glow,
    borderColor: mobileTheme.colors.borderAccent,
  },
  glass: {
    backgroundColor: mobileTheme.colors.surfaceGlass,
    borderRadius: mobileTheme.radius.card,
    padding: mobileTheme.spacing.xl,
    gap: mobileTheme.spacing.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  gradientHeader: {
    paddingHorizontal: mobileTheme.spacing.xl,
    paddingTop: mobileTheme.spacing.xxxl,
    paddingBottom: mobileTheme.spacing.xl,
    gap: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.card,
    ...mobileTheme.shadow.glow,
  },
  eyebrow: {
    color: mobileTheme.colors.primary,
    fontSize: mobileTheme.typography.eyebrow,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.typography.hero,
    fontWeight: "800",
    lineHeight: 40,
  },
  subtitle: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.typography.body,
    lineHeight: 24,
  },
  statCard: {
    minWidth: "47%",
    flexGrow: 1,
    borderRadius: mobileTheme.radius.card,
    backgroundColor: mobileTheme.colors.surfaceTint,
    padding: mobileTheme.spacing.lg,
    gap: 4,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  statLabel: {
    color: mobileTheme.colors.textSubtle,
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
    borderColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.surfaceRaised,
  },
  chipPrimary: {
    backgroundColor: mobileTheme.colors.primary,
    borderColor: mobileTheme.colors.primary,
  },
  chipLabel: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.typography.bodySmall,
    fontWeight: "700",
  },
  chipLabelPrimary: {
    color: mobileTheme.colors.primaryContrast,
  },
  button: {
    borderRadius: mobileTheme.radius.button,
    paddingVertical: mobileTheme.spacing.lg,
    alignItems: "center" as const,
  },
  buttonPrimary: {
    backgroundColor: mobileTheme.colors.primary,
  },
  buttonSecondary: {
    backgroundColor: mobileTheme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  buttonDanger: {
    backgroundColor: mobileTheme.colors.danger,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    fontSize: mobileTheme.typography.body,
    fontWeight: "700",
    color: mobileTheme.colors.text,
  },
  buttonLabelPrimary: {
    color: mobileTheme.colors.primaryContrast,
  },
  buttonLabelDanger: {
    color: "#fff",
  },
  skeleton: {
    borderRadius: mobileTheme.radius.sm,
    backgroundColor: mobileTheme.colors.surfaceTint,
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
