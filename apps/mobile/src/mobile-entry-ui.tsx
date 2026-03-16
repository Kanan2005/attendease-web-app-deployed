import { getColors, getMobileColorScheme, mobileTheme } from "@attendease/ui-mobile"
import { AnimatedButton, AnimatedCard, GradientHeader } from "@attendease/ui-mobile/animated"
import { buildAnimatedStyles } from "@attendease/ui-mobile/animated-styles"
import { Ionicons } from "@expo/vector-icons"
import { Link } from "expo-router"
import type { ReactNode } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"

/** Button visual only — no Pressable wrapper. Use inside Link > Pressable. */
function LinkButtonVisual(props: { label: string; variant?: "primary" | "secondary" }) {
  const s = buildAnimatedStyles(getColors())
  const isPrimary = props.variant !== "secondary"
  return (
    <View style={[s.button, isPrimary ? s.buttonPrimary : s.buttonSecondary]}>
      <Text style={[s.buttonLabel, isPrimary ? s.buttonLabelPrimary : null]}>{props.label}</Text>
    </View>
  )
}

import { mobileEntryRoutes } from "./mobile-entry-models"
import type { MobileAuthFormState, MobileEntryCardModel } from "./mobile-entry-models"
import type { MobileEntryRole } from "./shell"

export function MobileAuthScreen(props: {
  entryRole: MobileEntryRole
  formState: MobileAuthFormState
  alternateHref: string
  canSubmit: boolean
  onSubmit: () => void
  children: ReactNode
}) {
  return (
    <ScrollView contentContainerStyle={styles.screenContent} style={styles.screen}>
      <GradientHeader
        eyebrow={props.entryRole === "student" ? "Student" : "Teacher"}
        title={props.formState.title}
        subtitle={props.formState.subtitle}
      />

      <AnimatedCard index={1}>
        {props.children}
        <AnimatedButton
          label={props.formState.submitLabel}
          onPress={props.onSubmit}
          disabled={props.formState.isSubmitting || !props.canSubmit}
        />
        <Text style={styles.helperText}>{props.formState.helperText}</Text>
        {props.formState.errorMessage ? (
          <Text style={styles.errorText}>{props.formState.errorMessage}</Text>
        ) : null}
        <Link href={props.alternateHref} asChild>
          <Pressable style={styles.inlineLinkButton}>
            <Text style={styles.inlineLinkLabel}>{props.formState.alternateLabel}</Text>
          </Pressable>
        </Link>
        <Link href={mobileEntryRoutes.landing} asChild>
          <Pressable style={styles.inlineLinkButton}>
            <Text style={styles.inlineLinkLabel}>Back to role choice</Text>
          </Pressable>
        </Link>
      </AnimatedCard>
    </ScrollView>
  )
}

export function EntryRoleCard(props: { card: MobileEntryCardModel; onSignOut: () => void }) {
  const isStudent = props.card.role === "student"
  const iconName = isStudent ? "school-outline" : "easel-outline"

  return (
    <AnimatedCard index={isStudent ? 1 : 2}>
      <View style={styles.roleHeader}>
        <View style={styles.roleIconWrap}>
          <Ionicons name={iconName} size={24} color={getColors().primary} />
        </View>
        <Text style={styles.cardEyebrow}>{isStudent ? "Student" : "Teacher"}</Text>
      </View>
      <Animated.Text entering={FadeInDown.delay(200).duration(400)} style={styles.cardTitle}>
        {props.card.title}
      </Animated.Text>
      <Text style={styles.cardDescription}>{props.card.description}</Text>
      {props.card.sessionSummary ? (
        <View style={styles.sessionBadge}>
          <Ionicons name="checkmark-circle" size={16} color={getColors().success} />
          <Text style={styles.sessionSummary}>{props.card.sessionSummary}</Text>
        </View>
      ) : null}
      <View style={styles.buttonColumn}>
        <Link href={props.card.primaryHref} asChild>
          <Pressable>
            <LinkButtonVisual label={props.card.primaryLabel} />
          </Pressable>
        </Link>
        {props.card.canSignOut ? (
          <AnimatedButton
            label={props.card.secondaryLabel}
            variant="secondary"
            onPress={props.onSignOut}
          />
        ) : props.card.secondaryHref ? (
          <Link href={props.card.secondaryHref} asChild>
            <Pressable>
              <LinkButtonVisual label={props.card.secondaryLabel} variant="secondary" />
            </Pressable>
          </Link>
        ) : null}
      </View>
    </AnimatedCard>
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
      paddingVertical: mobileTheme.spacing.md,
      backgroundColor: c.surfaceMuted,
      color: c.text,
      fontSize: mobileTheme.typography.body,
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
