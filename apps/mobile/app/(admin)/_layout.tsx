import { getColors } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { Redirect, Tabs } from "expo-router"

import { useAdminSession } from "../../src/admin-session"
import { mobileEntryRoutes, resolveMobileRoleGate } from "../../src/mobile-entry-models"

export default function AdminLayout() {
  const { session } = useAdminSession()
  const gate = resolveMobileRoleGate("admin", Boolean(session))
  const c = getColors()

  if (!gate.allowed) {
    return <Redirect href={gate.redirectHref ?? mobileEntryRoutes.adminSignIn} />
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.border,
          borderTopWidth: 0.5,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
          elevation: 8,
          shadowColor: "#6366F1",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
        },
        tabBarActiveTintColor: c.tabActive,
        tabBarInactiveTintColor: c.tabInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
      screenListeners={{
        tabPress: () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "grid" : "grid-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: "Students",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="classrooms"
        options={{
          title: "Classrooms",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "school" : "school-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: "Devices",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "phone-portrait" : "phone-portrait-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  )
}
