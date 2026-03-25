import { getColors } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native"

import {
  StudentErrorCard,
  StudentLoadingCard,
  StudentScreen,
  StudentSessionSetupCard,
  formatDateTime,
  styles,
} from "./shared-ui"

type Props = {
  hasSession: boolean
  isLoading: boolean
  loadError: string | null
  phase: "scanning" | "marking" | "success" | "error"
  errorMessage: string | null
  isBluetoothOff: boolean
  isPermissionIssue: boolean
  noCandidates: boolean
  scannerState: string
  classroomTitle: string | null
  markData: { markedAt?: string; presentCount?: number; absentCount?: number } | null
  onRetry: () => void
  onOpenSettings: () => void
}

export function StudentBluetoothAttendanceScreenContent(props: Props) {
  const c = getColors()

  return (
    <StudentScreen
      title="Bluetooth Attendance"
      subtitle={props.classroomTitle ?? "Detecting teacher signal…"}
    >
      {!props.hasSession ? (
        <StudentSessionSetupCard />
      ) : props.isLoading ? (
        <StudentLoadingCard label="Preparing Bluetooth…" />
      ) : props.loadError ? (
        <StudentErrorCard label={props.loadError} />
      ) : props.isBluetoothOff ? (
        <View style={{ alignItems: "center", gap: 16, paddingVertical: 40 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: c.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="bluetooth" size={40} color={c.primary} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: c.text }}>Bluetooth is Off</Text>
          <Text
            style={{ fontSize: 14, color: c.textMuted, textAlign: "center", paddingHorizontal: 32 }}
          >
            Turn on Bluetooth in your device settings to detect your teacher's signal.
          </Text>
          <Pressable
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: c.primary,
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 28,
            }}
            onPress={() => void Linking.openSettings()}
          >
            <Ionicons name="settings-outline" size={18} color="#fff" />
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Open Settings</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={props.onRetry}>
            <Text style={styles.secondaryButtonLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : props.isPermissionIssue ? (
        <View style={{ alignItems: "center", gap: 16, paddingVertical: 40 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: c.warningSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="shield-outline" size={40} color={c.warning} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: c.text }}>
            Bluetooth Permission Needed
          </Text>
          <Text
            style={{ fontSize: 14, color: c.textMuted, textAlign: "center", paddingHorizontal: 32 }}
          >
            {props.errorMessage ??
              "Allow Nearby Devices or Bluetooth scan access so AttendEase can detect your teacher's signal."}
          </Text>
          <Pressable
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: c.primary,
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 28,
            }}
            onPress={() => void Linking.openSettings()}
          >
            <Ionicons name="settings-outline" size={18} color="#fff" />
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Open Settings</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={props.onRetry}>
            <Text style={styles.secondaryButtonLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : props.noCandidates ? (
        <View style={{ alignItems: "center", gap: 16, paddingVertical: 40 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: c.surfaceTint,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="bluetooth-outline" size={40} color={c.textSubtle} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: c.text }}>No Active Sessions</Text>
          <Text
            style={{ fontSize: 14, color: c.textMuted, textAlign: "center", paddingHorizontal: 32 }}
          >
            There are no Bluetooth attendance sessions open right now. Ask your teacher to start
            one.
          </Text>
          <Pressable style={styles.secondaryButton} onPress={props.onRetry}>
            <Text style={styles.secondaryButtonLabel}>Refresh</Text>
          </Pressable>
        </View>
      ) : props.phase === "success" ? (
        <View style={{ alignItems: "center", gap: 12, paddingVertical: 40 }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: c.successSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="checkmark-circle" size={64} color={c.success} />
          </View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: c.success }}>
            Attendance Marked!
          </Text>
          {props.classroomTitle ? (
            <Text style={{ fontSize: 15, color: c.textMuted }}>{props.classroomTitle}</Text>
          ) : null}
          {props.markData?.markedAt ? (
            <Text style={{ fontSize: 13, color: c.textSubtle }}>
              {formatDateTime(props.markData.markedAt)}
            </Text>
          ) : null}
        </View>
      ) : props.phase === "error" ? (
        <View style={{ alignItems: "center", gap: 16, paddingVertical: 40 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: c.dangerSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close-circle" size={48} color={c.danger} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: c.danger }}>Failed</Text>
          <Text
            style={{ fontSize: 14, color: c.textMuted, textAlign: "center", paddingHorizontal: 32 }}
          >
            {props.errorMessage ?? "Could not mark attendance. Please try again."}
          </Text>
          <Pressable
            style={[styles.primaryButton, { paddingHorizontal: 32 }]}
            onPress={props.onRetry}
          >
            <Text style={styles.primaryButtonLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ alignItems: "center", gap: 16, paddingVertical: 40 }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: props.phase === "marking" ? c.successSoft : c.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {props.phase === "marking" ? (
              <ActivityIndicator size="large" color={c.success} />
            ) : (
              <Ionicons name="bluetooth" size={48} color={c.primary} />
            )}
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: c.text }}>
            {props.phase === "marking" ? "Marking Attendance…" : "Scanning for Teacher…"}
          </Text>
          <Text
            style={{ fontSize: 14, color: c.textMuted, textAlign: "center", paddingHorizontal: 32 }}
          >
            {props.phase === "marking"
              ? "Teacher signal detected. Submitting your attendance now."
              : "Keep your phone near your teacher. Attendance will be marked automatically."}
          </Text>
          {props.classroomTitle ? (
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.primary }}>
              {props.classroomTitle}
            </Text>
          ) : null}
          {props.phase === "scanning" ? (
            <ActivityIndicator size="small" color={c.primary} style={{ marginTop: 8 }} />
          ) : null}
        </View>
      )}
    </StudentScreen>
  )
}
