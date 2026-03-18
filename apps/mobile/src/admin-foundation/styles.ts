import {
  type MobileColors,
  getColors,
  getMobileColorScheme,
  mobileTheme,
} from "@attendease/ui-mobile"
import { StyleSheet } from "react-native"

export function buildAdminStyles(c: MobileColors) {
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
    actionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
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
    dangerButton: {
      borderRadius: mobileTheme.radius.button,
      backgroundColor: c.dangerSoft,
      borderWidth: 1,
      borderColor: c.dangerBorder,
      paddingHorizontal: mobileTheme.spacing.lg,
      paddingVertical: mobileTheme.spacing.lg,
      alignItems: "center",
    },
    dangerButtonLabel: {
      color: c.danger,
      fontSize: 15,
      fontWeight: "700",
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
    primaryBanner: {
      backgroundColor: c.surfaceHero,
      borderColor: c.borderAccent,
    },
    successBanner: {
      backgroundColor: c.successSoft,
      borderColor: c.successBorder,
    },
    warningBanner: {
      backgroundColor: c.warningSoft,
      borderColor: c.warningBorder,
    },
    dangerBanner: {
      backgroundColor: c.dangerSoft,
      borderColor: c.dangerBorder,
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
    emptyCard: {
      borderColor: c.border,
      backgroundColor: c.surfaceTint,
    },
    errorCard: {
      borderColor: c.danger,
      backgroundColor: c.dangerSoft,
    },
    statusText: {
      color: c.textMuted,
      fontSize: mobileTheme.typography.bodySmall,
      lineHeight: 20,
    },
    listRow: {
      gap: 4,
      paddingVertical: 12,
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
    bodyText: {
      color: c.text,
      fontSize: mobileTheme.typography.bodySmall,
      lineHeight: 20,
    },
    highlightCard: {
      gap: 6,
      borderRadius: mobileTheme.radius.card,
      backgroundColor: c.surfaceTint,
      padding: mobileTheme.spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
  })
}

const adminStylesCache: Partial<Record<"light" | "dark", ReturnType<typeof buildAdminStyles>>> = {}

export function getAdminStyles() {
  const scheme = getMobileColorScheme()
  const cachedStyles = adminStylesCache[scheme]

  if (cachedStyles) {
    return cachedStyles
  }

  const nextStyles = buildAdminStyles(getColors())
  adminStylesCache[scheme] = nextStyles
  return nextStyles
}

export const styles = new Proxy({} as ReturnType<typeof buildAdminStyles>, {
  get(_target, property) {
    return getAdminStyles()[property as keyof ReturnType<typeof buildAdminStyles>]
  },
})
