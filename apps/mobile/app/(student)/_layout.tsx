import { Redirect, Stack } from "expo-router"

import { mobileEntryRoutes, resolveMobileRoleGate } from "../../src/mobile-entry-models"
import { useStudentSession } from "../../src/student-session"

export default function StudentLayout() {
  const { session } = useStudentSession()
  const gate = resolveMobileRoleGate("student", Boolean(session))

  if (!gate.allowed) {
    return <Redirect href={gate.redirectHref ?? mobileEntryRoutes.studentSignIn} />
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
        name="join"
        options={{
          title: "Join Classroom",
        }}
      />
      <Stack.Screen
        name="attendance/index"
        options={{
          title: "Attendance",
        }}
      />
      <Stack.Screen
        name="attendance/qr-scan"
        options={{
          title: "QR + GPS Attendance",
        }}
      />
      <Stack.Screen
        name="attendance/bluetooth-scan"
        options={{
          title: "Bluetooth Attendance",
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: "Attendance History",
        }}
      />
      <Stack.Screen
        name="reports"
        options={{
          title: "Reports",
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
      <Stack.Screen
        name="device-status"
        options={{
          title: "Device Status",
        }}
      />
      <Stack.Screen
        name="classrooms/[classroomId]"
        options={{
          title: "Classroom",
        }}
      />
      <Stack.Screen
        name="classrooms/[classroomId]/stream"
        options={{
          title: "Updates",
        }}
      />
      <Stack.Screen
        name="classrooms/[classroomId]/schedule"
        options={{
          title: "Schedule",
        }}
      />
      <Stack.Screen
        name="reports/subject/[subjectId]"
        options={{
          title: "Subject Report",
        }}
      />
    </Stack>
  )
}
