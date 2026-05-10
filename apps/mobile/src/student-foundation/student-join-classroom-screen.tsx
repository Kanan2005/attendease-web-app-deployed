import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { mapStudentApiErrorToMessage } from "../student-models"
import { studentRoutes } from "../student-routes"
import { useStudentSession } from "../student-session"
import { buildStudentJoinBanner } from "../student-view-state"

import { useStudentClassroomsQuery, useStudentJoinClassroomMutation } from "./queries"
import {
  StudentBackButton,
  StudentCard,
  StudentEmptyCard,
  StudentLoadingCard,
  StudentScreen,
  StudentSessionSetupCard,
  StudentStatusBanner,
  formatEnum,
  styles,
} from "./shared-ui"

export function StudentJoinClassroomScreen() {
  const { session } = useStudentSession()
  const c = getColors()
  const router = useRouter()
  const [code, setCode] = useState("")
  const [lastJoinedClassroom, setLastJoinedClassroom] = useState<string | undefined>()
  const classroomsQuery = useStudentClassroomsQuery()
  const joinMutation = useStudentJoinClassroomMutation()
  const joinBanner = buildStudentJoinBanner({
    state: joinMutation.isPending
      ? "pending"
      : joinMutation.error
        ? "error"
        : lastJoinedClassroom
          ? "success"
          : "idle",
    ...(lastJoinedClassroom ? { classroomTitle: lastJoinedClassroom } : {}),
    ...(joinMutation.error
      ? { errorMessage: mapStudentApiErrorToMessage(joinMutation.error) }
      : {}),
  })

  return (
    <StudentScreen title="Join Classroom" subtitle="Enter your teacher's code to join.">
      <StudentBackButton label="Back to Home" />
      {!session ? (
        <StudentSessionSetupCard />
      ) : (
        <>
          {joinBanner ? <StudentStatusBanner status={joinBanner} /> : null}
          <View
            style={{
              backgroundColor: c.surfaceRaised,
              borderRadius: 16,
              padding: 20,
              gap: 20,
              borderWidth: 1,
              borderColor: c.border,
              ...mobileTheme.shadow.card,
            }}
          >
            <View style={{ alignItems: "center", gap: 8 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: c.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="key-outline" size={28} color={c.primary} />
              </View>
              <Text style={{ fontSize: 17, fontWeight: "700", color: c.text }}>
                Enter Join Code
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: c.textMuted,
                  textAlign: "center",
                }}
              >
                Ask your teacher for the classroom join code
              </Text>
            </View>

            <TextInput
              value={code}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="ABCD12"
              placeholderTextColor={c.textSubtle}
              onChangeText={(nextValue) => {
                setLastJoinedClassroom(undefined)
                setCode(nextValue.toUpperCase())
              }}
              style={[
                styles.input,
                {
                  letterSpacing: 4,
                  fontSize: 22,
                  fontWeight: "800",
                  textAlign: "center",
                  paddingVertical: 16,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: code.trim().length >= 4 ? c.primary : c.borderStrong,
                },
              ]}
            />

            <Pressable
              style={[
                styles.primaryButton,
                { paddingVertical: 16, borderRadius: 14 },
                joinMutation.isPending || code.trim().length < 4 ? { opacity: 0.5 } : null,
              ]}
              disabled={joinMutation.isPending || code.trim().length < 4}
              onPress={() => {
                setLastJoinedClassroom(undefined)
                joinMutation.mutate(code, {
                  onSuccess: (membership) => {
                    setLastJoinedClassroom(membership.displayTitle)
                    setCode("")
                    const classroomId = membership.classroomId ?? membership.id
                    router.push(studentRoutes.classroomDetail(classroomId))
                  },
                })
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {joinMutation.isPending ? (
                  <ActivityIndicator size="small" color={c.primaryContrast} />
                ) : (
                  <Ionicons name="enter-outline" size={18} color={c.primaryContrast} />
                )}
                <Text style={[styles.primaryButtonLabel, { fontSize: 16 }]}>
                  {joinMutation.isPending ? "Joining…" : "Join Classroom"}
                </Text>
              </View>
            </Pressable>
          </View>

          <StudentCard
            title={`Enrolled (${classroomsQuery.data?.length ?? 0})`}
            subtitle="Your current classroom memberships."
          >
            {classroomsQuery.isLoading ? (
              <StudentLoadingCard label="Loading your classrooms…" compact />
            ) : classroomsQuery.data?.length ? (
              classroomsQuery.data.map((classroom) => {
                const isActive = classroom.enrollmentStatus === "ACTIVE"
                return (
                  <Pressable
                    key={classroom.enrollmentId}
                    onPress={() =>
                      router.push(
                        studentRoutes.classroomDetail(classroom.classroomId ?? classroom.id),
                      )
                    }
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 12,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: c.border,
                    }}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        backgroundColor: isActive ? c.successSoft : c.surfaceMuted,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name={isActive ? "checkmark-circle" : "ellipse-outline"}
                        size={18}
                        color={isActive ? c.success : c.textSubtle}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "600",
                          color: c.text,
                        }}
                        numberOfLines={1}
                      >
                        {classroom.displayTitle}
                      </Text>
                      <Text style={{ fontSize: 12, color: c.textMuted }}>
                        {formatEnum(classroom.enrollmentStatus)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={c.textSubtle} />
                  </Pressable>
                )
              })
            ) : (
              <StudentEmptyCard label="No classrooms joined yet." />
            )}
          </StudentCard>
        </>
      )}
    </StudentScreen>
  )
}
