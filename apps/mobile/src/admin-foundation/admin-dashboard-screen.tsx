import { getColors } from "@attendease/ui-mobile"
import { AnimatedCard, StatCard } from "@attendease/ui-mobile/animated"
import { Ionicons } from "@expo/vector-icons"
import { Link } from "expo-router"
import { Pressable, Text, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"

import { adminRoutes } from "../admin-routes"
import { useAdminSession } from "../admin-session"
import { AdminCard, AdminScreen, AdminSessionSetupCard, styles } from "./shared-ui"

function QuickActionCard(props: {
  icon: React.ComponentProps<typeof Ionicons>["name"]
  label: string
  description: string
  href: string
  index: number
}) {
  const c = getColors()
  return (
    <Link href={props.href} asChild>
      <Pressable>
        <AnimatedCard index={props.index}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
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
              <Ionicons name={props.icon} size={22} color={c.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.listTitle}>{props.label}</Text>
              <Text style={styles.listMeta}>{props.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textSubtle} />
          </View>
        </AnimatedCard>
      </Pressable>
    </Link>
  )
}

export function AdminDashboardScreen() {
  const { session, signOut } = useAdminSession()
  const c = getColors()

  const firstName = session?.user.displayName.split(" ")[0] ?? "Admin"

  return (
    <AdminScreen
      title={session ? `Hello, ${firstName}` : "Admin Dashboard"}
      subtitle="Platform overview and management."
    >
      {!session ? (
        <AdminSessionSetupCard />
      ) : (
        <>
          <AnimatedCard index={0} glow>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: c.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="shield-checkmark" size={24} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{session.user.displayName}</Text>
                <Text style={styles.listMeta}>{session.user.email}</Text>
              </View>
            </View>
            <View style={styles.cardGrid}>
              <StatCard label="Role" value="Admin" tone="primary" index={0} />
              <StatCard label="Status" value="Active" tone="success" index={1} />
            </View>
          </AnimatedCard>

          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: c.textSubtle,
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Manage
            </Text>
          </Animated.View>

          <QuickActionCard
            icon="people"
            label="Students"
            description="View enrollments, attendance records, and device approvals"
            href={adminRoutes.students}
            index={2}
          />
          <QuickActionCard
            icon="school"
            label="Classrooms"
            description="Monitor classroom activity, schedules, and capacity"
            href={adminRoutes.classrooms}
            index={3}
          />
          <QuickActionCard
            icon="phone-portrait"
            label="Devices"
            description="Review device trust status and pending approvals"
            href={adminRoutes.devices}
            index={4}
          />

          <AnimatedCard index={5}>
            <Text style={styles.cardTitle}>Account</Text>
            <Pressable
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.dangerBorder,
                backgroundColor: c.dangerSoft,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
              onPress={signOut}
            >
              <Ionicons name="log-out-outline" size={18} color={c.danger} />
              <Text style={{ color: c.danger, fontSize: 15, fontWeight: "700" }}>Sign out</Text>
            </Pressable>
          </AnimatedCard>
        </>
      )}
    </AdminScreen>
  )
}
