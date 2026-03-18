import { getColors } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { Redirect, Stack, useRouter } from "expo-router"
import { Pressable } from "react-native"

import { mobileEntryRoutes, resolveMobileRoleGate } from "../../src/mobile-entry-models"
import { useTeacherSession } from "../../src/teacher-session"

export default function TeacherLayout() {
  const { session } = useTeacherSession()
  const gate = resolveMobileRoleGate("teacher", Boolean(session))
  const c = getColors()
  const router = useRouter()

  if (!gate.allowed) {
    return <Redirect href={gate.redirectHref ?? mobileEntryRoutes.teacherSignIn} />
  }

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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="classroom/[classroomId]" />
      <Stack.Screen name="sessions/index" options={{ ...detailHeader, title: "Session History" }} />
      <Stack.Screen name="sessions/[sessionId]" options={{ ...detailHeader, title: "Session Details" }} />
      <Stack.Screen name="bluetooth/create" options={{ headerShown: false }} />
      <Stack.Screen name="bluetooth/active/[sessionId]" options={{ headerShown: false }} />
    </Stack>
  )
}
