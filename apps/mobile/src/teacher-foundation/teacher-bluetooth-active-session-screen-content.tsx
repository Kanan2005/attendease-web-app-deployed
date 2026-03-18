import type { ReactNode } from "react"
import { useEffect } from "react"
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native"
import Animated, {
  Easing,
  FadeInDown,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"

import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"

import type { TeacherSessionRosterRowModel } from "../teacher-operational"

type RoutePaths = {
  bluetoothCreate: string | { pathname: string; params?: Record<string, string> }
  sessionHistory: string | { pathname: string; params?: Record<string, string> }
  detail: string | { pathname: string; params?: Record<string, string> }
}

type ActiveStatusModel = {
  stateTone: "primary" | "success" | "warning" | "danger"
  title: string
  message: string
}

type SnapshotModel = {
  stateTone: "primary" | "success" | "warning" | "danger"
  title: string
  message: string
}

type RecoveryModel = {
  shouldShow: boolean
  shouldRefreshBluetooth: boolean
  shouldRetryBroadcast: boolean
  shouldOfferEndSession: boolean
  title: string
  message: string
  stateTone: "primary" | "success" | "warning" | "danger"
}

type EndSessionModel = {
  helperMessage: string
  buttonLabel: string
  buttonDisabled: boolean
}

type ControlModel = {
  helperMessage: string
  canStart: boolean
  canStop: boolean
  startLabel: string
  stopLabel: string
}

type RosterModel = {
  presentSummary: string
  presentRows: TeacherSessionRosterRowModel[]
  absentRows: TeacherSessionRosterRowModel[]
}

type Props = {
  hasTeacherSession: boolean
  isSessionLoading: boolean
  sessionStatusError: string | null
  isStudentsLoading: boolean
  studentsErrorMessage: string | null
  runtimeAvailable: boolean
  runtimeErrorMessage: string | null
  lastPayload: ReactNode
  classroomTitle: string
  lectureTitle: string
  routePaths: RoutePaths
  durationMinutes: number
  rotationWindowSeconds: number
  presentCount: number
  sessionStatus: "ACTIVE" | "ENDED" | "SCHEDULED" | "UNKNOWN"
  activeStatus: ActiveStatusModel
  snapshot: SnapshotModel
  recoveryModel: RecoveryModel
  controlModel: ControlModel
  liveRosterModel: RosterModel
  endSessionModel: EndSessionModel
  endSessionErrorMessage: string | null
  canRefreshStudentList: boolean
  onRefreshStudents: () => void
  onStartBroadcast: () => void
  onStopBroadcast: () => void
  onRefreshAvailability: () => void
  onRetryBroadcast: () => void
  onEndSession: () => void
  onGoBack: () => void
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
  return (parts[0]?.[0] ?? "?").toUpperCase()
}

function StudentRow({ row, index, c }: { row: TeacherSessionRosterRowModel; index: number; c: ReturnType<typeof getColors> }) {
  const isPresent = row.effectiveStatus === "PRESENT"
  return (
    <Animated.View entering={FadeInDown.duration(150).delay(index * 15)}>
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: c.surfaceRaised, borderRadius: 10, borderWidth: 1,
        borderColor: c.border, paddingHorizontal: 12, paddingVertical: 10,
      }}>
        <View style={{
          width: 34, height: 34, borderRadius: 17,
          backgroundColor: isPresent ? c.successSoft : c.surfaceTint,
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: isPresent ? c.success : c.textSubtle }}>
            {getInitials(row.studentDisplayName)}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: c.text }} numberOfLines={1}>{row.studentDisplayName}</Text>
          <Text style={{ fontSize: 11, color: c.textMuted }} numberOfLines={1}>{row.identityLabel}</Text>
        </View>
        <View style={{
          paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
          backgroundColor: isPresent ? c.successSoft : c.dangerSoft,
        }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: isPresent ? c.success : c.danger }}>
            {isPresent ? "PRESENT" : "ABSENT"}
          </Text>
        </View>
      </View>
    </Animated.View>
  )
}

export function TeacherBluetoothActiveSessionScreenContent({
  hasTeacherSession,
  isSessionLoading,
  sessionStatusError,
  isStudentsLoading,
  studentsErrorMessage,
  runtimeAvailable,
  runtimeErrorMessage,
  lastPayload,
  classroomTitle,
  lectureTitle,
  routePaths,
  durationMinutes,
  rotationWindowSeconds,
  presentCount,
  sessionStatus,
  activeStatus,
  snapshot,
  recoveryModel,
  controlModel,
  liveRosterModel,
  endSessionModel,
  endSessionErrorMessage,
  canRefreshStudentList,
  onRefreshStudents,
  onStartBroadcast,
  onStopBroadcast,
  onRefreshAvailability,
  onRetryBroadcast,
  onEndSession,
  onGoBack,
}: Props) {
  const c = getColors()
  const isEnding = endSessionModel.buttonLabel.toLowerCase().includes("ending")
  const isAdvertising = !isEnding && controlModel.canStop
  const isPermissionIssue = !isEnding && (runtimeErrorMessage?.toLowerCase().includes("permission") ?? false)
  const isFailed = !isEnding && (!runtimeAvailable || (runtimeErrorMessage != null && !isPermissionIssue))
  const hasBluetoothProblem = isPermissionIssue || isFailed
  const isBluetoothOff = !isEnding && (runtimeErrorMessage?.toLowerCase().includes("turned off") ?? false)
  const totalStudents = liveRosterModel.presentRows.length + liveRosterModel.absentRows.length
  const attendancePct = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0

  if (!hasTeacherSession) {
    return (
      <View style={{ flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Ionicons name="lock-closed-outline" size={40} color={c.textSubtle} />
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.text, marginTop: 12 }}>Sign in required</Text>
      </View>
    )
  }

  if (isSessionLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center",
          marginBottom: 24,
        }}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: "800", color: c.text }}>Loading Session</Text>
        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 8 }}>Fetching Bluetooth session state…</Text>
      </View>
    )
  }

  if (sessionStatusError) {
    return (
      <View style={{ flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: c.dangerSoft, alignItems: "center", justifyContent: "center",
          marginBottom: 20,
        }}>
          <Ionicons name="alert-circle" size={40} color={c.danger} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: "800", color: c.text, textAlign: "center" }}>Session Error</Text>
        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 8, textAlign: "center", lineHeight: 20, maxWidth: 300 }}>
          {sessionStatusError}
        </Text>
        <Pressable onPress={onGoBack} style={{ marginTop: 24, paddingVertical: 12 }}>
          <Text style={{ fontSize: 14, color: c.primary, fontWeight: "600" }}>Go Back</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      {/* ── Color-coded header ── */}
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
            {isEnding ? "Ending" : isAdvertising ? "Live" : isBluetoothOff ? "Bluetooth Off" : hasBluetoothProblem ? "Issue" : "Connecting"}
          </Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: "800", color: c.text, marginTop: 2 }} numberOfLines={1}>
          {classroomTitle}
        </Text>
        {lectureTitle.length > 0 ? (
          <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 2 }} numberOfLines={1}>
            {lectureTitle}
          </Text>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* ── BLE Status Orb ── */}
        <View style={{ alignItems: "center", paddingTop: 28, paddingBottom: 12 }}>
          <View style={{ alignItems: "center", justifyContent: "center", width: 120, height: 120 }}>
            <PulsingRing active={isAdvertising} color={c.success} />
            <View style={{
              width: 90, height: 90, borderRadius: 45,
              backgroundColor: isAdvertising ? c.successSoft : hasBluetoothProblem ? c.dangerSoft : c.warningSoft,
              alignItems: "center", justifyContent: "center",
              ...mobileTheme.shadow.soft,
            }}>
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
                    ? "Not Broadcasting"
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

        {/* ── BLE Problem Banner ── */}
        {hasBluetoothProblem ? (
          <View style={{
            marginHorizontal: 24, marginTop: 4, marginBottom: 12,
            backgroundColor: c.dangerSoft, borderRadius: 14, padding: 16, gap: 10,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="warning-outline" size={18} color={c.danger} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.danger, flex: 1 }}>
                {runtimeErrorMessage || (isFailed ? "Bluetooth advertising failed" : "Bluetooth permission needed")}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: c.textMuted, lineHeight: 18 }}>
              {isBluetoothOff
                ? "The session is still active. Broadcasting will resume automatically when Bluetooth is turned back on."
                : !runtimeAvailable
                  ? "Advertiser config is missing. Go back to setup and recreate the session."
                  : "The session is active but students can't detect it. Retry or open Bluetooth settings."}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {recoveryModel.shouldRetryBroadcast ? (
                <Pressable
                  onPress={onRetryBroadcast}
                  style={{
                    flex: 1, backgroundColor: c.danger, borderRadius: 10,
                    paddingVertical: 12, alignItems: "center",
                    flexDirection: "row", justifyContent: "center", gap: 6,
                  }}
                >
                  <Ionicons name="refresh-outline" size={16} color="#fff" />
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>Retry</Text>
                </Pressable>
              ) : null}
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

        {/* ── Metrics Row ── */}
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

        {/* ── Session details chips ── */}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, marginTop: 14, paddingHorizontal: 24 }}>
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 5,
            backgroundColor: c.surfaceTint, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
          }}>
            <Ionicons name="time-outline" size={13} color={c.textSubtle} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>{durationMinutes}m</Text>
          </View>
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 5,
            backgroundColor: c.surfaceTint, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
          }}>
            <Ionicons name="sync-outline" size={13} color={c.textSubtle} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>{rotationWindowSeconds}s rotation</Text>
          </View>
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 5,
            backgroundColor: isAdvertising ? c.successSoft : c.surfaceTint,
            borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
          }}>
            <Ionicons name="radio-outline" size={13} color={isAdvertising ? c.success : c.textSubtle} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: isAdvertising ? c.success : c.textMuted }}>
              {sessionStatus === "ACTIVE" ? "Active" : sessionStatus.charAt(0) + sessionStatus.slice(1).toLowerCase()}
            </Text>
          </View>
        </View>

        {/* ── Broadcast Controls (compact) ── */}
        {runtimeAvailable ? (
          <View style={{ flexDirection: "row", paddingHorizontal: 24, gap: 10, marginTop: 16 }}>
            {controlModel.canStart ? (
              <Pressable
                onPress={onStartBroadcast}
                style={{
                  flex: 1, backgroundColor: c.primary, borderRadius: 12,
                  paddingVertical: 14, alignItems: "center",
                  flexDirection: "row", justifyContent: "center", gap: 8,
                  ...mobileTheme.shadow.glow,
                }}
              >
                <Ionicons name="play" size={16} color={c.primaryContrast} />
                <Text style={{ fontSize: 15, fontWeight: "700", color: c.primaryContrast }}>{controlModel.startLabel}</Text>
              </Pressable>
            ) : null}
            {controlModel.canStop ? (
              <Pressable
                onPress={onStopBroadcast}
                style={{
                  flex: 1, backgroundColor: c.surfaceRaised, borderRadius: 12,
                  paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: c.border,
                  flexDirection: "row", justifyContent: "center", gap: 8,
                }}
              >
                <Ionicons name="pause" size={16} color={c.text} />
                <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>{controlModel.stopLabel}</Text>
              </Pressable>
            ) : null}
            {recoveryModel.shouldRefreshBluetooth ? (
              <Pressable
                onPress={onRefreshAvailability}
                style={{
                  flex: 1, backgroundColor: c.surfaceRaised, borderRadius: 12,
                  paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: c.border,
                  flexDirection: "row", justifyContent: "center", gap: 8,
                }}
              >
                <Ionicons name="refresh-outline" size={16} color={c.primary} />
                <Text style={{ fontSize: 15, fontWeight: "700", color: c.primary }}>Refresh BT</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* ── Live Student List ── */}
        <View style={{ paddingHorizontal: 24, marginTop: 24, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="people" size={18} color={c.text} />
              <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }}>Live Roster</Text>
            </View>
            <Pressable
              onPress={onRefreshStudents}
              disabled={!canRefreshStudentList}
              hitSlop={8}
              style={{ opacity: canRefreshStudentList ? 1 : 0.4 }}
            >
              <Ionicons name="refresh-outline" size={20} color={c.primary} />
            </Pressable>
          </View>

          {isStudentsLoading ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <ActivityIndicator size="small" color={c.primary} />
              <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 8 }}>Loading students…</Text>
            </View>
          ) : studentsErrorMessage ? (
            <View style={{
              backgroundColor: c.dangerSoft, borderRadius: 12, padding: 14,
              flexDirection: "row", alignItems: "center", gap: 8,
            }}>
              <Ionicons name="alert-circle" size={18} color={c.danger} />
              <Text style={{ fontSize: 13, color: c.danger, flex: 1 }}>{studentsErrorMessage}</Text>
            </View>
          ) : (
            <>
              {/* Present section */}
              {liveRosterModel.presentRows.length > 0 ? (
                <>
                  <View style={{
                    flexDirection: "row", alignItems: "center", gap: 6,
                    backgroundColor: c.successSoft, borderRadius: 8,
                    paddingHorizontal: 12, paddingVertical: 6,
                  }}>
                    <Ionicons name="checkmark-circle" size={14} color={c.success} />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: c.success }}>
                      Present ({liveRosterModel.presentRows.length})
                    </Text>
                  </View>
                  {liveRosterModel.presentRows.map((row, i) => (
                    <StudentRow key={row.attendanceRecordId} row={row} index={i} c={c} />
                  ))}
                </>
              ) : null}

              {/* Absent section */}
              {liveRosterModel.absentRows.length > 0 ? (
                <>
                  <View style={{
                    flexDirection: "row", alignItems: "center", gap: 6,
                    backgroundColor: c.dangerSoft, borderRadius: 8,
                    paddingHorizontal: 12, paddingVertical: 6,
                    marginTop: liveRosterModel.presentRows.length > 0 ? 8 : 0,
                  }}>
                    <Ionicons name="close-circle" size={14} color={c.danger} />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: c.danger }}>
                      Absent ({liveRosterModel.absentRows.length})
                    </Text>
                  </View>
                  {liveRosterModel.absentRows.map((row, i) => (
                    <StudentRow key={row.attendanceRecordId} row={row} index={i + liveRosterModel.presentRows.length} c={c} />
                  ))}
                </>
              ) : null}

              {totalStudents === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 24, gap: 6 }}>
                  <Ionicons name="people-outline" size={32} color={c.textSubtle} />
                  <Text style={{ fontSize: 13, color: c.textMuted }}>No students enrolled in this session yet</Text>
                </View>
              ) : null}
            </>
          )}
        </View>

        {/* ── End session error ── */}
        {endSessionErrorMessage ? (
          <View style={{ paddingHorizontal: 24, marginTop: 12 }}>
            <Text style={{ fontSize: 13, color: c.danger, textAlign: "center" }}>{endSessionErrorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Sticky End Session Button ── */}
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        paddingHorizontal: 24, paddingBottom: 36, paddingTop: 12,
        backgroundColor: c.surface,
      }}>
        <Pressable
          onPress={onEndSession}
          disabled={endSessionModel.buttonDisabled}
          style={{
            backgroundColor: c.danger, borderRadius: 16,
            paddingVertical: 18, alignItems: "center",
            flexDirection: "row", justifyContent: "center", gap: 8,
            opacity: endSessionModel.buttonDisabled ? 0.6 : 1,
            ...mobileTheme.shadow.glow,
          }}
        >
          <Ionicons name="stop-circle-outline" size={20} color="#fff" />
          <Text style={{ fontSize: 17, fontWeight: "800", color: "#fff" }}>
            {endSessionModel.buttonLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
