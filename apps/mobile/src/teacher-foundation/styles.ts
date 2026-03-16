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
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusBanner: {
    borderRadius: mobileTheme.radius.card,
    padding: mobileTheme.spacing.lg,
    gap: 6,
    borderWidth: 1,
    ...mobileTheme.shadow.card,
  },
  statusBannerTitle: {
    color: mobileTheme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  primaryStatusBanner: {
    backgroundColor: mobileTheme.colors.surfaceHero,
    borderColor: mobileTheme.colors.borderAccent,
  },
  successStatusBanner: {
    backgroundColor: mobileTheme.colors.successSoft,
    borderColor: mobileTheme.colors.successBorder,
  },
  warningStatusBanner: {
    backgroundColor: mobileTheme.colors.warningSoft,
    borderColor: mobileTheme.colors.warningBorder,
  },
  dangerStatusBanner: {
    backgroundColor: mobileTheme.colors.dangerSoft,
    borderColor: mobileTheme.colors.dangerBorder,
  },
  navButton: {
    borderRadius: mobileTheme.radius.button,
    backgroundColor: mobileTheme.colors.surfaceTint,
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingVertical: mobileTheme.spacing.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  primaryNavButton: {
    borderRadius: mobileTheme.radius.button,
    backgroundColor: mobileTheme.colors.primary,
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingVertical: mobileTheme.spacing.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.primary,
  },
  navButtonLabel: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.typography.bodySmall,
    fontWeight: "700",
  },
  primaryNavButtonLabel: {
    color: mobileTheme.colors.primaryContrast,
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
  highlightCard: {
    gap: 6,
    borderRadius: mobileTheme.radius.card,
    backgroundColor: mobileTheme.colors.surfaceTint,
    padding: mobileTheme.spacing.lg,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  selectedRow: {
    borderRadius: mobileTheme.radius.button,
    backgroundColor: "rgba(0, 212, 170, 0.08)",
    paddingHorizontal: 12,
  },
  memberCard: {
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: mobileTheme.colors.border,
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
  sectionTitle: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.typography.bodySmall,
    fontWeight: "700",
  },
  sessionSection: {
    gap: 10,
    marginTop: 8,
  },
  sessionStudentCard: {
    gap: 6,
    borderRadius: mobileTheme.radius.card,
    backgroundColor: mobileTheme.colors.surfaceTint,
    padding: mobileTheme.spacing.lg,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  sessionStudentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  statusChip: {
    borderRadius: mobileTheme.radius.chip,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  primaryChip: {
    backgroundColor: mobileTheme.colors.surfaceHero,
  },
  successChip: {
    backgroundColor: mobileTheme.colors.successSoft,
  },
  warningChip: {
    backgroundColor: mobileTheme.colors.warningSoft,
  },
  dangerChip: {
    backgroundColor: mobileTheme.colors.dangerSoft,
  },
  statusChipText: {
    fontSize: mobileTheme.typography.eyebrow,
    fontWeight: "700",
    color: mobileTheme.colors.text,
  },
  pendingText: {
    color: mobileTheme.colors.primary,
    fontSize: mobileTheme.typography.caption,
    fontWeight: "600",
  },
  bodyText: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.typography.bodySmall,
    lineHeight: 20,
  },
  fieldLabel: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.typography.caption,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  optionGrid: {
    gap: 10,
  },
  selectionCard: {
    gap: 6,
    borderRadius: mobileTheme.radius.card,
    backgroundColor: mobileTheme.colors.surfaceRaised,
    padding: mobileTheme.spacing.lg,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  selectionCardActive: {
    backgroundColor: "rgba(0, 212, 170, 0.08)",
    borderColor: mobileTheme.colors.primary,
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
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  multilineInput: {
    minHeight: 110,
    textAlignVertical: "top",
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
  dangerButton: {
    borderRadius: mobileTheme.radius.button,
    backgroundColor: mobileTheme.colors.danger,
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingVertical: mobileTheme.spacing.lg,
    alignItems: "center",
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
  selectedActionButton: {
    borderColor: mobileTheme.colors.primary,
    backgroundColor: "rgba(0, 212, 170, 0.08)",
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledSecondaryButton: {
    opacity: 0.5,
  },
  statusCard: {
    borderRadius: mobileTheme.radius.card,
    padding: mobileTheme.spacing.lg,
    backgroundColor: mobileTheme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    gap: 8,
    alignItems: "flex-start",
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
