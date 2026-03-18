import { getColors } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { Stack, useRouter } from "expo-router"
import { Pressable } from "react-native"

export default function ClassroomDetailLayout() {
  const c = getColors()
  const router = useRouter()

  return (
    <Stack
      screenOptions={{
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
      }}
    >
      <Stack.Screen name="index" options={{ title: "Classroom" }} />
      <Stack.Screen name="roster" options={{ title: "Student List" }} />
      <Stack.Screen name="schedule" options={{ title: "Schedule" }} />
      <Stack.Screen name="announcements" options={{ title: "Announcements" }} />
      <Stack.Screen name="lectures" options={{ title: "Lectures" }} />
    </Stack>
  )
}
