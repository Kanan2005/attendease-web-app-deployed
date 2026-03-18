import { getColors } from "@attendease/ui-mobile"
import { AnimatedCard, GradientHeader } from "@attendease/ui-mobile/animated"
import { Ionicons } from "@expo/vector-icons"
import { Link } from "expo-router"
import type { ReactNode } from "react"
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { mobileEntryRoutes } from "../mobile-entry-models"
import { styles } from "./styles"

export function AdminScreen(props: {
  title: string
  subtitle: string
  children: ReactNode
  onRefresh?: () => void
  refreshing?: boolean
}) {
  const insets = useSafeAreaInsets()
  const c = getColors()

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.screenContent,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        props.onRefresh ? (
          <RefreshControl
            refreshing={props.refreshing ?? false}
            onRefresh={props.onRefresh}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        ) : undefined
      }
    >
      <GradientHeader
        title={props.title}
        subtitle={props.subtitle}
        eyebrow="Admin"
        icon={<Ionicons name="shield-checkmark" size={14} color={c.primary} />}
      />
      {props.children}
    </ScrollView>
  )
}

export function AdminCard(props: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <AnimatedCard>
      <Text style={styles.cardTitle}>{props.title}</Text>
      {props.subtitle ? <Text style={styles.cardSubtitle}>{props.subtitle}</Text> : null}
      <View style={styles.cardBody}>{props.children}</View>
    </AnimatedCard>
  )
}

export function AdminNavAction(props: {
  href: string
  label: string
  variant?: "primary" | "secondary"
  icon?: React.ComponentProps<typeof Ionicons>["name"]
}) {
  const c = getColors()
  return (
    <Link href={props.href} asChild>
      <Pressable style={props.variant === "primary" ? styles.primaryButton : styles.navButton}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {props.icon ? (
            <Ionicons
              name={props.icon}
              size={15}
              color={props.variant === "primary" ? c.primaryContrast : c.primary}
            />
          ) : null}
          <Text
            style={
              props.variant === "primary" ? styles.primaryButtonLabel : styles.navButtonLabel
            }
          >
            {props.label}
          </Text>
        </View>
      </Pressable>
    </Link>
  )
}

export function AdminStatusBanner(props: {
  status: {
    tone: "primary" | "success" | "warning" | "danger"
    title: string
    message: string
  }
}) {
  const toneStyle =
    props.status.tone === "danger"
      ? styles.dangerBanner
      : props.status.tone === "success"
        ? styles.successBanner
        : props.status.tone === "warning"
          ? styles.warningBanner
          : styles.primaryBanner

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={[styles.statusBanner, toneStyle]}>
      <Text style={styles.statusBannerTitle}>{props.status.title}</Text>
      <Text style={styles.statusText}>{props.status.message}</Text>
    </Animated.View>
  )
}

export function AdminLoadingCard(props: { label: string }) {
  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.statusCard}>
      <ActivityIndicator color={getColors().primary} />
      <Text style={styles.statusText}>{props.label}</Text>
    </Animated.View>
  )
}

export function AdminErrorCard(props: { label: string }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      style={[styles.statusCard, styles.errorCard]}
    >
      <Ionicons name="alert-circle-outline" size={20} color={getColors().danger} />
      <Text style={[styles.statusText, { color: getColors().danger }]}>{props.label}</Text>
    </Animated.View>
  )
}

export function AdminEmptyCard(props: { label: string }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      style={[styles.statusCard, styles.emptyCard]}
    >
      <Ionicons name="folder-open-outline" size={20} color={getColors().textSubtle} />
      <Text style={styles.statusText}>{props.label}</Text>
    </Animated.View>
  )
}

export function AdminSessionSetupCard() {
  return (
    <AdminCard
      title="Admin sign in required"
      subtitle="Sign in with your admin credentials to manage platform settings."
    >
      <Link href={mobileEntryRoutes.adminSignIn} asChild>
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonLabel}>Open admin sign in</Text>
        </Pressable>
      </Link>
    </AdminCard>
  )
}

export { styles } from "./styles"
