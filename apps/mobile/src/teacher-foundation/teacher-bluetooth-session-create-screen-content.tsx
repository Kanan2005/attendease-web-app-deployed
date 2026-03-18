import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native"
import { useEffect, useRef } from "react"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated"

import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"

type Props = {
  phase: "creating" | "broadcasting" | "error"
  classroomTitle: string
  lectureId: string
  elapsedSeconds: number
  presentCount: number
  totalStudents: number
  advertiserState: string
  errorMessage: string | null
  createError: string | null
  endSessionPending: boolean
  endSessionError: string | null
  onEndSession: () => void
  onRetry: () => void
  onGoBack: () => void
  onRetryPreflight?: () => void
}

function formatTimer(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

function openBluetoothSettings() {
  if (Platform.OS === "android") {
    void Linking.sendIntent("android.settings.BLUETOOTH_SETTINGS")
  } else {
    void Linking.openSettings()
  }
}

function PulsingRing({ active, color }: { active: boolean; color: string }) {
  const scale = useSharedValue(1)
  const opacity = useSharedValue(0.5)

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(withTiming(1.5, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, true)
      opacity.value = withRepeat(withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, true)
    } else {
      cancelAnimation(scale)
      cancelAnimation(opacity)
      scale.value = 1
      opacity.value = 0
    }
  }, [active])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  if (!active) return null

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: 110,
          height: 110,
          borderRadius: 55,
          borderWidth: 3,
          borderColor: color,
        },
        animStyle,
      ]}
    />
  )
}

export function TeacherBluetoothSessionCreateScreenContent({
  phase,
  classroomTitle,
  lectureId,
  elapsedSeconds,
  presentCount,
  totalStudents,
  advertiserState,
  errorMessage,
  createError,
  endSessionPending,
  endSessionError,
  onEndSession,
  onRetry,
  onGoBack,
  onRetryPreflight,
}: Props) {
  const c = getColors()
  const isEnding = endSessionPending
  const isAdvertising = !isEnding && advertiserState === "ADVERTISING"
  const isPermissionIssue = !isEnding && advertiserState === "PERMISSION_REQUIRED"
  const isFailed = !isEnding && advertiserState === "FAILED"
  const hasBluetoothProblem = isPermissionIssue || isFailed
  const isBluetoothOff = !isEnding && (errorMessage?.toLowerCase().includes("turned off") ?? false)

  /* ── Creating phase ── */
  if (phase === "creating") {
    return (
      <View style={{ flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center",
          marginBottom: 24,
        }}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: "800", color: c.text, textAlign: "center" }}>
          Starting Session
        </Text>
        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 8, textAlign: "center", lineHeight: 20 }}>
          Creating attendance session and{"\n"}preparing Bluetooth broadcast…
        </Text>
      </View>
    )
  }

  /* ── Error phase (pre-flight failed, no session created) ── */
  if (phase === "error") {
    const errText = createError ?? errorMessage ?? "An unknown error occurred."
    const isBluetoothOff = errText.toLowerCase().includes("turned off") || errText.toLowerCase().includes("bluetooth is off")
    const isPermission = errText.toLowerCase().includes("permission") || errText.toLowerCase().includes("nearby")
    const canOpenSettings = isBluetoothOff || isPermission

    return (
      <View style={{ flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: isBluetoothOff ? c.warningSoft : c.dangerSoft,
          alignItems: "center", justifyContent: "center", marginBottom: 20,
        }}>
          <Ionicons
            name={isBluetoothOff ? "bluetooth-outline" : isPermission ? "lock-closed-outline" : "alert-circle"}
            size={40}
            color={isBluetoothOff ? c.warning : c.danger}
          />
        </View>
        <Text style={{ fontSize: 20, fontWeight: "800", color: c.text, textAlign: "center" }}>
          {isBluetoothOff ? "Turn on Bluetooth" : isPermission ? "Permission Needed" : "Session Failed"}
        </Text>
        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 8, textAlign: "center", lineHeight: 20, maxWidth: 300 }}>
          {isBluetoothOff
            ? "Bluetooth needs to be on to broadcast\nthe attendance signal to nearby students."
            : isPermission
              ? "Grant the Nearby Devices permission\nso this phone can broadcast Bluetooth."
              : errText}
        </Text>

        <View style={{ marginTop: 28, gap: 10, alignItems: "center", width: "100%" }}>
          {canOpenSettings ? (
            <Pressable
              onPress={openBluetoothSettings}
              style={{
                backgroundColor: c.primary, borderRadius: 14,
                paddingHorizontal: 24, paddingVertical: 16,
                flexDirection: "row", alignItems: "center", gap: 10,
                width: "100%", maxWidth: 280, justifyContent: "center",
                ...mobileTheme.shadow.glow,
              }}
            >
              <Ionicons name={isBluetoothOff ? "bluetooth" : "settings-outline"} size={20} color={c.primaryContrast} />
              <Text style={{ fontSize: 16, fontWeight: "700", color: c.primaryContrast }}>
                {isBluetoothOff ? "Open Bluetooth Settings" : "Open App Settings"}
              </Text>
            </Pressable>
          ) : null}

          {onRetryPreflight ? (
            <Pressable
              onPress={onRetryPreflight}
              style={{
                backgroundColor: c.surfaceRaised, borderRadius: 14,
                paddingHorizontal: 24, paddingVertical: 14,
                borderWidth: 1, borderColor: c.border,
                flexDirection: "row", alignItems: "center", gap: 8,
                width: "100%", maxWidth: 280, justifyContent: "center",
              }}
            >
              <Ionicons name="refresh-outline" size={18} color={c.text} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>Try Again</Text>
            </Pressable>
          ) : null}

          <Pressable onPress={onGoBack} style={{ paddingVertical: 12 }}>
            <Text style={{ fontSize: 14, color: c.textSubtle }}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  /* ── Broadcasting phase (session is live) ── */
  const attendancePct = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      {/* Header */}
      <View style={{
        paddingTop: 56, paddingBottom: 20, paddingHorizontal: 24,
        backgroundColor: isAdvertising ? c.successSoft : hasBluetoothProblem ? c.dangerSoft : c.warningSoft,
      }}>
        <Pressable onPress={onGoBack} hitSlop={12} style={{ marginBottom: 10 }}>
          <Ionicons name="chevron-back" size={26} color={isAdvertising ? c.success : hasBluetoothProblem ? c.danger : c.warning} />
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <View style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: isAdvertising ? c.success : hasBluetoothProblem ? c.danger : c.warning,
          }} />
          <Text style={{
            fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2,
            color: isAdvertising ? c.success : hasBluetoothProblem ? c.danger : c.warning,
          }}>
            {isEnding ? "Ending" : isAdvertising ? "Live" : isBluetoothOff ? "Bluetooth Off" : hasBluetoothProblem ? "Bluetooth Issue" : "Connecting"}
          </Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: "800", color: c.text, marginTop: 2 }} numberOfLines={1}>
          {classroomTitle}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* BLE Status Orb */}
        <View style={{ alignItems: "center", paddingTop: 28, paddingBottom: 12 }}>
          <View style={{ alignItems: "center", justifyContent: "center", width: 120, height: 120 }}>
            <PulsingRing active={isAdvertising} color={c.success} />
            <View
              style={{
                width: 90, height: 90, borderRadius: 45,
                backgroundColor: isAdvertising ? c.successSoft : hasBluetoothProblem ? c.dangerSoft : c.warningSoft,
                alignItems: "center", justifyContent: "center",
                ...mobileTheme.shadow.soft,
              }}
            >
              <Ionicons
                name={isAdvertising ? "bluetooth" : hasBluetoothProblem ? "bluetooth-outline" : "bluetooth"}
                size={44}
                color={isAdvertising ? c.success : hasBluetoothProblem ? c.danger : c.warning}
              />
            </View>
          </View>
          <Text style={{
            fontSize: 15, fontWeight: "700", marginTop: 12,
            color: isAdvertising ? c.success : hasBluetoothProblem ? c.danger : c.warning,
          }}>
            {isEnding
              ? "Ending Session…"
              : isAdvertising
                ? "Broadcasting to Students"
                : isBluetoothOff
                  ? "Bluetooth Turned Off"
                  : hasBluetoothProblem
                    ? "Bluetooth Not Broadcasting"
                    : "Starting Broadcast…"}
          </Text>
          {isAdvertising ? (
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 3 }}>
              Students nearby can mark attendance now
            </Text>
          ) : isBluetoothOff ? (
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 3 }}>
              Turn Bluetooth back on to resume automatically
            </Text>
          ) : null}
        </View>

        {/* BLE Problem Banner (inline, during broadcasting phase) */}
        {hasBluetoothProblem ? (
          <View style={{
            marginHorizontal: 24, marginTop: 4, marginBottom: 12,
            backgroundColor: c.dangerSoft, borderRadius: 14, padding: 16, gap: 10,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="warning-outline" size={18} color={c.danger} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.danger, flex: 1 }}>
                {errorMessage || (isFailed ? "Bluetooth advertising failed" : "Bluetooth permission needed")}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: c.textMuted, lineHeight: 18 }}>
              {isBluetoothOff
                ? "The session is still active. Broadcasting will resume automatically when Bluetooth is turned back on."
                : "The session is active but students can't detect it. Retry or open Bluetooth settings."}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={onRetry}
                style={{
                  flex: 1, backgroundColor: c.danger, borderRadius: 10,
                  paddingVertical: 12, alignItems: "center",
                  flexDirection: "row", justifyContent: "center", gap: 6,
                }}
              >
                <Ionicons name="refresh-outline" size={16} color="#fff" />
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>Retry</Text>
              </Pressable>
              <Pressable
                onPress={openBluetoothSettings}
                style={{
                  flex: 1, backgroundColor: c.surfaceRaised, borderRadius: 10,
                  paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: c.border,
                  flexDirection: "row", justifyContent: "center", gap: 6,
                }}
              >
                <Ionicons name="settings-outline" size={16} color={c.text} />
                <Text style={{ fontSize: 14, fontWeight: "600", color: c.text }}>Settings</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Timer */}
        <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 16 }}>
          <Text style={{
            fontSize: 52, fontWeight: "800", color: c.text,
            fontVariant: ["tabular-nums"], letterSpacing: 2,
          }}>
            {formatTimer(elapsedSeconds)}
          </Text>
          <Text style={{ fontSize: 12, color: c.textSubtle, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.8 }}>
            Session Duration
          </Text>
        </View>

        {/* Metrics Row */}
        <View style={{ flexDirection: "row", paddingHorizontal: 24, gap: 10 }}>
          <View style={{
            flex: 1, backgroundColor: c.surfaceRaised, borderRadius: 16,
            padding: 16, alignItems: "center", ...mobileTheme.shadow.soft,
          }}>
            <Text style={{ fontSize: 36, fontWeight: "800", color: c.success }}>{presentCount}</Text>
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>Present</Text>
          </View>
          <View style={{
            flex: 1, backgroundColor: c.surfaceRaised, borderRadius: 16,
            padding: 16, alignItems: "center", ...mobileTheme.shadow.soft,
          }}>
            <Text style={{ fontSize: 36, fontWeight: "800", color: c.primary }}>{totalStudents}</Text>
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>Total</Text>
          </View>
          <View style={{
            flex: 1, backgroundColor: c.surfaceRaised, borderRadius: 16,
            padding: 16, alignItems: "center", ...mobileTheme.shadow.soft,
          }}>
            <Text style={{ fontSize: 36, fontWeight: "800", color: c.text }}>{attendancePct}%</Text>
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>Rate</Text>
          </View>
        </View>

        {/* End session error */}
        {endSessionError ? (
          <View style={{ paddingHorizontal: 24, marginTop: 12 }}>
            <Text style={{ fontSize: 13, color: c.danger, textAlign: "center" }}>{endSessionError}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky End Session Button */}
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        paddingHorizontal: 24, paddingBottom: 36, paddingTop: 12,
        backgroundColor: c.surface,
      }}>
        <Pressable
          onPress={onEndSession}
          disabled={endSessionPending}
          style={{
            backgroundColor: c.danger, borderRadius: 16,
            paddingVertical: 18, alignItems: "center",
            flexDirection: "row", justifyContent: "center", gap: 8,
            opacity: endSessionPending ? 0.6 : 1,
            ...mobileTheme.shadow.glow,
          }}
        >
          <Ionicons name="stop-circle-outline" size={20} color="#fff" />
          <Text style={{ fontSize: 17, fontWeight: "800", color: "#fff" }}>
            {endSessionPending ? "Ending Session…" : "End Attendance Session"}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
