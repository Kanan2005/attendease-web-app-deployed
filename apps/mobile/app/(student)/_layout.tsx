import { mobileTheme } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { Redirect, Tabs } from "expo-router"

import { mobileEntryRoutes, resolveMobileRoleGate } from "../../src/mobile-entry-models"
import { useStudentSession } from "../../src/student-session"

export default function StudentLayout() {
  const { session } = useStudentSession()
  const gate = resolveMobileRoleGate("student", Boolean(session))

  if (!gate.allowed) {
    return <Redirect href={gate.redirectHref ?? mobileEntryRoutes.studentSignIn} />
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: mobileTheme.colors.tabBar,
          borderTopColor: mobileTheme.colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: mobileTheme.colors.tabActive,
        tabBarInactiveTintColor: mobileTheme.colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="classrooms/index"
        options={{
          title: "Classrooms",
          tabBarIcon: ({ color, size }) => <Ionicons name="school" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="attendance/index"
        options={{
          title: "Attendance",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="finger-print" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />
      {/* Hidden detail screens */}
      <Tabs.Screen name="join" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="device-status" options={{ href: null }} />
      <Tabs.Screen name="attendance/qr-scan" options={{ href: null }} />
      <Tabs.Screen name="attendance/bluetooth-scan" options={{ href: null }} />
      <Tabs.Screen name="classrooms/[classroomId]" options={{ href: null }} />
      <Tabs.Screen name="classrooms/[classroomId]/stream" options={{ href: null }} />
      <Tabs.Screen name="classrooms/[classroomId]/schedule" options={{ href: null }} />
      <Tabs.Screen name="reports/subject/[subjectId]" options={{ href: null }} />
    </Tabs>
  )
}
