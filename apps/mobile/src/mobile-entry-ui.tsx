import { mobileTheme } from "@attendease/ui-mobile"
import { AnimatedButton, AnimatedCard, GradientHeader } from "@attendease/ui-mobile/animated"
import { Ionicons } from "@expo/vector-icons"
import { Link } from "expo-router"
import type { ReactNode } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"

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
          <Ionicons name={iconName} size={24} color={mobileTheme.colors.primary} />
        </View>
        <Text style={styles.cardEyebrow}>{isStudent ? "Student" : "Teacher"}</Text>
      </View>
      <Animated.Text entering={FadeInDown.delay(200).duration(400)} style={styles.cardTitle}>
        {props.card.title}
      </Animated.Text>
      <Text style={styles.cardDescription}>{props.card.description}</Text>
      {props.card.sessionSummary ? (
        <View style={styles.sessionBadge}>
          <Ionicons name="checkmark-circle" size={16} color={mobileTheme.colors.success} />
          <Text style={styles.sessionSummary}>{props.card.sessionSummary}</Text>
        </View>
      ) : null}
      <View style={styles.buttonColumn}>
        <Link href={props.card.primaryHref} asChild>
          <Pressable>
            <AnimatedButton label={props.card.primaryLabel} onPress={() => {}} />
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
              <AnimatedButton
                label={props.card.secondaryLabel}
                variant="secondary"
                onPress={() => {}}
              />
            </Pressable>
          </Link>
        ) : null}
      </View>
    </AnimatedCard>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: mobileTheme.colors.surface,
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
    backgroundColor: mobileTheme.colors.surfaceHero,
    alignItems: "center",
    justifyContent: "center",
  },
  cardEyebrow: {
    color: mobileTheme.colors.primary,
    fontSize: mobileTheme.typography.bodySmall,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardTitle: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.typography.title,
    fontWeight: "700",
  },
  cardDescription: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.typography.body,
    lineHeight: 24,
  },
  sessionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: mobileTheme.colors.successSoft,
    borderRadius: mobileTheme.radius.chip,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.xs,
    alignSelf: "flex-start",
  },
  sessionSummary: {
    color: mobileTheme.colors.success,
    fontSize: mobileTheme.typography.bodySmall,
    fontWeight: "600",
  },
  buttonColumn: {
    gap: mobileTheme.spacing.sm,
    marginTop: mobileTheme.spacing.sm,
  },
  helperText: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.typography.bodySmall,
    lineHeight: 22,
  },
  errorText: {
    color: mobileTheme.colors.danger,
    fontSize: mobileTheme.typography.bodySmall,
    lineHeight: 22,
  },
  inlineLinkButton: {
    alignSelf: "flex-start",
  },
  inlineLinkLabel: {
    color: mobileTheme.colors.primary,
    fontSize: mobileTheme.typography.bodySmall,
    fontWeight: "700",
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
  helperNote: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.typography.bodySmall,
    lineHeight: 22,
  },
})

export const mobileEntryScreenStyles = styles
