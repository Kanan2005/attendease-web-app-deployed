import { getColors } from "@attendease/ui-mobile"
import { Stack } from "expo-router"

export default function EntryLayout() {
  const c = getColors()

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.primary,
        headerTitleStyle: { fontWeight: "700", fontSize: 17, color: c.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.surface },
        animation: "slide_from_right",
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="student/sign-in" options={{ title: "Student sign in" }} />
      <Stack.Screen name="student/register" options={{ title: "Create student account" }} />
      <Stack.Screen name="teacher/sign-in" options={{ title: "Teacher sign in" }} />
      <Stack.Screen name="teacher/register" options={{ title: "Create teacher account" }} />
      <Stack.Screen name="admin/sign-in" options={{ title: "Admin sign in" }} />
    </Stack>
  )
}
