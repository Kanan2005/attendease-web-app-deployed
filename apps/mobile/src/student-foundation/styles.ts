import {
  type MobileColors,
  getColors,
  getMobileColorScheme,
  mobileTheme,
} from "@attendease/ui-mobile"
import { StyleSheet } from "react-native"

export function buildStudentStyles(c: MobileColors) {
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
    cardEyebrow: {
      fontSize: mobileTheme.typography.eyebrow,
      fontWeight: "700",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: c.primary,
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
    spotlightPrimary: {
      borderColor: c.borderAccent,
      backgroundColor: c.surfaceHero,
    },
    spotlightSuccess: {
      borderColor: c.successBorder,
      backgroundColor: c.successSoft,
    },
    spotlightWarning: {
      borderColor: c.warningBorder,
      backgroundColor: c.warningSoft,
    },
    spotlightDanger: {
      borderColor: c.dangerBorder,
      backgroundColor: c.dangerSoft,
    },
    spotlightTitle: {
      color: c.text,
      fontSize: 24,
      fontWeight: "800",
      lineHeight: 30,
    },
    spotlightMessage: {
      color: c.textMuted,
      fontSize: 15,
      lineHeight: 22,
    },
    actionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    quickActionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    quickActionTile: {
      width: "25%" as unknown as number,
      alignItems: "center",
      paddingVertical: 10,
      gap: 6,
    },
    quickActionIcon: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    quickActionLabel: {
      fontSize: mobileTheme.typography.eyebrow,
      fontWeight: "600",
      color: c.textMuted,
      textAlign: "center",
    },
    navButton: {
      borderRadius: mobileTheme.radius.button,
      backgroundColor: c.surfaceTint,
      paddingHorizontal: mobileTheme.spacing.lg,
      paddingVertical: mobileTheme.spacing.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    navButtonLabel: {
      color: c.text,
      fontSize: mobileTheme.typography.bodySmall,
      fontWeight: "700",
    },
    classroomRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    classroomRowIcon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    timelineIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: c.surfaceTint,
      alignItems: "center",
      justifyContent: "center",
    },
    timelineRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
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
    selectionRow: {
      gap: 4,
      padding: mobileTheme.spacing.md,
      borderRadius: mobileTheme.radius.card,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceRaised,
    },
    selectedRow: {
      borderColor: c.primary,
      backgroundColor: c.primarySoft,
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
    bodyText: {
      color: c.text,
      fontSize: mobileTheme.typography.bodySmall,
      lineHeight: 20,
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
    cameraPreviewFrame: {
      minHeight: 260,
      borderRadius: mobileTheme.radius.card,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.borderStrong,
      backgroundColor: c.surfaceMuted,
    },
    cameraPreview: {
      flex: 1,
      minHeight: 260,
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
    statusCard: {
      borderRadius: mobileTheme.radius.card,
      padding: mobileTheme.spacing.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
      gap: mobileTheme.spacing.sm,
      alignItems: "flex-start",
    },
    compactStatusCard: {
      paddingVertical: 12,
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
    infoCard: {
      borderColor: c.borderAccent,
      backgroundColor: c.surfaceHero,
    },
    successCard: {
      borderColor: c.successBorder,
      backgroundColor: c.successSoft,
    },
    warningCard: {
      borderColor: c.warningBorder,
      backgroundColor: c.warningSoft,
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

const studentStylesCache: Partial<Record<"light" | "dark", ReturnType<typeof buildStudentStyles>>> =
  {}

export function getStudentStyles() {
  const scheme = getMobileColorScheme()
  const cachedStyles = studentStylesCache[scheme]

  if (cachedStyles) {
    return cachedStyles
  }

  const nextStyles = buildStudentStyles(getColors())
  studentStylesCache[scheme] = nextStyles
  return nextStyles
}

export const styles = new Proxy({} as ReturnType<typeof buildStudentStyles>, {
  get(_target, property) {
    return getStudentStyles()[property as keyof ReturnType<typeof buildStudentStyles>]
  },
})
