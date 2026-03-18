import { getColors } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { teacherRoutes } from "../teacher-routes"
import { useTeacherSession } from "../teacher-session"
import {
  useTeacherClassroomDetailData,
  useTeacherCreateAnnouncementMutation,
} from "./queries"
import { formatDateTime, styles } from "./shared-ui"

function fmtEnum(s: string) {
  return s.toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}

export function TeacherClassroomAnnouncementsScreen(props: { classroomId: string }) {
  const { session } = useTeacherSession()
  const c = getColors()
  const classroom = useTeacherClassroomDetailData(props.classroomId)
  const announcementMutation = useTeacherCreateAnnouncementMutation(props.classroomId)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [visibility, setVisibility] = useState<"TEACHER_ONLY" | "STUDENT_AND_TEACHER">("TEACHER_ONLY")
  const [shouldNotify, setShouldNotify] = useState(false)

  const isLoading = classroom.detailQuery.isLoading || classroom.announcementsQuery.isLoading
  const loadError = classroom.detailQuery.error ?? classroom.announcementsQuery.error
  const announcements = classroom.announcementsQuery.data ?? []
  const canPost = !announcementMutation.isPending && body.trim().length > 0

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Ionicons name="lock-closed-outline" size={40} color={c.textSubtle} />
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.text, marginTop: 12 }}>Sign in required</Text>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 12 }}>Loading updates…</Text>
      </View>
    )
  }

  if (loadError) {
    return (
      <View style={{ flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Ionicons name="alert-circle" size={40} color={c.danger} />
        <Text style={{ fontSize: 14, color: c.danger, marginTop: 12, textAlign: "center" }}>{mapTeacherApiErrorToMessage(loadError)}</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surface }}
      contentContainerStyle={{ paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Post form ── */}
      <View style={as.section}>
        <Text style={[as.sectionTitle, { color: c.text }]}>Post Update</Text>
        <View style={[as.card, { backgroundColor: c.surfaceRaised, borderColor: c.border }]}>
          <TextInput value={title} autoCapitalize="sentences" placeholder="Title (optional)" placeholderTextColor={c.textSubtle} onChangeText={setTitle} style={styles.input} />
          <TextInput value={body} autoCapitalize="sentences" multiline placeholder="Write your announcement…" placeholderTextColor={c.textSubtle} onChangeText={setBody} style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]} />

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => setVisibility("TEACHER_ONLY")}
              style={[as.toggle, { borderColor: visibility === "TEACHER_ONLY" ? c.primary : c.border, backgroundColor: visibility === "TEACHER_ONLY" ? c.primarySoft : c.surfaceMuted }]}
            >
              <Ionicons name="eye-off-outline" size={14} color={visibility === "TEACHER_ONLY" ? c.primary : c.textMuted} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: visibility === "TEACHER_ONLY" ? c.primary : c.textMuted }}>Teacher Only</Text>
            </Pressable>
            <Pressable
              onPress={() => setVisibility("STUDENT_AND_TEACHER")}
              style={[as.toggle, { borderColor: visibility === "STUDENT_AND_TEACHER" ? c.primary : c.border, backgroundColor: visibility === "STUDENT_AND_TEACHER" ? c.primarySoft : c.surfaceMuted }]}
            >
              <Ionicons name="people-outline" size={14} color={visibility === "STUDENT_AND_TEACHER" ? c.primary : c.textMuted} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: visibility === "STUDENT_AND_TEACHER" ? c.primary : c.textMuted }}>All Students</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => setShouldNotify((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
            <Ionicons name={shouldNotify ? "notifications" : "notifications-off-outline"} size={16} color={shouldNotify ? c.primary : c.textSubtle} />
            <Text style={{ fontSize: 13, color: shouldNotify ? c.primary : c.textMuted, fontWeight: "600" }}>
              {shouldNotify ? "Push notification enabled" : "No notification"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.primaryButton, { opacity: canPost ? 1 : 0.5 }]}
            disabled={!canPost}
            onPress={() =>
              announcementMutation.mutate(
                { title, body, visibility, shouldNotify },
                { onSuccess: () => { setTitle(""); setBody(""); setVisibility("TEACHER_ONLY"); setShouldNotify(false) } },
              )
            }
          >
            <Text style={styles.primaryButtonLabel}>{announcementMutation.isPending ? "Posting…" : "Post"}</Text>
          </Pressable>
          {announcementMutation.error ? <Text style={{ fontSize: 12, color: c.danger }}>{mapTeacherApiErrorToMessage(announcementMutation.error)}</Text> : null}
        </View>
      </View>

      {/* ── Feed ── */}
      <View style={as.section}>
        <Text style={[as.sectionTitle, { color: c.text }]}>Feed ({announcements.length})</Text>
        {announcements.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 32, gap: 8 }}>
            <Ionicons name="megaphone-outline" size={36} color={c.textSubtle} />
            <Text style={{ fontSize: 14, color: c.textMuted }}>No announcements yet</Text>
          </View>
        ) : (
          announcements.map((a, i) => {
            const isStudentVisible = a.visibility === "STUDENT_AND_TEACHER"
            return (
              <Animated.View key={a.id} entering={FadeInDown.duration(200).delay(i * 30)}>
                <View style={[as.feedCard, { backgroundColor: c.surfaceRaised, borderColor: c.border }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }} numberOfLines={1}>
                      {a.title ?? fmtEnum(a.postType)}
                    </Text>
                    <View style={[as.visBadge, { backgroundColor: isStudentVisible ? c.primarySoft : c.surfaceTint }]}>
                      <Text style={{ fontSize: 9, fontWeight: "700", color: isStudentVisible ? c.primary : c.textSubtle }}>
                        {isStudentVisible ? "Public" : "Private"}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 13, color: c.text, lineHeight: 19 }}>{a.body}</Text>
                  <Text style={{ fontSize: 11, color: c.textMuted }}>
                    {a.authorDisplayName} · {formatDateTime(a.createdAt)}
                  </Text>
                </View>
              </Animated.View>
            )
          })
        )}
      </View>
    </ScrollView>
  )
}

const as = StyleSheet.create({
  section: { paddingHorizontal: 16, marginTop: 12, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  toggle: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  feedCard: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  visBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
})
