import { mobileTheme } from "@attendease/ui-mobile"
import { Link } from "expo-router"
import type { ReactNode } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"

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
      <View style={styles.heroBlock}>
        <Text style={styles.eyebrow}>
          {props.entryRole === "student" ? "Student" : "Teacher"} mobile
        </Text>
        <Text style={styles.heroTitle}>{props.formState.title}</Text>
        <Text style={styles.heroSubtitle}>{props.formState.subtitle}</Text>
      </View>

      <View style={styles.entryCard}>
        {props.children}
        <Pressable
          style={[
            styles.primaryButton,
            props.formState.isSubmitting || !props.canSubmit ? styles.disabledButton : null,
          ]}
          disabled={props.formState.isSubmitting || !props.canSubmit}
          onPress={props.onSubmit}
        >
          <Text style={styles.primaryButtonLabel}>{props.formState.submitLabel}</Text>
        </Pressable>
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
      </View>
    </ScrollView>
  )
}

export function EntryRoleCard(props: { card: MobileEntryCardModel; onSignOut: () => void }) {
  const isStudent = props.card.role === "student"

  return (
    <View style={styles.entryCard}>
      <Text style={styles.cardEyebrow}>{isStudent ? "Student" : "Teacher"}</Text>
      <Text style={styles.cardTitle}>{props.card.title}</Text>
      <Text style={styles.cardDescription}>{props.card.description}</Text>
      {props.card.sessionSummary ? (
        <Text style={styles.sessionSummary}>{props.card.sessionSummary}</Text>
      ) : null}
      <View style={styles.buttonColumn}>
        <Link href={props.card.primaryHref} asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonLabel}>{props.card.primaryLabel}</Text>
          </Pressable>
        </Link>
        {props.card.canSignOut ? (
          <Pressable style={styles.secondaryButton} onPress={props.onSignOut}>
            <Text style={styles.secondaryButtonLabel}>{props.card.secondaryLabel}</Text>
          </Pressable>
        ) : props.card.secondaryHref ? (
          <Link href={props.card.secondaryHref} asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonLabel}>{props.card.secondaryLabel}</Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: mobileTheme.colors.surface,
  },
  screenContent: {
    padding: mobileTheme.spacing.xl,
    gap: mobileTheme.spacing.xl,
  },
  heroBlock: {
    gap: mobileTheme.spacing.sm,
    paddingTop: mobileTheme.spacing.xl,
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingBottom: mobileTheme.spacing.lg,
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
  eyebrow: {
    color: mobileTheme.colors.accent,
    fontSize: mobileTheme.typography.eyebrow,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.typography.hero,
    fontWeight: "800",
    lineHeight: 44,
  },
  heroSubtitle: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.typography.body,
    lineHeight: 24,
  },
  entryCard: {
    gap: mobileTheme.spacing.md,
    padding: mobileTheme.spacing.xl,
    backgroundColor: mobileTheme.colors.surfaceRaised,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    shadowColor: mobileTheme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 18,
    },
    shadowOpacity: 0.1,
    shadowRadius: 32,
  },
  cardEyebrow: {
    color: mobileTheme.colors.accent,
    fontSize: mobileTheme.typography.bodySmall,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
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
  sessionSummary: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.typography.bodySmall,
    fontWeight: "600",
    backgroundColor: mobileTheme.colors.surfaceHero,
    borderRadius: mobileTheme.radius.button,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.sm,
  },
  buttonColumn: {
    gap: mobileTheme.spacing.sm,
  },
  primaryButton: {
    borderRadius: mobileTheme.radius.button,
    backgroundColor: mobileTheme.colors.primary,
    paddingVertical: mobileTheme.spacing.md,
    alignItems: "center",
    shadowColor: mobileTheme.colors.primaryStrong,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.14,
    shadowRadius: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonLabel: {
    color: mobileTheme.colors.primaryContrast,
    fontSize: mobileTheme.typography.body,
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: mobileTheme.radius.button,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.surfaceRaised,
    paddingVertical: mobileTheme.spacing.md,
    alignItems: "center",
  },
  secondaryButtonLabel: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.typography.body,
    fontWeight: "700",
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
    color: mobileTheme.colors.accent,
    fontSize: mobileTheme.typography.bodySmall,
    fontWeight: "700",
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
  helperNote: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.typography.bodySmall,
    lineHeight: 22,
  },
})

export const mobileEntryScreenStyles = styles
