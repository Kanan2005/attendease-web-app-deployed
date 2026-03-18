import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { Pressable, Text, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"

import { mapStudentApiErrorToMessage } from "../student-models"
import { studentRoutes } from "../student-routes"
import { useStudentSession } from "../student-session"
import {
  useStudentCourseDiscoveryData,
} from "./queries"
import {
  StudentEmptyCard,
  StudentErrorCard,
  StudentLoadingCard,
  StudentNavAction,
  StudentProfileButton,
  StudentScreen,
  StudentSessionSetupCard,
  styles,
} from "./shared-ui"

export function StudentClassroomsScreen() {
  const { session } = useStudentSession()
  const router = useRouter()
  const c = getColors()
  const discovery = useStudentCourseDiscoveryData()
  const discoveryError =
    discovery.meQuery.error ??
    discovery.classroomsQuery.error ??
    discovery.attendanceReadyQuery.error ??
    discovery.lectureQueries.find((q) => q.error)?.error ??
    null

  // Sort: live courses first, then alphabetical
  const sortedCourses = [...discovery.courseCards].sort((a, b) => {
    if (a.hasOpenAttendance && !b.hasOpenAttendance) return -1
    if (!a.hasOpenAttendance && b.hasOpenAttendance) return 1
    return a.title.localeCompare(b.title)
  })
  const liveCount = sortedCourses.filter((c) => c.hasOpenAttendance).length

  return (
    <StudentScreen title="My Courses" subtitle={`${discovery.courseCards.length} enrolled`} headerRight={<StudentProfileButton />}>
      {!session ? (
        <StudentSessionSetupCard />
      ) : discovery.meQuery.isLoading ||
        discovery.classroomsQuery.isLoading ||
        discovery.attendanceReadyQuery.isLoading ? (
        <StudentLoadingCard label="Loading your courses…" />
      ) : discoveryError ? (
        <StudentErrorCard label={mapStudentApiErrorToMessage(discoveryError)} />
      ) : sortedCourses.length > 0 ? (
        <>
          {/* Live Attendance Banner */}
          {liveCount > 0 ? (
            <Animated.View entering={FadeInDown.duration(350)}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: c.dangerSoft,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: c.dangerBorder,
                }}
              >
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.danger }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>
                    {liveCount} live session{liveCount === 1 ? "" : "s"}
                  </Text>
                  <Text style={{ fontSize: 13, color: c.textMuted }}>
                    Tap the highlighted course{liveCount === 1 ? "" : "s"} below to mark attendance
                  </Text>
                </View>
                <Ionicons name="arrow-down" size={18} color={c.danger} />
              </View>
            </Animated.View>
          ) : null}

          {/* Course Cards */}
          {sortedCourses.map((course, i) => {
            const codeLabel = course.subtitle.split("·")[0]?.trim() ?? ""
            const isLive = course.hasOpenAttendance
            return (
              <Animated.View key={course.classroomId} entering={FadeInDown.duration(300).delay((liveCount > 0 ? 60 : 0) + i * 60)}>
                <Pressable
                  onPress={() => router.push(studentRoutes.classroomDetail(course.classroomId))}
                  style={{
                    borderRadius: 16,
                    backgroundColor: isLive ? c.dangerSoft : c.surfaceRaised,
                    borderWidth: isLive ? 2 : 1,
                    borderColor: isLive ? c.danger : c.border,
                    overflow: "hidden",
                    ...mobileTheme.shadow.soft,
                  }}
                >
                  {/* Live banner strip at top of card */}
                  {isLive ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        backgroundColor: c.danger,
                        paddingVertical: 6,
                      }}
                    >
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" }} />
                      <Text style={{ fontSize: 12, fontWeight: "800", color: "#fff", letterSpacing: 0.5 }}>
                        ATTENDANCE LIVE — TAP TO MARK
                      </Text>
                    </View>
                  ) : null}

                  <View style={{ padding: 16, gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          backgroundColor: isLive ? c.danger + "20" : c.primarySoft,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: "800", color: isLive ? c.danger : c.primary }}>
                          {codeLabel.slice(0, 3).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }} numberOfLines={1}>
                          {course.title}
                        </Text>
                        <Text style={{ fontSize: 13, color: c.textMuted }} numberOfLines={1}>
                          {codeLabel}{course.teacherName ? ` · ${course.teacherName}` : ""}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={isLive ? c.danger : c.textSubtle} />
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            )
          })}
          <StudentNavAction href={studentRoutes.join} label="Join Classroom" icon="enter-outline" />
        </>
      ) : (
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={{ alignItems: "center", gap: 14, paddingVertical: 32, paddingHorizontal: 24 }}>
            <Ionicons name="school-outline" size={44} color={c.textSubtle} />
            <Text style={{ fontSize: 17, fontWeight: "600", color: c.text }}>No courses yet</Text>
            <Text style={{ fontSize: 14, color: c.textMuted, textAlign: "center", lineHeight: 21 }}>
              Ask your teacher for a join code and tap the button below to enroll.
            </Text>
            <StudentNavAction href={studentRoutes.join} label="Join Classroom" icon="enter-outline" />
          </View>
        </Animated.View>
      )}
    </StudentScreen>
  )
}
