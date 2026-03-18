import { getColors } from "@attendease/ui-mobile"
import { AnimatedCard, StatCard } from "@attendease/ui-mobile/animated"
import { Ionicons } from "@expo/vector-icons"
import { Text, View } from "react-native"

import { adminRoutes } from "../admin-routes"
import { useAdminSession } from "../admin-session"
import { useAdminClassroomsQuery, useAdminStudentsQuery } from "./queries"
import { AdminEmptyCard, AdminErrorCard, AdminLoadingCard, AdminNavAction, AdminScreen, AdminSessionSetupCard, styles } from "./shared-ui"

function formatClassroomStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((s) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`)
    .join(" ")
}

export function AdminClassroomsScreen() {
  const { session } = useAdminSession()
  const c = getColors()
  const studentsQuery = useAdminStudentsQuery()
  const classroomsQuery = useAdminClassroomsQuery()

  const students = studentsQuery.data ?? []
  const classrooms = classroomsQuery.data ?? []
  const totalEnrollments = students.reduce((sum, s) => sum + s.enrollmentCounts.totalCount, 0)
  const activeEnrollments = students.reduce((sum, s) => sum + s.enrollmentCounts.activeCount, 0)
  const isLoading = studentsQuery.isLoading || classroomsQuery.isLoading
  const loadError = studentsQuery.error ?? classroomsQuery.error

  return (
    <AdminScreen title="Classrooms" subtitle="Enrollment and capacity overview.">
      {!session ? (
        <AdminSessionSetupCard />
      ) : isLoading ? (
        <AdminLoadingCard label="Loading classroom data…" />
      ) : loadError ? (
        <AdminErrorCard label="Unable to load classroom data. Please try again." />
      ) : classrooms.length === 0 && students.length === 0 ? (
        <AdminEmptyCard label="No classrooms or enrollment data available yet." />
      ) : (
        <>
          <View style={styles.cardGrid}>
            <StatCard label="Classrooms" value={classrooms.length} tone="primary" index={0} />
            <StatCard label="Total Enrollments" value={totalEnrollments} tone="primary" index={1} />
            <StatCard label="Active Enrollments" value={activeEnrollments} tone="success" index={2} />
          </View>

          {classrooms.length > 0 ? (
            <AnimatedCard index={3}>
              <Text style={styles.cardTitle}>Classroom Directory</Text>
              {classrooms.map((classroom, i) => {
                const statusColor =
                  classroom.status === "ACTIVE" ? c.success
                  : classroom.status === "ARCHIVED" ? c.textSubtle
                  : c.warning
                return (
                  <View
                    key={classroom.id}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: i < classrooms.length - 1 ? 0.5 : 0,
                      borderBottomColor: c.border,
                      gap: 4,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: c.primarySoft,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="library" size={16} color={c.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listTitle} numberOfLines={1}>
                          {classroom.displayTitle}
                        </Text>
                        <Text style={styles.listMeta} numberOfLines={1}>
                          {classroom.code} · {classroom.primaryTeacherDisplayName ?? "No teacher"}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: statusColor }}>
                        {formatClassroomStatus(classroom.status)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 12, marginLeft: 46 }}>
                      <Text style={styles.listMeta}>
                        {classroom.governance.activeStudentCount} student{classroom.governance.activeStudentCount === 1 ? "" : "s"}
                      </Text>
                      {classroom.activeJoinCode ? (
                        <Text style={styles.listMeta}>
                          Join: {classroom.activeJoinCode.code}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                )
              })}
            </AnimatedCard>
          ) : null}

          <View style={styles.actionGrid}>
            <AdminNavAction href={adminRoutes.students} label="View Students" icon="people-outline" />
            <AdminNavAction href={adminRoutes.devices} label="View Devices" icon="phone-portrait-outline" />
            <AdminNavAction href={adminRoutes.dashboard} label="Back to Dashboard" icon="arrow-back-outline" />
          </View>
        </>
      )}
    </AdminScreen>
  )
}
