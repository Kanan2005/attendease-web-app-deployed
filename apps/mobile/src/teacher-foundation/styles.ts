import {
  type MobileColors,
  getColors,
  getMobileColorScheme,
  mobileTheme,
} from "@attendease/ui-mobile"
import { StyleSheet } from "react-native"

export function buildTeacherStyles(c: MobileColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.surface,
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
      borderColor: c.borderAccent,
      backgroundColor: c.surfaceHero,
      ...mobileTheme.shadow.glow,
    },
    screenTitle: {
      color: c.text,
      fontSize: mobileTheme.typography.hero,
      fontWeight: "800",
    },
    screenSubtitle: {
      color: c.textMuted,
      fontSize: mobileTheme.typography.body,
      lineHeight: 24,
    },
    card: {
      backgroundColor: c.surfaceRaised,
      borderRadius: mobileTheme.radius.card,
      padding: mobileTheme.spacing.xl,
      gap: mobileTheme.spacing.md,
      borderWidth: 1,
      borderColor: c.border,
      ...mobileTheme.shadow.card,
    },
    cardTitle: {
      color: c.text,
      fontSize: mobileTheme.typography.title,
      fontWeight: "700",
    },
    cardSubtitle: {
      color: c.textMuted,
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
      color: c.text,
      fontSize: 18,
      fontWeight: "700",
    },
    primaryStatusBanner: {
      backgroundColor: c.surfaceHero,
      borderColor: c.borderAccent,
    },
    successStatusBanner: {
      backgroundColor: c.successSoft,
      borderColor: c.successBorder,
    },
    warningStatusBanner: {
      backgroundColor: c.warningSoft,
      borderColor: c.warningBorder,
    },
    dangerStatusBanner: {
      backgroundColor: c.dangerSoft,
      borderColor: c.dangerBorder,
    },
    navButton: {
      borderRadius: mobileTheme.radius.button,
      backgroundColor: c.surfaceTint,
      paddingHorizontal: mobileTheme.spacing.lg,
      paddingVertical: mobileTheme.spacing.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    primaryNavButton: {
      borderRadius: mobileTheme.radius.button,
      backgroundColor: c.primary,
      paddingHorizontal: mobileTheme.spacing.lg,
      paddingVertical: mobileTheme.spacing.md,
      borderWidth: 1,
      borderColor: c.primary,
    },
    navButtonLabel: {
      color: c.text,
      fontSize: mobileTheme.typography.bodySmall,
      fontWeight: "700",
    },
    primaryNavButtonLabel: {
      color: c.primaryContrast,
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
      backgroundColor: c.surfaceTint,
      padding: mobileTheme.spacing.lg,
      gap: 4,
      borderWidth: 1,
      borderColor: c.border,
    },
    metricLabel: {
      color: c.textSubtle,
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
      color: c.primary,
    },
    successTone: {
      color: c.success,
    },
    warningTone: {
      color: c.warning,
    },
    dangerTone: {
      color: c.danger,
    },
    listRow: {
      gap: 4,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    linkRow: {
      gap: 4,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    highlightCard: {
      gap: 6,
      borderRadius: mobileTheme.radius.card,
      backgroundColor: c.surfaceTint,
      padding: mobileTheme.spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    selectedRow: {
      borderRadius: mobileTheme.radius.button,
      backgroundColor: c.primarySoft,
      paddingHorizontal: 12,
    },
    memberCard: {
      gap: 6,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    listTitle: {
      color: c.text,
      fontSize: 15,
      fontWeight: "600",
    },
    listMeta: {
      color: c.textMuted,
      fontSize: mobileTheme.typography.caption,
      lineHeight: 18,
    },
    sectionTitle: {
      color: c.text,
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
      backgroundColor: c.surfaceTint,
      padding: mobileTheme.spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
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
      backgroundColor: c.surfaceHero,
    },
    successChip: {
      backgroundColor: c.successSoft,
    },
    warningChip: {
      backgroundColor: c.warningSoft,
    },
    dangerChip: {
      backgroundColor: c.dangerSoft,
    },
    statusChipText: {
      fontSize: mobileTheme.typography.eyebrow,
      fontWeight: "700",
      color: c.text,
    },
    pendingText: {
      color: c.primary,
      fontSize: mobileTheme.typography.caption,
      fontWeight: "600",
    },
    bodyText: {
      color: c.text,
      fontSize: mobileTheme.typography.bodySmall,
      lineHeight: 20,
    },
    fieldLabel: {
      color: c.text,
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
      backgroundColor: c.surfaceRaised,
      padding: mobileTheme.spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    selectionCardActive: {
      backgroundColor: c.primarySoft,
      borderColor: c.primary,
    },
    input: {
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: mobileTheme.radius.button,
      paddingHorizontal: mobileTheme.spacing.lg,
      paddingVertical: mobileTheme.spacing.md,
      backgroundColor: c.surfaceMuted,
      color: c.text,
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
      backgroundColor: c.primary,
      paddingHorizontal: mobileTheme.spacing.lg,
      paddingVertical: mobileTheme.spacing.lg,
      alignItems: "center",
      ...mobileTheme.shadow.glow,
    },
    primaryButtonLabel: {
      color: c.primaryContrast,
      fontSize: 15,
      fontWeight: "700",
    },
    dangerButton: {
      borderRadius: mobileTheme.radius.button,
      backgroundColor: c.danger,
      paddingHorizontal: mobileTheme.spacing.lg,
      paddingVertical: mobileTheme.spacing.lg,
      alignItems: "center",
    },
    secondaryButton: {
      borderRadius: mobileTheme.radius.button,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceRaised,
      paddingHorizontal: mobileTheme.spacing.lg,
      paddingVertical: mobileTheme.spacing.lg,
      alignItems: "center",
    },
    secondaryButtonLabel: {
      color: c.text,
      fontSize: 15,
      fontWeight: "700",
    },
    selectedActionButton: {
      borderColor: c.primary,
      backgroundColor: c.primarySoft,
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
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
      gap: 8,
      alignItems: "flex-start",
    },
    statusText: {
      color: c.textMuted,
      fontSize: mobileTheme.typography.bodySmall,
      lineHeight: 20,
    },
    errorCard: {
      borderColor: c.dangerBorder,
      backgroundColor: c.dangerSoft,
    },
    emptyCard: {
      borderColor: c.border,
      backgroundColor: c.surfaceTint,
    },
    errorText: {
      color: c.danger,
      fontSize: mobileTheme.typography.bodySmall,
      lineHeight: 20,
    },
    successText: {
      color: c.success,
      fontSize: mobileTheme.typography.bodySmall,
      lineHeight: 20,
    },
  })
}

const teacherStylesCache: Partial<Record<"light" | "dark", ReturnType<typeof buildTeacherStyles>>> =
  {}

export function getTeacherStyles() {
  const scheme = getMobileColorScheme()
  const cachedStyles = teacherStylesCache[scheme]

  if (cachedStyles) {
    return cachedStyles
  }

  const nextStyles = buildTeacherStyles(getColors())
  teacherStylesCache[scheme] = nextStyles
  return nextStyles
}

export const styles = new Proxy({} as ReturnType<typeof buildTeacherStyles>, {
  get(_target, property) {
    return getTeacherStyles()[property as keyof ReturnType<typeof buildTeacherStyles>]
  },
})
