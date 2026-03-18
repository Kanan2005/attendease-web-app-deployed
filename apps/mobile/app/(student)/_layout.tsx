import { getColors } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { Redirect, Stack, useRouter } from "expo-router"
import { useEffect } from "react"
import { Platform, Pressable } from "react-native"

import { mobileEntryRoutes, resolveMobileRoleGate } from "../../src/mobile-entry-models"
import { useStudentSession } from "../../src/student-session"

async function requestNotificationPermission() {
  // expo-notifications throws at module load in Expo Go on Android (SDK 53+)
  if (__DEV__ && Platform.OS === "android") return
  try {
    const Notifications = await import("expo-notifications")
    const { status } = await Notifications.getPermissionsAsync()
    if (status !== "granted") {
      await Notifications.requestPermissionsAsync()
    }
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.HIGH,
      })
    }
  } catch {
    // expo-notifications unavailable in Expo Go on SDK 53+; safe to skip
  }
}

export default function StudentLayout() {
  const { session } = useStudentSession()
  const gate = resolveMobileRoleGate("student", Boolean(session))
  const c = getColors()
  const router = useRouter()

  const detailHeader = {
    headerShown: true,
    headerStyle: { backgroundColor: c.surface },
    headerTintColor: c.primary,
    headerTitleStyle: { color: c.text, fontWeight: "600" as const, fontSize: 17 },
    headerShadowVisible: false,
    headerBackVisible: false,
    headerLeft: () => (
      <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginLeft: 4 }}>
        <Ionicons name="chevron-back" size={26} color={c.primary} />
      </Pressable>
    ),
  }

  useEffect(() => {
    if (!session) return
    void requestNotificationPermission()
  }, [session])

  if (!gate.allowed) {
    return <Redirect href={gate.redirectHref ?? mobileEntryRoutes.studentSignIn} />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="classroom/[classroomId]" />
      <Stack.Screen name="attendance/index" options={{ ...detailHeader, title: "Mark Attendance" }} />
      <Stack.Screen name="attendance/qr-scan" options={{ ...detailHeader, title: "QR Scan" }} />
      <Stack.Screen name="attendance/bluetooth-scan" options={{ ...detailHeader, title: "Bluetooth Scan" }} />
      <Stack.Screen name="join" options={{ ...detailHeader, title: "Join Classroom" }} />
      <Stack.Screen name="history" options={{ ...detailHeader, title: "History" }} />
      <Stack.Screen name="device-status" options={{ ...detailHeader, title: "Device Status" }} />
      <Stack.Screen name="reports/subject/[subjectId]" options={{ ...detailHeader, title: "Subject Report" }} />
    </Stack>
  )
}
