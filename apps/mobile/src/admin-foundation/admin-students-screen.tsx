import { getColors } from "@attendease/ui-mobile"
import { AnimatedCard, StatCard } from "@attendease/ui-mobile/animated"
import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, View } from "react-native"

import { adminRoutes } from "../admin-routes"
import { useAdminSession } from "../admin-session"
import { useAdminStudentsQuery } from "./queries"
import { AdminEmptyCard, AdminErrorCard, AdminLoadingCard, AdminNavAction, AdminScreen, AdminSessionSetupCard, styles } from "./shared-ui"

function formatEnum(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function AdminStudentsScreen() {
  const { session } = useAdminSession()
  const c = getColors()
  const studentsQuery = useAdminStudentsQuery()

  const students = studentsQuery.data ?? []
  const activeCount = students.filter((s) => s.student.status === "ACTIVE").length
  const withDeviceCount = students.filter((s) => s.activeBinding !== null).length

  return (
    <AdminScreen title="Students" subtitle="Enrollments and attendance overview.">
      {!session ? (
        <AdminSessionSetupCard />
      ) : studentsQuery.isLoading ? (
        <AdminLoadingCard label="Loading students…" />
      ) : studentsQuery.error ? (
        <AdminErrorCard label="Unable to load students. Please try again." />
      ) : students.length === 0 ? (
        <AdminEmptyCard label="No students registered yet." />
      ) : (
        <>
          <AnimatedCard index={0}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: c.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="people" size={22} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Student Management</Text>
                <Text style={styles.listMeta}>{students.length} registered student{students.length === 1 ? "" : "s"}</Text>
              </View>
            </View>
          </AnimatedCard>

          <View style={styles.cardGrid}>
            <StatCard label="Total Students" value={students.length} tone="primary" index={1} />
            <StatCard label="Active" value={activeCount} tone="success" index={2} />
            <StatCard label="With Device" value={withDeviceCount} tone="warning" index={3} />
          </View>

          <AnimatedCard index={4}>
            <Text style={styles.cardTitle}>Student Directory</Text>
            {students.slice(0, 20).map((entry, i) => (
              <View
                key={entry.student.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 10,
                  borderBottomWidth: i < Math.min(students.length, 20) - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: c.border,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: c.primarySoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "700", color: c.primary }}>
                    {entry.student.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={styles.listTitle}>{entry.student.displayName}</Text>
                  <Text style={styles.listMeta}>
                    {entry.student.rollNumber ?? entry.student.email} · {formatEnum(entry.student.status)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  {entry.activeBinding ? (
                    <Ionicons name="phone-portrait" size={16} color={c.success} />
                  ) : (
                    <Ionicons name="phone-portrait-outline" size={16} color={c.textSubtle} />
                  )}
                  <Text style={{ fontSize: 11, color: entry.enrollmentCounts.activeCount > 0 ? c.success : c.textSubtle }}>
                    {entry.enrollmentCounts.activeCount} active
                  </Text>
                </View>
              </View>
            ))}
            {students.length > 20 ? (
              <Text style={[styles.listMeta, { marginTop: 10, textAlign: "center" }]}>
                + {students.length - 20} more student{students.length - 20 === 1 ? "" : "s"}
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
