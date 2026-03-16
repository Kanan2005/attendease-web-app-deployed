import * as Haptics from "expo-haptics"
import { LinearGradient } from "expo-linear-gradient"
import type { ReactNode } from "react"
import { Pressable, Text, View } from "react-native"
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { animatedStyles as cardStyles } from "./animated-styles"
import { mobileTheme } from "./index"

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

// --- Animated Card ---
export function AnimatedCard(props: {
  children: ReactNode
  index?: number
  glow?: boolean
  style?: object
  onPress?: () => void
}) {
  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const entering = FadeInDown.delay((props.index ?? 0) * 80)
    .duration(500)
    .springify()

  if (props.onPress) {
    return (
      <AnimatedPressable
        entering={entering}
        style={[cardStyles.card, props.glow ? cardStyles.glow : null, props.style, animStyle]}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15 })
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15 })
        }}
        onPress={props.onPress}
      >
        {props.children}
      </AnimatedPressable>
    )
  }

  return (
    <Animated.View
      entering={entering}
      style={[cardStyles.card, props.glow ? cardStyles.glow : null, props.style]}
    >
      {props.children}
    </Animated.View>
  )
}

// --- Glass Surface ---
export function GlassSurface(props: { children: ReactNode; style?: object }) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={[cardStyles.glass, props.style]}>
      {props.children}
    </Animated.View>
  )
}

// --- Gradient Header ---
export function GradientHeader(props: {
  title: string
  subtitle?: string
  eyebrow?: string
  children?: ReactNode
}) {
  return (
    <LinearGradient
      colors={["#16213E", "#1A1A2E", "#0D0D0D"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={cardStyles.gradientHeader}
    >
      {props.eyebrow ? (
        <Animated.Text entering={FadeInUp.delay(100).duration(400)} style={cardStyles.eyebrow}>
          {props.eyebrow}
        </Animated.Text>
      ) : null}
      <Animated.Text entering={FadeInUp.delay(200).duration(400)} style={cardStyles.heroTitle}>
        {props.title}
      </Animated.Text>
      {props.subtitle ? (
        <Animated.Text entering={FadeInUp.delay(300).duration(400)} style={cardStyles.subtitle}>
          {props.subtitle}
        </Animated.Text>
      ) : null}
      {props.children}
    </LinearGradient>
  )
}

// --- Stat Card ---
export function StatCard(props: {
  label: string
  value: string | number
  tone?: "primary" | "success" | "warning" | "danger"
  index?: number
}) {
  const toneColor =
    props.tone === "success"
      ? mobileTheme.colors.success
      : props.tone === "warning"
        ? mobileTheme.colors.warning
        : props.tone === "danger"
          ? mobileTheme.colors.danger
          : mobileTheme.colors.primary

  return (
    <Animated.View
      entering={FadeInDown.delay((props.index ?? 0) * 100)
        .duration(500)
        .springify()}
      style={cardStyles.statCard}
    >
      <Text style={cardStyles.statLabel}>{props.label}</Text>
      <Text style={[cardStyles.statValue, { color: toneColor }]}>{props.value}</Text>
    </Animated.View>
  )
}

// --- Action Chip ---
export function ActionChip(props: {
  label: string
  icon?: string
  onPress: () => void
  variant?: "primary" | "secondary" | "accent"
}) {
  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const isPrimary = props.variant === "primary" || props.variant === "accent"

  return (
    <AnimatedPressable
      style={[cardStyles.chip, isPrimary ? cardStyles.chipPrimary : null, animStyle]}
      onPressIn={() => {
        scale.value = withSpring(0.94, { damping: 15 })
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15 })
      }}
      onPress={props.onPress}
    >
      <Text style={[cardStyles.chipLabel, isPrimary ? cardStyles.chipLabelPrimary : null]}>
        {props.label}
      </Text>
    </AnimatedPressable>
  )
}

// --- Animated Button ---
export function AnimatedButton(props: {
  label: string
  onPress: () => void
  variant?: "primary" | "secondary" | "danger"
  disabled?: boolean
}) {
  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const isPrimary = props.variant !== "secondary" && props.variant !== "danger"
  const isDanger = props.variant === "danger"

  return (
    <AnimatedPressable
      style={[
        cardStyles.button,
        isPrimary ? cardStyles.buttonPrimary : null,
        isDanger ? cardStyles.buttonDanger : null,
        !isPrimary && !isDanger ? cardStyles.buttonSecondary : null,
        props.disabled ? cardStyles.buttonDisabled : null,
        animStyle,
      ]}
      disabled={props.disabled}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 15 })
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15 })
      }}
      onPress={props.onPress}
    >
      <Text
        style={[
          cardStyles.buttonLabel,
          isPrimary ? cardStyles.buttonLabelPrimary : null,
          isDanger ? cardStyles.buttonLabelDanger : null,
        ]}
      >
        {props.label}
      </Text>
    </AnimatedPressable>
  )
}

// --- Skeleton Loader ---
export function SkeletonLoader(props: { width?: number; height?: number; lines?: number }) {
  const opacity = useSharedValue(0.3)
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  // Pulse animation
  opacity.value = withTiming(0.7, { duration: 800 }, (finished: boolean | undefined) => {
    if (finished) {
      opacity.value = withTiming(0.3, { duration: 800 })
    }
  })

  const count = props.lines ?? 1
  const baseWidth = props.width ?? 300
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View
          key={`skeleton-${String(i)}`}
          style={[
            cardStyles.skeleton,
            {
              width: i === count - 1 && count > 1 ? Math.round(baseWidth * 0.6) : baseWidth,
              height: props.height ?? 14,
            },
            pulseStyle,
          ]}
        />
      ))}
    </View>
  )
}

// --- Fade-In View ---
export function FadeInView(props: {
  children: ReactNode
  delay?: number
  direction?: "up" | "down" | "right"
}) {
  const anim =
    props.direction === "right"
      ? SlideInRight.delay(props.delay ?? 0).duration(400)
      : props.direction === "down"
        ? FadeInDown.delay(props.delay ?? 0).duration(400)
        : FadeInUp.delay(props.delay ?? 0).duration(400)

  return <Animated.View entering={anim}>{props.children}</Animated.View>
}

// --- StatusPill ---
export function StatusPill(props: {
  label: string
  tone?: "primary" | "success" | "warning" | "danger"
}) {
  const toneMap = {
    primary: { bg: mobileTheme.colors.surfaceHero, text: mobileTheme.colors.primary },
    success: { bg: mobileTheme.colors.successSoft, text: mobileTheme.colors.success },
    warning: { bg: mobileTheme.colors.warningSoft, text: mobileTheme.colors.warning },
    danger: { bg: mobileTheme.colors.dangerSoft, text: mobileTheme.colors.danger },
  }
  const t = toneMap[props.tone ?? "primary"]

  return (
    <View style={[cardStyles.pill, { backgroundColor: t.bg }]}>
      <Text style={[cardStyles.pillText, { color: t.text }]}>{props.label}</Text>
    </View>
  )
}
