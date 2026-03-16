import { getColors, setMobileColorScheme } from "@attendease/ui-mobile"
import { QueryClientProvider } from "@tanstack/react-query"
import { Stack } from "expo-router"
import { StatusBar, useColorScheme } from "react-native"

import { mobileQueryClient } from "../src/query-client"
import { StudentSessionProvider } from "../src/student-session"
import { TeacherSessionProvider } from "../src/teacher-session"

export default function RootLayout() {
  const systemScheme = useColorScheme()
  const scheme = systemScheme === "dark" ? "dark" : "light"
  setMobileColorScheme(scheme)
  const c = getColors()

  return (
    <QueryClientProvider client={mobileQueryClient}>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={c.surface}
      />
      <TeacherSessionProvider>
        <StudentSessionProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: c.surface },
              animation: "fade",
            }}
          />
        </StudentSessionProvider>
      </TeacherSessionProvider>
    </QueryClientProvider>
  )
}
