import { getColors, getMobileColorScheme, mobileTheme } from "@attendease/ui-mobile"
import { AnimatedButton, AnimatedCard, GradientHeader } from "@attendease/ui-mobile/animated"
import { Ionicons } from "@expo/vector-icons"
import { Link } from "expo-router"
import type { ReactNode } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"

import { mobileEntryRoutes } from "./mobile-entry-models"
import type { MobileAuthFormState } from "./mobile-entry-models"
import type { MobileEntryRole } from "./shell"

const roleIconMap = {
  student: "school" as const,
  teacher: "easel" as const,
  admin: "shield-checkmark" as const,
} as const

export function MobileAuthScreen(props: {
  entryRole: MobileEntryRole
  formState: MobileAuthFormState
  alternateHref: string
  canSubmit: boolean
  onSubmit: () => void
  children: ReactNode
}) {
  const c = getColors()
  const eyebrowLabel = props.entryRole === "admin" ? "Admin" : props.entryRole === "student" ? "Student" : "Teacher"

  return (
    <ScrollView contentContainerStyle={styles.screenContent} style={styles.screen} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <GradientHeader
        eyebrow={eyebrowLabel}
        title={props.formState.title}
        subtitle={props.formState.subtitle}
        icon={<Ionicons name={roleIconMap[props.entryRole]} size={14} color={c.primary} />}
      />

      <AnimatedCard index={1}>
        {props.children}

        {props.formState.errorMessage ? (
          <Animated.View entering={FadeInDown.duration(300)} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: c.dangerSoft, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: c.dangerBorder }}>
            <Ionicons name="alert-circle" size={18} color={c.danger} style={{ marginTop: 1 }} />
            <Text style={[styles.errorText, { flex: 1 }]}>{props.formState.errorMessage}</Text>
          </Animated.View>
        ) : null}

        <AnimatedButton
          label={props.formState.submitLabel}
          onPress={props.onSubmit}
          disabled={props.formState.isSubmitting || !props.canSubmit}
        />

        <Text style={styles.helperText}>{props.formState.helperText}</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 4 }}>
          {props.alternateHref !== mobileEntryRoutes.landing ? (
            <Link href={props.alternateHref} asChild>
              <Pressable style={styles.inlineLinkButton}>
                <Text style={styles.inlineLinkLabel}>{props.formState.alternateLabel}</Text>
              </Pressable>
            </Link>
          ) : null}
          <Link href={mobileEntryRoutes.landing} asChild>
            <Pressable style={styles.inlineLinkButton}>
              <Text style={styles.inlineLinkLabel}>Back to role choice</Text>
            </Pressable>
          </Link>
        </View>
      </AnimatedCard>
    </ScrollView>
  )
}

function buildEntryStyles() {
  const c = getColors()
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.surface,
    },
    screenContent: {
      padding: mobileTheme.spacing.xl,
      paddingBottom: mobileTheme.spacing.xxxl,
      gap: mobileTheme.spacing.xl,
    },
    roleHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: mobileTheme.spacing.sm,
    },
    roleIconWrap: {
      width: 40,
      height: 40,
      borderRadius: mobileTheme.radius.full,
      backgroundColor: c.surfaceHero,
      alignItems: "center",
      justifyContent: "center",
    },
    cardEyebrow: {
      color: c.primary,
      fontSize: mobileTheme.typography.bodySmall,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    cardTitle: {
      color: c.text,
      fontSize: mobileTheme.typography.title,
      fontWeight: "700",
    },
    cardDescription: {
      color: c.textMuted,
      fontSize: mobileTheme.typography.body,
      lineHeight: 24,
    },
    sessionBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.successSoft,
      borderRadius: mobileTheme.radius.chip,
      paddingHorizontal: mobileTheme.spacing.md,
      paddingVertical: mobileTheme.spacing.xs,
      alignSelf: "flex-start",
    },
    sessionSummary: {
      color: c.success,
      fontSize: mobileTheme.typography.bodySmall,
      fontWeight: "600",
    },
    buttonColumn: {
      gap: mobileTheme.spacing.sm,
      marginTop: mobileTheme.spacing.sm,
    },
    helperText: {
      color: c.textMuted,
      fontSize: mobileTheme.typography.bodySmall,
      lineHeight: 22,
    },
    errorText: {
      color: c.danger,
      fontSize: mobileTheme.typography.bodySmall,
      lineHeight: 22,
    },
    inlineLinkButton: {
      alignSelf: "flex-start",
    },
    inlineLinkLabel: {
      color: c.primary,
      fontSize: mobileTheme.typography.bodySmall,
      fontWeight: "700",
    },
    input: {
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: mobileTheme.radius.button,
      paddingHorizontal: mobileTheme.spacing.lg,
      paddingVertical: 14,
      backgroundColor: c.surfaceMuted,
      color: c.text,
      fontSize: mobileTheme.typography.body,
    },
    inputLabel: {
      color: c.textMuted,
      fontSize: mobileTheme.typography.caption,
      fontWeight: "600",
      letterSpacing: 0.2,
      marginBottom: 4,
    },
    helperNote: {
      color: c.textMuted,
      fontSize: mobileTheme.typography.bodySmall,
      lineHeight: 22,
    },
  })
}

const entryStylesCache: Partial<Record<"light" | "dark", ReturnType<typeof buildEntryStyles>>> = {}

function getEntryStyles() {
  const scheme = getMobileColorScheme()
  const cachedStyles = entryStylesCache[scheme]

  if (cachedStyles) {
    return cachedStyles
  }

  const nextStyles = buildEntryStyles()
  entryStylesCache[scheme] = nextStyles
  return nextStyles
}

const styles = new Proxy({} as ReturnType<typeof buildEntryStyles>, {
  get(_target, property) {
    return getEntryStyles()[property as keyof ReturnType<typeof buildEntryStyles>]
  },
})

export const mobileEntryScreenStyles = styles
