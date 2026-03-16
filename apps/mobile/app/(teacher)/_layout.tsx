import { mobileTheme } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { Redirect, Tabs } from "expo-router"

import { mobileEntryRoutes, resolveMobileRoleGate } from "../../src/mobile-entry-models"
import { useTeacherSession } from "../../src/teacher-session"

export default function TeacherLayout() {
  const { session } = useTeacherSession()
  const gate = resolveMobileRoleGate("teacher", Boolean(session))

  if (!gate.allowed) {
    return <Redirect href={gate.redirectHref ?? mobileEntryRoutes.teacherSignIn} />
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
        name="bluetooth/create"
        options={{
          title: "Session",
          tabBarIcon: ({ color, size }) => <Ionicons name="bluetooth" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports/index"
        options={{
          title: "Reports",
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="exports/index"
        options={{
          title: "Exports",
          tabBarIcon: ({ color, size }) => <Ionicons name="download" size={size} color={color} />,
        }}
      />
      {/* Hidden detail screens */}
      <Tabs.Screen name="sessions/index" options={{ href: null }} />
      <Tabs.Screen name="sessions/[sessionId]" options={{ href: null }} />
      <Tabs.Screen name="bluetooth/active/[sessionId]" options={{ href: null }} />
      <Tabs.Screen name="classrooms/[classroomId]" options={{ href: null }} />
      <Tabs.Screen name="classrooms/[classroomId]/roster" options={{ href: null }} />
      <Tabs.Screen name="classrooms/[classroomId]/schedule" options={{ href: null }} />
      <Tabs.Screen name="classrooms/[classroomId]/announcements" options={{ href: null }} />
      <Tabs.Screen name="classrooms/[classroomId]/lectures" options={{ href: null }} />
    </Tabs>
  )
}
