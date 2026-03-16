import { mobileTheme } from "@attendease/ui-mobile"
import { StyleSheet } from "react-native"

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: mobileTheme.colors.surface,
  },
  screenContent: {
    paddingHorizontal: mobileTheme.spacing.xl,
    paddingTop: mobileTheme.spacing.xl,
    paddingBottom: mobileTheme.spacing.xxl,
    gap: mobileTheme.spacing.lg,
  },
  headerBlock: {
    gap: mobileTheme.spacing.sm,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.surfaceRaised,
    shadowColor: mobileTheme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 18,
    },
    shadowOpacity: 0.08,
    shadowRadius: 28,
  },
  screenTitle: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.typography.hero,
    fontWeight: "800",
  },
  screenSubtitle: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.typography.body,
    lineHeight: 24,
  },
  cardEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: mobileTheme.colors.surfaceRaised,
    borderRadius: mobileTheme.radius.card,
    padding: mobileTheme.spacing.xl,
    gap: mobileTheme.spacing.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    shadowColor: mobileTheme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 18,
    },
    shadowOpacity: 0.09,
    shadowRadius: 32,
  },
  cardTitle: {
    color: mobileTheme.colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.typography.bodySmall,
    lineHeight: 22,
  },
  cardBody: {
    gap: 10,
  },
  spotlightPrimary: {
    borderColor: mobileTheme.colors.borderStrong,
    backgroundColor: mobileTheme.colors.surfaceHero,
  },
  spotlightSuccess: {
    borderColor: mobileTheme.colors.successBorder,
    backgroundColor: mobileTheme.colors.successSoft,
  },
  spotlightWarning: {
    borderColor: mobileTheme.colors.warningBorder,
    backgroundColor: mobileTheme.colors.warningSoft,
  },
  spotlightDanger: {
    borderColor: mobileTheme.colors.dangerBorder,
    backgroundColor: mobileTheme.colors.dangerSoft,
  },
  spotlightTitle: {
    color: mobileTheme.colors.text,
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 32,
  },
  spotlightMessage: {
    color: mobileTheme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  navButton: {
    borderRadius: mobileTheme.radius.button,
    backgroundColor: mobileTheme.colors.surfaceRaised,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  navButtonLabel: {
    color: mobileTheme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    minWidth: "47%",
    flexGrow: 1,
    borderRadius: 20,
    backgroundColor: mobileTheme.colors.surfaceTint,
    padding: mobileTheme.spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  metricLabel: {
    color: mobileTheme.colors.textSubtle,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  primaryTone: {
    color: mobileTheme.colors.primary,
  },
  successTone: {
    color: mobileTheme.colors.success,
  },
  warningTone: {
    color: mobileTheme.colors.warning,
  },
  dangerTone: {
    color: mobileTheme.colors.danger,
  },
  listRow: {
    gap: 4,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: mobileTheme.colors.border,
  },
  linkRow: {
    gap: 4,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: mobileTheme.colors.border,
  },
  selectionRow: {
    gap: 4,
    padding: mobileTheme.spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.surfaceRaised,
  },
  selectedRow: {
    borderColor: mobileTheme.colors.accent,
    backgroundColor: mobileTheme.colors.accentSoft,
  },
  listTitle: {
    color: mobileTheme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  listMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  bodyText: {
    color: mobileTheme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.borderStrong,
    borderRadius: mobileTheme.radius.button,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.md,
    backgroundColor: mobileTheme.colors.surfaceRaised,
    color: mobileTheme.colors.text,
  },
  cameraPreviewFrame: {
    minHeight: 260,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: mobileTheme.colors.borderStrong,
    backgroundColor: mobileTheme.colors.primary,
  },
  cameraPreview: {
    flex: 1,
    minHeight: 260,
  },
  primaryButton: {
    borderRadius: mobileTheme.radius.button,
    backgroundColor: mobileTheme.colors.primary,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryButtonLabel: {
    color: mobileTheme.colors.primaryContrast,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: mobileTheme.radius.button,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.surfaceRaised,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: 15,
    alignItems: "center",
  },
  secondaryButtonLabel: {
    color: mobileTheme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  statusCard: {
    borderRadius: 20,
    padding: mobileTheme.spacing.lg,
    backgroundColor: mobileTheme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    gap: mobileTheme.spacing.sm,
    alignItems: "flex-start",
  },
  compactStatusCard: {
    paddingVertical: 12,
  },
  statusText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  errorCard: {
    borderColor: mobileTheme.colors.dangerBorder,
    backgroundColor: mobileTheme.colors.dangerSoft,
  },
  emptyCard: {
    borderColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.surfaceTint,
  },
  infoCard: {
    borderColor: mobileTheme.colors.borderStrong,
    backgroundColor: mobileTheme.colors.surfaceHero,
  },
  successCard: {
    borderColor: mobileTheme.colors.successBorder,
    backgroundColor: mobileTheme.colors.successSoft,
  },
  warningCard: {
    borderColor: mobileTheme.colors.warningBorder,
    backgroundColor: mobileTheme.colors.warningSoft,
  },
  errorText: {
    color: mobileTheme.colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  successText: {
    color: mobileTheme.colors.success,
    fontSize: 14,
    lineHeight: 20,
  },
})
