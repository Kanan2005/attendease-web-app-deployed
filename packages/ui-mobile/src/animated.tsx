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
import { buildAnimatedStyles } from "./animated-styles"
import { getColors, mobileTheme } from "./index"

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

function useStyles() {
  return buildAnimatedStyles(getColors())
}

// --- Animated Card ---
export function AnimatedCard(props: {
  children: ReactNode
  index?: number
  glow?: boolean
  style?: object
  onPress?: () => void
}) {
  const s = useStyles()
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
        style={[s.card, props.glow ? s.glow : null, props.style, animStyle]}
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
    <Animated.View entering={entering} style={[s.card, props.glow ? s.glow : null, props.style]}>
      {props.children}
    </Animated.View>
  )
}

// --- Glass Surface ---
export function GlassSurface(props: { children: ReactNode; style?: object }) {
  const s = useStyles()
  return (
    <Animated.View entering={FadeIn.duration(400)} style={[s.glass, props.style]}>
      {props.children}
    </Animated.View>
  )
}

// --- Gradient Header ---
export function GradientHeader(props: {
  title: string
  subtitle?: string
  eyebrow?: string
  icon?: ReactNode
  children?: ReactNode
}) {
  const c = getColors()
  const s = useStyles()
  return (
    <LinearGradient
      colors={[c.gradient1, c.gradient2, c.gradient3]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.gradientHeader}
    >
      {props.eyebrow ? (
        <Animated.View entering={FadeInUp.delay(100).duration(400)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {props.icon ?? null}
          <Text style={s.eyebrow}>{props.eyebrow}</Text>
        </Animated.View>
      ) : null}
      <Animated.Text entering={FadeInUp.delay(200).duration(500).springify()} style={s.heroTitle}>
        {props.title}
      </Animated.Text>
      {props.subtitle ? (
        <Animated.Text entering={FadeInUp.delay(300).duration(400)} style={s.subtitle}>
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
  const c = getColors()
  const s = useStyles()
  const toneColor =
    props.tone === "success"
      ? c.success
      : props.tone === "warning"
        ? c.warning
        : props.tone === "danger"
          ? c.danger
          : c.primary

  return (
    <Animated.View
      entering={FadeInDown.delay((props.index ?? 0) * 100)
        .duration(500)
        .springify()}
      style={s.statCard}
    >
      <Text style={s.statLabel}>{props.label}</Text>
      <Text style={[s.statValue, { color: toneColor }]}>{props.value}</Text>
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
  const s = useStyles()
  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const isPrimary = props.variant === "primary" || props.variant === "accent"

  return (
    <AnimatedPressable
      style={[s.chip, isPrimary ? s.chipPrimary : null, animStyle]}
      onPressIn={() => {
        scale.value = withSpring(0.94, { damping: 15 })
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15 })
      }}
      onPress={props.onPress}
    >
      <Text style={[s.chipLabel, isPrimary ? s.chipLabelPrimary : null]}>{props.label}</Text>
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
  const s = useStyles()
  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const isPrimary = props.variant !== "secondary" && props.variant !== "danger"
  const isDanger = props.variant === "danger"

  return (
    <AnimatedPressable
      style={[
        s.button,
        isPrimary ? s.buttonPrimary : null,
        isDanger ? s.buttonDanger : null,
        !isPrimary && !isDanger ? s.buttonSecondary : null,
        props.disabled ? s.buttonDisabled : null,
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
          s.buttonLabel,
          isPrimary ? s.buttonLabelPrimary : null,
          isDanger ? s.buttonLabelDanger : null,
        ]}
      >
        {props.label}
      </Text>
    </AnimatedPressable>
  )
}

// --- Skeleton Loader ---
export function SkeletonLoader(props: { width?: number; height?: number; lines?: number }) {
  const s = useStyles()
  const opacity = useSharedValue(0.3)
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

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
            s.skeleton,
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
  const c = getColors()
  const s = useStyles()
  const toneMap = {
    primary: { bg: c.surfaceHero, text: c.primary },
    success: { bg: c.successSoft, text: c.success },
    warning: { bg: c.warningSoft, text: c.warning },
    danger: { bg: c.dangerSoft, text: c.danger },
  }
  const t = toneMap[props.tone ?? "primary"]

  return (
    <View style={[s.pill, { backgroundColor: t.bg }]}>
      <Text style={[s.pillText, { color: t.text }]}>{props.label}</Text>
    </View>
  )
}
