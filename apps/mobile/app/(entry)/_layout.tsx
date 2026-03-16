import { Stack } from "expo-router"

export default function EntryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="student/sign-in"
        options={{
          title: "Student sign in",
        }}
      />
      <Stack.Screen
        name="student/register"
        options={{
          title: "Create student account",
        }}
      />
      <Stack.Screen
        name="teacher/sign-in"
        options={{
          title: "Teacher sign in",
        }}
      />
      <Stack.Screen
        name="teacher/register"
        options={{
          title: "Create teacher account",
        }}
      />
    </Stack>
  )
}
