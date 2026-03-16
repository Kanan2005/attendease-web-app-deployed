import { QueryClientProvider } from "@tanstack/react-query"
import { Stack } from "expo-router"

import { mobileQueryClient } from "../src/query-client"
import { StudentSessionProvider } from "../src/student-session"
import { TeacherSessionProvider } from "../src/teacher-session"

export default function RootLayout() {
  return (
    <QueryClientProvider client={mobileQueryClient}>
      <TeacherSessionProvider>
        <StudentSessionProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
        </StudentSessionProvider>
      </TeacherSessionProvider>
    </QueryClientProvider>
  )
}
