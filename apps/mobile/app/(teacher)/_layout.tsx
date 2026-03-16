import { Redirect, Stack } from "expo-router"

import { mobileEntryRoutes, resolveMobileRoleGate } from "../../src/mobile-entry-models"
import { useTeacherSession } from "../../src/teacher-session"

export default function TeacherLayout() {
  const { session } = useTeacherSession()
  const gate = resolveMobileRoleGate("teacher", Boolean(session))

  if (!gate.allowed) {
    return <Redirect href={gate.redirectHref ?? mobileEntryRoutes.teacherSignIn} />
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: "#f8fafc",
        },
        headerTintColor: "#0f172a",
        headerTitleStyle: {
          fontWeight: "700",
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />
      <Stack.Screen
        name="classrooms/index"
        options={{
          title: "Classrooms",
        }}
      />
      <Stack.Screen
        name="sessions/index"
        options={{
          title: "Session History",
        }}
      />
      <Stack.Screen
        name="bluetooth/create"
        options={{
          title: "Bluetooth Attendance",
        }}
      />
      <Stack.Screen
        name="bluetooth/active/[sessionId]"
        options={{
          title: "Live Bluetooth Session",
        }}
      />
      <Stack.Screen
        name="sessions/[sessionId]"
        options={{
          title: "Session Detail",
        }}
      />
      <Stack.Screen
        name="reports/index"
        options={{
          title: "Reports",
        }}
      />
      <Stack.Screen
        name="exports/index"
        options={{
          title: "Exports",
        }}
      />
      <Stack.Screen
        name="classrooms/[classroomId]"
        options={{
          title: "Classroom Detail",
        }}
      />
      <Stack.Screen
        name="classrooms/[classroomId]/roster"
        options={{
          title: "Classroom Roster",
        }}
      />
      <Stack.Screen
        name="classrooms/[classroomId]/schedule"
        options={{
          title: "Classroom Schedule",
        }}
      />
      <Stack.Screen
        name="classrooms/[classroomId]/announcements"
        options={{
          title: "Announcements",
        }}
      />
      <Stack.Screen
        name="classrooms/[classroomId]/lectures"
        options={{
          title: "Lectures",
        }}
      />
    </Stack>
  )
}
