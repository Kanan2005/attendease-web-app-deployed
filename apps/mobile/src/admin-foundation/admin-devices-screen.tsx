import { getColors } from "@attendease/ui-mobile"
import { AnimatedCard, StatCard } from "@attendease/ui-mobile/animated"
import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, View } from "react-native"

import { adminRoutes } from "../admin-routes"
import { useAdminSession } from "../admin-session"
import { useAdminDeviceSupportQuery } from "./queries"
import { AdminEmptyCard, AdminErrorCard, AdminLoadingCard, AdminNavAction, AdminScreen, AdminSessionSetupCard, styles } from "./shared-ui"

function formatEnum(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function AdminDevicesScreen() {
  const { session } = useAdminSession()
  const c = getColors()
  const devicesQuery = useAdminDeviceSupportQuery()

  const devices = devicesQuery.data ?? []
  const withActiveBinding = devices.filter((d) => d.activeBinding !== null).length
  const withPending = devices.filter((d) => d.pendingBinding !== null).length
  const withSecurityEvent = devices.filter((d) => d.latestSecurityEvent !== null).length

  return (
    <AdminScreen title="Devices" subtitle="Trust status and pending approvals.">
      {!session ? (
        <AdminSessionSetupCard />
      ) : devicesQuery.isLoading ? (
        <AdminLoadingCard label="Loading device records…" />
      ) : devicesQuery.error ? (
        <AdminErrorCard label="Unable to load device records. Please try again." />
      ) : devices.length === 0 ? (
        <AdminEmptyCard label="No device records found." />
      ) : (
        <>
          <AnimatedCard index={0}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: c.successSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="phone-portrait" size={22} color={c.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Device Trust</Text>
                <Text style={styles.listMeta}>{devices.length} student record{devices.length === 1 ? "" : "s"}</Text>
              </View>
            </View>
          </AnimatedCard>

          <View style={styles.cardGrid}>
            <StatCard label="Active Devices" value={withActiveBinding} tone="success" index={1} />
            <StatCard label="Pending Approval" value={withPending} tone="warning" index={2} />
            {withSecurityEvent > 0 ? (
              <StatCard label="Security Flags" value={withSecurityEvent} tone="danger" index={3} />
            ) : null}
          </View>

          <AnimatedCard index={4}>
            <Text style={styles.cardTitle}>Device Records</Text>
            {devices.slice(0, 20).map((entry, i) => (
              <View
                key={entry.student.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 10,
                  borderBottomWidth: i < Math.min(devices.length, 20) - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: c.border,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: entry.activeBinding ? c.successSoft : entry.pendingBinding ? c.warningSoft : c.surfaceTint,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={entry.activeBinding ? "checkmark-circle" : entry.pendingBinding ? "time" : "close-circle-outline"}
                    size={18}
                    color={entry.activeBinding ? c.success : entry.pendingBinding ? c.warning : c.textSubtle}
                  />
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={styles.listTitle}>{entry.student.displayName}</Text>
                  <Text style={styles.listMeta}>
                    {formatEnum(entry.attendanceDeviceState)} · {entry.activeBindingCount} binding{entry.activeBindingCount === 1 ? "" : "s"}
                  </Text>
                </View>
                {entry.latestSecurityEvent ? (
                  <Ionicons name="warning" size={16} color={c.danger} />
                ) : null}
              </View>
            ))}
            {devices.length > 20 ? (
              <Text style={[styles.listMeta, { marginTop: 10, textAlign: "center" }]}>
                + {devices.length - 20} more record{devices.length - 20 === 1 ? "" : "s"}
              </Text>
            ) : null}
          </AnimatedCard>

          <View style={styles.actionGrid}>
            <AdminNavAction href={adminRoutes.dashboard} label="Back to Dashboard" icon="arrow-back-outline" />
          </View>
        </>
      )}
    </AdminScreen>
  )
}
