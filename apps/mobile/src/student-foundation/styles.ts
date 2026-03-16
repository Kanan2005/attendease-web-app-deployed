import { mobileTheme } from "@attendease/ui-mobile"
import { StyleSheet } from "react-native"

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: mobileTheme.colors.surface,
  },
  screenContent: {
    paddingHorizontal: mobileTheme.spacing.xl,
    paddingTop: mobileTheme.spacing.lg,
    paddingBottom: mobileTheme.spacing.xxxl,
    gap: mobileTheme.spacing.lg,
  },
  headerBlock: {
    gap: mobileTheme.spacing.sm,
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingVertical: mobileTheme.spacing.xl,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    borderColor: mobileTheme.colors.borderAccent,
    backgroundColor: mobileTheme.colors.surfaceHero,
    ...mobileTheme.shadow.glow,
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
    fontSize: mobileTheme.typography.eyebrow,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: mobileTheme.colors.primary,
  },
  card: {
    backgroundColor: mobileTheme.colors.surfaceRaised,
    borderRadius: mobileTheme.radius.card,
    padding: mobileTheme.spacing.xl,
    gap: mobileTheme.spacing.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    ...mobileTheme.shadow.card,
  },
  cardTitle: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.typography.title,
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
    borderColor: mobileTheme.colors.borderAccent,
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
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
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
    backgroundColor: mobileTheme.colors.surfaceTint,
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingVertical: mobileTheme.spacing.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  navButtonLabel: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.typography.bodySmall,
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
    borderRadius: mobileTheme.radius.card,
    backgroundColor: mobileTheme.colors.surfaceTint,
    padding: mobileTheme.spacing.lg,
    gap: 4,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  metricLabel: {
    color: mobileTheme.colors.textSubtle,
    fontSize: mobileTheme.typography.eyebrow,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: mobileTheme.typography.title,
    fontWeight: "800",
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
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: mobileTheme.colors.border,
  },
  linkRow: {
    gap: 4,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: mobileTheme.colors.border,
  },
  selectionRow: {
    gap: 4,
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.surfaceRaised,
  },
  selectedRow: {
    borderColor: mobileTheme.colors.primary,
    backgroundColor: "rgba(0, 212, 170, 0.08)",
  },
  listTitle: {
    color: mobileTheme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  listMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.typography.caption,
    lineHeight: 18,
  },
  bodyText: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.typography.bodySmall,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.borderStrong,
    borderRadius: mobileTheme.radius.button,
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingVertical: mobileTheme.spacing.md,
    backgroundColor: mobileTheme.colors.surfaceMuted,
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.typography.body,
  },
  cameraPreviewFrame: {
    minHeight: 260,
    borderRadius: mobileTheme.radius.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: mobileTheme.colors.borderStrong,
    backgroundColor: mobileTheme.colors.surfaceMuted,
  },
  cameraPreview: {
    flex: 1,
    minHeight: 260,
  },
  primaryButton: {
    borderRadius: mobileTheme.radius.button,
    backgroundColor: mobileTheme.colors.primary,
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingVertical: mobileTheme.spacing.lg,
    alignItems: "center",
    ...mobileTheme.shadow.glow,
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
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingVertical: mobileTheme.spacing.lg,
    alignItems: "center",
  },
  secondaryButtonLabel: {
    color: mobileTheme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  statusCard: {
    borderRadius: mobileTheme.radius.card,
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
    fontSize: mobileTheme.typography.bodySmall,
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
    borderColor: mobileTheme.colors.borderAccent,
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
    fontSize: mobileTheme.typography.bodySmall,
    lineHeight: 20,
  },
  successText: {
    color: mobileTheme.colors.success,
    fontSize: mobileTheme.typography.bodySmall,
    lineHeight: 20,
  },
})
