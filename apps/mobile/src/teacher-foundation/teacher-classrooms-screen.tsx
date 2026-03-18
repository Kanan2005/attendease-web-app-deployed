import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import type { ClassroomSummary, CreateClassroomRequest } from "@attendease/contracts"
import {
  type TeacherClassroomCreateDraft,
  buildTeacherClassroomCreateRequest,
  buildTeacherClassroomScopeOptions,
  buildTeacherClassroomSupportingText,
  createTeacherClassroomCreateDraft,
} from "../teacher-classroom-management"
import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { teacherRoutes } from "../teacher-routes"
import { useTeacherSession } from "../teacher-session"
import {
  useTeacherAssignmentsQuery,
  useTeacherClassroomsQuery,
  useTeacherCreateClassroomMutation,
} from "./queries"

const AVATAR_COLORS = [
  { bg: "#E8F5E9", fg: "#2E7D32" },
  { bg: "#E3F2FD", fg: "#1565C0" },
  { bg: "#FFF3E0", fg: "#E65100" },
  { bg: "#F3E5F5", fg: "#7B1FA2" },
  { bg: "#E0F7FA", fg: "#00838F" },
  { bg: "#FCE4EC", fg: "#C62828" },
  { bg: "#FFF8E1", fg: "#F57F17" },
  { bg: "#E8EAF6", fg: "#283593" },
]

function fmtEnum(s: string) {
  return s.toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}

export function TeacherClassroomsScreen() {
  const router = useRouter()
  const { session } = useTeacherSession()
  const c = getColors()
  const insets = useSafeAreaInsets()
  const classroomsQuery = useTeacherClassroomsQuery()
  const assignmentsQuery = useTeacherAssignmentsQuery()
  const createClassroomMutation = useTeacherCreateClassroomMutation()
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState("")
  const createScopeOptions = buildTeacherClassroomScopeOptions(assignmentsQuery.data ?? [])
  const [createDraft, setCreateDraft] = useState<TeacherClassroomCreateDraft>(() =>
    createTeacherClassroomCreateDraft(),
  )

  const canCreateClassroom = (assignmentsQuery.data ?? []).some(
    (a) => a.canSelfCreateCourseOffering,
  )
  const classroomsError = classroomsQuery.error ?? assignmentsQuery.error
  const allClassrooms = (classroomsQuery.data ?? []).filter((c) => c.status !== "ARCHIVED")
  const classrooms = useMemo(() => {
    if (!search.trim()) return allClassrooms
    const q = search.toLowerCase()
    return allClassrooms.filter(
      (c) =>
        (c.classroomTitle ?? c.displayTitle ?? "").toLowerCase().includes(q) ||
        (c.courseCode ?? c.code ?? "").toLowerCase().includes(q) ||
        (c.subjectTitle ?? c.subjectCode ?? "").toLowerCase().includes(q),
    )
  }, [allClassrooms, search])

  useEffect(() => {
    if (!createScopeOptions.length) return
    if (createScopeOptions.some((o) => o.key === createDraft.selectedScopeKey)) return
    setCreateDraft((d) => ({ ...d, selectedScopeKey: createScopeOptions[0]?.key ?? "" }))
  }, [createDraft.selectedScopeKey, createScopeOptions])

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Ionicons name="lock-closed-outline" size={40} color={c.textSubtle} />
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.text, marginTop: 12 }}>Sign in required</Text>
      </View>
    )
  }

  const isLoading = classroomsQuery.isLoading || assignmentsQuery.isLoading

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={[cs.header, { paddingTop: insets.top + 8 }]}>
          <Text style={[cs.heading, { color: c.text }]}>My Classrooms</Text>
          <Text style={{ fontSize: 13, color: c.textMuted }}>{allClassrooms.length} course{allClassrooms.length === 1 ? "" : "s"}</Text>
        </View>

        {/* ── Search bar ── */}
        {allClassrooms.length > 3 ? (
          <View style={cs.searchSection}>
            <View style={[cs.searchBar, { backgroundColor: c.surfaceMuted, borderColor: c.borderStrong }]}>
              <Ionicons name="search-outline" size={16} color={c.textSubtle} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search classrooms…"
                placeholderTextColor={c.textSubtle}
                autoCapitalize="none"
                style={[cs.searchInput, { color: c.text }]}
              />
              {search.length > 0 ? (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={c.textSubtle} />
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* ── Content ── */}
        <View style={cs.list}>
          {isLoading ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={c.primary} />
              <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 12 }}>Loading classrooms…</Text>
            </View>
          ) : classroomsError ? (
            <View style={{ alignItems: "center", paddingVertical: 32, gap: 8 }}>
              <Ionicons name="alert-circle" size={36} color={c.danger} />
              <Text style={{ fontSize: 14, color: c.danger, textAlign: "center" }}>{mapTeacherApiErrorToMessage(classroomsError)}</Text>
            </View>
          ) : classrooms.length === 0 && !search ? (
            <View style={{ alignItems: "center", paddingVertical: 40, gap: 10 }}>
              <Ionicons name="library-outline" size={44} color={c.textSubtle} />
              <Text style={{ fontSize: 17, fontWeight: "600", color: c.text }}>No classrooms yet</Text>
              <Text style={{ fontSize: 14, color: c.textMuted, textAlign: "center", lineHeight: 21, paddingHorizontal: 32 }}>
                Tap the + button to create your first classroom.
              </Text>
            </View>
          ) : classrooms.length === 0 && search ? (
            <View style={{ alignItems: "center", paddingVertical: 32, gap: 6 }}>
              <Ionicons name="search-outline" size={32} color={c.textSubtle} />
              <Text style={{ fontSize: 14, color: c.textMuted }}>No classrooms match "{search}"</Text>
            </View>
          ) : (
            classrooms.map((classroom, i) => {
              const colorIdx = i % AVATAR_COLORS.length
              const avatarColor = AVATAR_COLORS[colorIdx]!
              const title = classroom.classroomTitle ?? classroom.displayTitle ?? "Classroom"
              const code = (classroom.courseCode ?? classroom.code ?? "").toUpperCase()
              const subject = classroom.subjectTitle ?? classroom.subjectCode ?? ""
              const isActive = classroom.status === "ACTIVE"

              return (
                <Animated.View key={classroom.id} entering={FadeInDown.duration(250).delay(i * 50)}>
                  <Pressable
                    onPress={() => router.push(teacherRoutes.classroomDetail(classroom.id))}
                    style={[cs.card, { backgroundColor: c.surfaceRaised, borderColor: c.border }]}
                  >
                    <View style={[cs.avatar, { backgroundColor: avatarColor.bg }]}>
                      <Text style={{ fontSize: 15, fontWeight: "800", color: avatarColor.fg }}>
                        {title.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }} numberOfLines={2}>
                        {title}
                      </Text>
                      <Text style={{ fontSize: 12, color: c.textMuted }} numberOfLines={1}>
                        {code}{subject ? ` · ${subject}` : ""}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <View style={[cs.statusBadge, { backgroundColor: isActive ? c.successSoft : c.surfaceTint }]}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: isActive ? c.success : c.textSubtle }}>
                          {fmtEnum(classroom.status)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={c.textSubtle} />
                    </View>
                  </Pressable>
                </Animated.View>
              )
            })
          )}
        </View>
      </ScrollView>

      {canCreateClassroom ? (
        <Pressable
          onPress={() => setShowCreate(true)}
          style={[cs.fab, { backgroundColor: c.primary, ...mobileTheme.shadow.glow }]}
        >
          <Ionicons name="add" size={28} color={c.primaryContrast} />
        </Pressable>
      ) : null}

      <Modal
        visible={showCreate}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreate(false)}
      >
        <CreateClassroomSheet
          scopeOptions={createScopeOptions}
          draft={createDraft}
          setDraft={setCreateDraft}
          mutation={createClassroomMutation}
          onClose={() => setShowCreate(false)}
          onCreated={(created) => {
            setShowCreate(false)
            setCreateDraft(createTeacherClassroomCreateDraft(createScopeOptions[0]?.key ?? ""))
            router.push(teacherRoutes.classroomDetail(created.id))
          }}
        />
      </Modal>
    </View>
  )
}

const cs = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 2,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  list: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
})

function CreateClassroomSheet(props: {
  scopeOptions: ReturnType<typeof buildTeacherClassroomScopeOptions>
  draft: TeacherClassroomCreateDraft
  setDraft: React.Dispatch<React.SetStateAction<TeacherClassroomCreateDraft>>
  mutation: { isPending: boolean; error: unknown; mutate: (v: CreateClassroomRequest, o?: { onSuccess?: (c: ClassroomSummary) => void }) => void }
  onClose: () => void
  onCreated: (classroom: ClassroomSummary) => void
}) {
  const c = getColors()
  const canSubmit =
    !props.mutation.isPending &&
    props.draft.classroomTitle.trim().length >= 3 &&
    props.draft.courseCode.trim().length >= 3

  return (
    <ScrollView
      contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 48 }}
      style={{ flex: 1, backgroundColor: c.surface }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: c.text }}>New Classroom</Text>
        <Pressable onPress={props.onClose} style={{ padding: 4 }}>
          <Ionicons name="close" size={24} color={c.textMuted} />
        </Pressable>
      </View>

      <Text style={{ fontSize: 14, color: c.textMuted, lineHeight: 21 }}>
        Enter a course code and name to create a new classroom.
      </Text>

      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: c.textMuted }}>Course Code</Text>
        <TextInput
          value={props.draft.courseCode}
          autoCapitalize="characters"
          placeholder="CS101"
          placeholderTextColor={c.textSubtle}
          onChangeText={(v) => props.setDraft((d) => ({ ...d, courseCode: v }))}
          style={{
            borderWidth: 1,
            borderColor: c.borderStrong,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            backgroundColor: c.surfaceMuted,
            color: c.text,
            fontSize: 15,
          }}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: c.textMuted }}>Course Name</Text>
        <TextInput
          value={props.draft.classroomTitle}
          autoCapitalize="words"
          placeholder="Introduction to Computer Science"
          placeholderTextColor={c.textSubtle}
          onChangeText={(v) => props.setDraft((d) => ({ ...d, classroomTitle: v }))}
          style={{
            borderWidth: 1,
            borderColor: c.borderStrong,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            backgroundColor: c.surfaceMuted,
            color: c.text,
            fontSize: 15,
          }}
        />
      </View>

      {props.mutation.error ? (
        <Text style={{ color: c.danger, fontSize: 13, lineHeight: 20 }}>
          {mapTeacherApiErrorToMessage(props.mutation.error)}
        </Text>
      ) : null}

      <Pressable
        disabled={!canSubmit}
        onPress={() => {
          props.mutation.mutate(
            buildTeacherClassroomCreateRequest(props.scopeOptions, props.draft),
            { onSuccess: props.onCreated },
          )
        }}
        style={{
          backgroundColor: canSubmit ? c.primary : c.surfaceMuted,
          borderRadius: mobileTheme.radius.button,
          paddingVertical: 15,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
          marginTop: 8,
        }}
      >
        <Ionicons name="add-circle-outline" size={20} color={canSubmit ? c.primaryContrast : c.textSubtle} />
        <Text style={{ fontSize: 16, fontWeight: "700", color: canSubmit ? c.primaryContrast : c.textSubtle }}>
          {props.mutation.isPending ? "Creating…" : "Create Classroom"}
        </Text>
      </Pressable>
    </ScrollView>
  )
}
