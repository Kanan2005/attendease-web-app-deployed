import { mobileTheme } from "@attendease/ui-mobile"
import { QueryClientProvider } from "@tanstack/react-query"
import { Stack } from "expo-router"
import { StatusBar } from "react-native"

import { mobileQueryClient } from "../src/query-client"
import { StudentSessionProvider } from "../src/student-session"
import { TeacherSessionProvider } from "../src/teacher-session"

export default function RootLayout() {
  return (
    <QueryClientProvider client={mobileQueryClient}>
      <StatusBar barStyle="light-content" backgroundColor={mobileTheme.colors.surface} />
      <TeacherSessionProvider>
        <StudentSessionProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: mobileTheme.colors.surface },
              animation: "fade",
            }}
          />
        </StudentSessionProvider>
      </TeacherSessionProvider>
    </QueryClientProvider>
  )
}
