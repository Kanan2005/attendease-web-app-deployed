import { getColors } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import type React from "react"
import type { ComponentType } from "react"
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native"

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
  phase:
    | "loading"
    | "camera_denied"
    | "location_denied"
    | "location_unavailable"
    | "camera"
    | "verifying"
    | "success"
    | "already_marked" // v2.0: API returned 409 — attendance already recorded
    | "error"
  errorMessage: string | null
  gpsStatus: "pending" | "acquiring" | "ready" | "denied" | "unavailable"
  isLocationError: boolean
  CameraView: ComponentType<{
    style?: object
    zoom?: number
    barcodeScannerSettings?: { barcodeTypes: string[] }
    onBarcodeScanned?: (event: { data?: string }) => void
  }> | null
  markData: { distanceMeters?: number; markedAt?: string } | null
  classroomTitle: string | null
  onBarcodeScan: (payload: string) => void
  onRetry: () => void
  onGoBack: () => void
}

export function StudentQrAttendanceScreenContent(props: Props) {
  const c = getColors()
  const CameraPreview = props.CameraView

  return (
    <StudentScreen
      title="QR Attendance"
      subtitle={props.classroomTitle ?? "Scan the teacher's QR code"}
    >
      {!props.hasSession ? (
        <StudentSessionSetupCard />
      ) : props.isLoading || props.phase === "loading" ? (
        <StudentLoadingCard label="Opening camera…" />
      ) : props.loadError ? (
        <StudentErrorCard label={props.loadError} />
      ) : props.phase === "location_unavailable" ? (
        <View style={{ alignItems: "center", gap: 16, paddingVertical: 40 }}>
          <View style={localStyles.iconCircle(c.warningSoft)}>
            <Ionicons name="location-outline" size={40} color={c.warning} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: c.text }}>
            Location Services Off
          </Text>
          <Text
            style={{ fontSize: 14, color: c.textMuted, textAlign: "center", paddingHorizontal: 32 }}
          >
            QR attendance requires GPS to verify you are in the classroom. Turn on Location Services
            in your device settings.
          </Text>
          <Pressable
            style={localStyles.settingsButton(c.primary)}
            onPress={() => void Linking.openSettings()}
          >
            <Ionicons name="settings-outline" size={18} color="#fff" />
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Open Settings</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={props.onRetry}>
            <Text style={styles.secondaryButtonLabel}>Retry</Text>
          </Pressable>
          <Pressable onPress={props.onGoBack} hitSlop={12}>
            <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 4 }}>Go Back</Text>
          </Pressable>
        </View>
      ) : props.phase === "location_denied" ? (
        <View style={{ alignItems: "center", gap: 16, paddingVertical: 40 }}>
          <View style={localStyles.iconCircle(c.dangerSoft)}>
            <Ionicons name="location-outline" size={40} color={c.danger} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: c.text }}>
            Location Access Denied
          </Text>
          <Text
            style={{ fontSize: 14, color: c.textMuted, textAlign: "center", paddingHorizontal: 32 }}
          >
            QR attendance needs location access to verify you are near the teacher. Please enable it
            in your device settings.
          </Text>
          <Pressable
            style={localStyles.settingsButton(c.primary)}
            onPress={() => void Linking.openSettings()}
          >
            <Ionicons name="settings-outline" size={18} color="#fff" />
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Open Settings</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={props.onRetry}>
            <Text style={styles.secondaryButtonLabel}>Retry</Text>
          </Pressable>
          <Pressable onPress={props.onGoBack} hitSlop={12}>
            <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 4 }}>Go Back</Text>
          </Pressable>
        </View>
      ) : props.phase === "camera_denied" ? (
        <View style={{ alignItems: "center", gap: 16, paddingVertical: 40 }}>
          <View style={localStyles.iconCircle(c.dangerSoft)}>
            <Ionicons name="camera-outline" size={40} color={c.danger} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: c.text }}>
            Camera Access Denied
          </Text>
          <Text
            style={{ fontSize: 14, color: c.textMuted, textAlign: "center", paddingHorizontal: 32 }}
          >
            QR attendance needs camera access to scan the code. Please enable it in your device
            settings.
          </Text>
          <Pressable
            style={localStyles.settingsButton(c.primary)}
            onPress={() => void Linking.openSettings()}
          >
            <Ionicons name="settings-outline" size={18} color="#fff" />
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Open Settings</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={props.onRetry}>
            <Text style={styles.secondaryButtonLabel}>Retry</Text>
          </Pressable>
          <Pressable onPress={props.onGoBack} hitSlop={12}>
            <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 4 }}>Go Back</Text>
          </Pressable>
        </View>
      ) : props.phase === "success" ? (
        <View style={{ alignItems: "center", gap: 12, paddingVertical: 40 }}>
          <View style={localStyles.iconCircle(c.successSoft)}>
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
          {/* v2.0: Done button to navigate back after successful attendance */}
          <Pressable
            style={[styles.primaryButton, { paddingHorizontal: 40, marginTop: 8 }]}
            onPress={props.onGoBack}
          >
            <Text style={styles.primaryButtonLabel}>Done</Text>
          </Pressable>
        </View>
      ) : props.phase === "error" ? (
        <View style={{ alignItems: "center", gap: 16, paddingVertical: 40 }}>
          <View style={localStyles.iconCircle(c.dangerSoft)}>
            <Ionicons name="close-circle" size={48} color={c.danger} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: c.danger }}>Failed</Text>
          <Text
            style={{ fontSize: 14, color: c.textMuted, textAlign: "center", paddingHorizontal: 32 }}
          >
            {props.errorMessage ?? "Could not mark attendance. Please try again."}
          </Text>
          {props.isLocationError ? (
            <Pressable
              style={localStyles.settingsButton(c.primary)}
              onPress={() => void Linking.openSettings()}
            >
              <Ionicons name="settings-outline" size={18} color="#fff" />
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Open Settings</Text>
            </Pressable>
          ) : null}
          {/* v2.0: Two actions — Scan Again re-opens camera with fresh GPS,
              Go Back returns to previous screen */}
          <Pressable
            style={[styles.primaryButton, { paddingHorizontal: 32 }]}
            onPress={props.onRetry}
          >
            <Text style={styles.primaryButtonLabel}>Scan Again</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={props.onGoBack}>
            <Text style={styles.secondaryButtonLabel}>Go Back</Text>
          </Pressable>
        </View>
      ) : props.phase === "already_marked" ? (
        /* v2.0: API returned 409 — student already has attendance for this session.
           Shows a friendly info screen instead of a red error. */
        <View style={{ alignItems: "center", gap: 12, paddingVertical: 40 }}>
          <View style={localStyles.iconCircle(c.warningSoft)}>
            <Ionicons name="checkmark-done-circle" size={64} color={c.warning} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: "800", color: c.warning }}>
            Already Marked
          </Text>
          <Text
            style={{ fontSize: 14, color: c.textMuted, textAlign: "center", paddingHorizontal: 32 }}
          >
            Your attendance has already been recorded for this session. No action needed.
          </Text>
          {props.classroomTitle ? (
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.primary }}>
              {props.classroomTitle}
            </Text>
          ) : null}
          <Pressable
            style={[styles.primaryButton, { paddingHorizontal: 40, marginTop: 8 }]}
            onPress={props.onGoBack}
          >
            <Text style={styles.primaryButtonLabel}>Done</Text>
          </Pressable>
        </View>
      ) : props.phase === "verifying" ? (
        <View style={{ alignItems: "center", gap: 16, paddingVertical: 40 }}>
          <View style={localStyles.iconCircle(c.primarySoft)}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: c.text }}>
            Verifying & Marking…
          </Text>
          <Text
            style={{ fontSize: 14, color: c.textMuted, textAlign: "center", paddingHorizontal: 32 }}
          >
            Checking enrollment, verifying GPS, and marking your attendance.
          </Text>
          {props.classroomTitle ? (
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.primary }}>
              {props.classroomTitle}
            </Text>
          ) : null}
        </View>
      ) : CameraPreview ? (
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: c.text, textAlign: "center" }}>
            {props.gpsStatus === "ready"
              ? "Point the camera at the QR code"
              : "Waiting for GPS lock before you can scan…"}
          </Text>
          <View
            style={{
              borderRadius: 16,
              overflow: "hidden",
              aspectRatio: 1,
              backgroundColor: "#000",
            }}
          >
            <CameraPreview
              style={StyleSheet.absoluteFill}
              zoom={0}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={(event: { data?: string }) => {
                if (typeof event.data === "string" && event.data.length > 0) {
                  props.onBarcodeScan(event.data)
                }
              }}
            />
            {/* v2.0: Overlay blocks scanning while GPS acquires — QR codes rotate
                frequently so we must have location ready before processing any scan. */}
            {props.gpsStatus !== "ready" && (
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: "rgba(0, 0, 0, 0.35)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <ActivityIndicator size="small" color="#fff" />
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: "600",
                    marginTop: 8,
                    textAlign: "center",
                    paddingHorizontal: 24,
                  }}
                >
                  Acquiring GPS… scanning will activate once locked
                </Text>
              </View>
            )}
          </View>
          <GpsStatusBanner status={props.gpsStatus} />
          <Text style={{ fontSize: 13, color: c.textMuted, textAlign: "center" }}>
            {props.gpsStatus === "ready"
              ? "Attendance will be marked automatically after scanning."
              : "Scanning is disabled until GPS locks — please wait."}
          </Text>
          {/* v2.0: Go Back link so students aren't stuck on camera during GPS acquisition */}
          <Pressable onPress={props.onGoBack} hitSlop={12} style={{ alignSelf: "center" }}>
            <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 4 }}>Go Back</Text>
          </Pressable>
        </View>
      ) : (
        <StudentLoadingCard label="Preparing camera…" />
      )}
    </StudentScreen>
  )
}

function GpsStatusBanner(props: {
  status: "pending" | "acquiring" | "ready" | "denied" | "unavailable"
}) {
  const c = getColors()
  let icon: React.ComponentProps<typeof Ionicons>["name"] = "location-outline"
  let label = ""
  let color = c.textMuted
  let bg = c.surfaceMuted

  switch (props.status) {
    case "ready":
      icon = "checkmark-circle"
      label = "GPS locked"
      color = c.success
      bg = c.successSoft
      break
    case "acquiring":
      // v2.0: Warning-level colors to emphasize GPS is not yet ready for attendance
      icon = "locate-outline"
      label = "Acquiring GPS…"
      color = c.warning
      bg = c.warningSoft
      break
    case "denied":
      icon = "warning-outline"
      label = "GPS denied — scan may fail"
      color = c.danger
      bg = c.dangerSoft
      break
    case "unavailable":
      icon = "warning-outline"
      label = "GPS unavailable"
      color = c.warning
      bg = c.warningSoft
      break
    default:
      // v2.0: Warning-level colors for pending state to draw attention
      icon = "locate-outline"
      label = "GPS pending"
      color = c.warning
      bg = c.warningSoft
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: bg,
        alignSelf: "center",
      }}
    >
      <Ionicons name={icon} size={16} color={color} />
      <Text style={{ fontSize: 13, fontWeight: "600", color }}>{label}</Text>
    </View>
  )
}

const localStyles = {
  iconCircle: (bg: string) => ({
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: bg,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  }),
  settingsButton: (bg: string) => ({
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: bg,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  }),
}
