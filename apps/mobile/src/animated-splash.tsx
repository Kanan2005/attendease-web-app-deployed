import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { useCallback, useEffect, useState } from "react"
import { Dimensions, Image, StyleSheet, Text, View } from "react-native"
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated"

const { width: SCREEN_W } = Dimensions.get("window")

// ─── Animated Logo Icon ─────────────────────────────────────────────
function AnimatedLogo() {
  const c = getColors()
  const progress = useSharedValue(0)
  const rotate = useSharedValue(0)
  const glow = useSharedValue(0)

  useEffect(() => {
    // Scale up with a spring bounce
    progress.value = withSpring(1, { damping: 12, stiffness: 100 })
    // Subtle rotation settle
    rotate.value = withSequence(
      withTiming(-8, { duration: 200, easing: Easing.out(Easing.cubic) }),
      withSpring(0, { damping: 8, stiffness: 120 }),
    )
    // Glow pulse
    glow.value = withDelay(
      600,
      withSequence(
        withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      ),
    )
  }, [progress, rotate, glow])

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.3, 1]) },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.8, 1]),
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.8, 1.4]) }],
  }))

  return (
    <View style={styles.logoContainer}>
      {/* Glow ring behind the icon */}
      <Animated.View
        style={[
          styles.glowRing,
          { backgroundColor: c.primarySoft, borderColor: c.primary },
          glowStyle,
        ]}
      />
      <Animated.View style={[styles.iconBox, iconStyle]}>
        <Image
          source={require("../assets/icon.png")}
          style={styles.logoImage}
        />
      </Animated.View>
    </View>
  )
}

// ─── Animated Title ─────────────────────────────────────────────────
function AnimatedTitle() {
  const c = getColors()
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(20)

  useEffect(() => {
    opacity.value = withDelay(400, withTiming(1, { duration: 500 }))
    translateY.value = withDelay(
      400,
      withSpring(0, { damping: 14, stiffness: 100 }),
    )
  }, [opacity, translateY])

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Animated.View style={[styles.titleWrap, style]}>
      <Text style={[styles.title, { color: c.text }]}>AttendEase</Text>
    </Animated.View>
  )
}

// ─── Animated Tagline ───────────────────────────────────────────────
function AnimatedTagline() {
  const c = getColors()
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(12)

  useEffect(() => {
    opacity.value = withDelay(700, withTiming(1, { duration: 500 }))
    translateY.value = withDelay(
      700,
      withSpring(0, { damping: 14, stiffness: 90 }),
    )
  }, [opacity, translateY])

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Animated.Text style={[styles.tagline, { color: c.textMuted }, style]}>
      Smart attendance for classrooms
    </Animated.Text>
  )
}

// ─── Loading Dots ───────────────────────────────────────────────────
function LoadingDots() {
  const c = getColors()

  return (
    <Animated.View entering={FadeIn.delay(900).duration(400)} style={styles.dotsRow}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} index={i} color={c.primary} />
      ))}
    </Animated.View>
  )
}

function Dot({ index, color }: { index: number; color: string }) {
  const scale = useSharedValue(0.5)
  const opacity = useSharedValue(0.3)

  useEffect(() => {
    const delay = 1000 + index * 200
    const loop = () => {
      scale.value = withDelay(
        delay,
        withSequence(
          withTiming(1.2, { duration: 300, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.5, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        ),
      )
      opacity.value = withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.3, { duration: 400 }),
        ),
      )
    }
    loop()
    const interval = setInterval(loop, 1200)
    return () => clearInterval(interval)
  }, [index, scale, opacity])

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />
  )
}

// ─── Main Splash Component ──────────────────────────────────────────
export function AnimatedSplash({
  onFinish,
  minimumDurationMs = 2200,
}: {
  onFinish: () => void
  minimumDurationMs?: number
}) {
  const [visible, setVisible] = useState(true)

  const dismiss = useCallback(() => {
    setVisible(false)
    // Let the FadeOut complete before calling onFinish
    setTimeout(onFinish, 400)
  }, [onFinish])

  useEffect(() => {
    const timer = setTimeout(() => {
      runOnJS(dismiss)()
    }, minimumDurationMs)
    return () => clearTimeout(timer)
  }, [dismiss, minimumDurationMs])

  const c = getColors()

  if (!visible) {
    return null
  }

  return (
    <Animated.View
      exiting={FadeOut.duration(350)}
      style={[styles.container, { backgroundColor: c.surface }]}
    >
      {/* Decorative gradient orbs */}
      <View style={[styles.orb, styles.orbTopRight, { backgroundColor: c.primarySoft }]} />
      <View style={[styles.orb, styles.orbBottomLeft, { backgroundColor: c.primarySoft }]} />

      <View style={styles.content}>
        <AnimatedLogo />
        <AnimatedTitle />
        <AnimatedTagline />
        <LoadingDots />
      </View>

      <Animated.Text
        entering={FadeIn.delay(1000).duration(500)}
        style={[styles.footer, { color: c.textSubtle }]}
      >
        MNIT Jaipur
      </Animated.Text>
    </Animated.View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    gap: 12,
  },
  logoContainer: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  glowRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 44,
    borderWidth: 1.5,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    // Soft shadow for depth
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 20,
  },
  titleWrap: {
    alignItems: "center",
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 24,
    height: 12,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    position: "absolute",
    bottom: 48,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  // Decorative background orbs
  orb: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.5,
  },
  orbTopRight: {
    width: SCREEN_W * 0.7,
    height: SCREEN_W * 0.7,
    top: -SCREEN_W * 0.25,
    right: -SCREEN_W * 0.2,
  },
  orbBottomLeft: {
    width: SCREEN_W * 0.5,
    height: SCREEN_W * 0.5,
    bottom: -SCREEN_W * 0.15,
    left: -SCREEN_W * 0.15,
  },
})
