import { getColors, setMobileColorScheme } from "@attendease/ui-mobile"
import { QueryClientProvider } from "@tanstack/react-query"
import { Stack } from "expo-router"
import { useCallback, useState } from "react"
import { StatusBar, useColorScheme } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { AdminSessionProvider } from "../src/admin-session"
import { AnimatedSplash } from "../src/animated-splash"
import { mobileQueryClient } from "../src/query-client"
import { StudentSessionProvider } from "../src/student-session"
import { TeacherSessionProvider } from "../src/teacher-session"

export default function RootLayout() {
  const systemScheme = useColorScheme()
  const scheme = systemScheme === "dark" ? "dark" : "light"
  setMobileColorScheme(scheme)
  const c = getColors()

  const [splashDone, setSplashDone] = useState(false)
  const handleSplashFinish = useCallback(() => setSplashDone(true), [])

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={mobileQueryClient}>
        <StatusBar
          barStyle={scheme === "dark" ? "light-content" : "dark-content"}
          backgroundColor={c.surface}
        />
        <AdminSessionProvider>
          <TeacherSessionProvider>
            <StudentSessionProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: c.surface },
                  animation: "fade_from_bottom",
                  animationDuration: 200,
                }}
              >
                {/* Landing page — can be swiped/backed out of freely */}
                <Stack.Screen name="index" />

                {/* Entry (sign-in / register) flows — normal stack back */}
                <Stack.Screen name="(entry)" />

                {/*
                  Authenticated route groups: disable gesture-back and the
                  native header-back so the user can never swipe back to the
                  landing or sign-in screens while logged in.
                */}
                <Stack.Screen
                  name="(student)"
                  options={{ gestureEnabled: false, headerBackVisible: false }}
                />
                <Stack.Screen
                  name="(teacher)"
                  options={{ gestureEnabled: false, headerBackVisible: false }}
                />
                <Stack.Screen
                  name="(admin)"
                  options={{ gestureEnabled: false, headerBackVisible: false }}
                />
              </Stack>
              {!splashDone && <AnimatedSplash onFinish={handleSplashFinish} />}
            </StudentSessionProvider>
          </TeacherSessionProvider>
        </AdminSessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
