import type { ProfileResponse } from "@attendease/contracts"
import { getColors } from "@attendease/ui-mobile"
import { GradientHeader } from "@attendease/ui-mobile/animated"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { useTeacherSession } from "../teacher-session"
import {
  useTeacherClassroomsQuery,
  useTeacherProfileQuery,
  useTeacherUpdateProfileMutation,
} from "./queries"
import { styles } from "./styles"

// ── Draft state management for teacher profile edits ──

interface TeacherProfileDraft {
  displayName: string
  department: string
  designation: string
  employeeCode: string
}

function createTeacherProfileDraft(profile: ProfileResponse | null): TeacherProfileDraft {
  return {
    displayName: profile?.displayName ?? "",
    department: profile?.department ?? "",
    designation: profile?.designation ?? "",
    employeeCode: profile?.employeeCode ?? "",
  }
}

function hasTeacherProfileDraftChanges(
  initial: TeacherProfileDraft,
  current: TeacherProfileDraft,
): boolean {
  return (
    initial.displayName !== current.displayName ||
    initial.department !== current.department ||
    initial.designation !== current.designation ||
    initial.employeeCode !== current.employeeCode
  )
}

// ── Reusable field label with icon ──

function ProfileFieldLabel(props: { icon: string; label: string }) {
  const c = getColors()
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Ionicons name={props.icon as "person-outline"} size={14} color={c.textSubtle} />
      <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600" }}>{props.label}</Text>
    </View>
  )
}

// ── Card wrapper matching the teacher design system ──

function ProfileCard(props: { title: string; subtitle: string; children: React.ReactNode }) {
  const c = getColors()
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{props.title}</Text>
      <Text style={styles.cardSubtitle}>{props.subtitle}</Text>
      {props.children}
    </View>
  )
}

export function TeacherProfileScreen() {
  const { session, signOut } = useTeacherSession()
  const c = getColors()
  const insets = useSafeAreaInsets()
  const profileQuery = useTeacherProfileQuery()
  const classroomsQuery = useTeacherClassroomsQuery()
  const updateProfileMutation = useTeacherUpdateProfileMutation()

  const [draft, setDraft] = useState<TeacherProfileDraft>(() => createTeacherProfileDraft(null))
  const [initialDraft, setInitialDraft] = useState<TeacherProfileDraft>(() =>
    createTeacherProfileDraft(null),
  )
  const [initialized, setInitialized] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Hydrate draft from the full profile response on first load
  useEffect(() => {
    if (!profileQuery.data || initialized) return

    const nextDraft = createTeacherProfileDraft(profileQuery.data)
    setDraft(nextDraft)
    setInitialDraft(nextDraft)
    setInitialized(true)
  }, [initialized, profileQuery.data])

  const hasDraftChanges = hasTeacherProfileDraftChanges(initialDraft, draft)
  const displayNameValid = draft.displayName.trim().length >= 1
  const canSave = hasDraftChanges && displayNameValid && !updateProfileMutation.isPending
  const classroomCount =
    classroomsQuery.data?.filter((classroom) => classroom.status !== "ARCHIVED").length ?? 0

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: c.surface, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: c.textMuted, fontSize: 15 }}>Not signed in.</Text>
      </View>
    )
  }

  const isLoading = profileQuery.isLoading || classroomsQuery.isLoading
  const error = profileQuery.error ?? classroomsQuery.error

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.screenContent,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => {
            void profileQuery.refetch()
            void classroomsQuery.refetch()
          }}
          tintColor={c.primary}
          colors={[c.primary]}
        />
      }
    >
      <GradientHeader
        title="Profile"
        subtitle="Your teacher account"
        eyebrow="Teacher"
        icon={<Ionicons name="briefcase" size={14} color={c.primary} />}
      />

      {isLoading ? (
        <View style={[styles.statusCard, { alignItems: "center", padding: 32 }]}>
          <ActivityIndicator color={c.primary} size="large" />
          <Text style={styles.statusText}>Loading your profile...</Text>
        </View>
      ) : error ? (
        <View style={[styles.statusCard, styles.errorCard]}>
          <Ionicons name="alert-circle" size={20} color={c.danger} />
          <Text style={styles.errorText}>{mapTeacherApiErrorToMessage(error)}</Text>
        </View>
      ) : (
        <>
          {/* ── Profile Hero ── */}
          <View
            style={{
              alignItems: "center",
              gap: 12,
              padding: 24,
              borderRadius: 16,
              backgroundColor: c.surfaceHero,
              borderWidth: 1,
              borderColor: c.borderAccent,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: c.primarySoft,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: `${c.primary}30`,
              }}
            >
              <Text style={{ fontSize: 28, fontWeight: "800", color: c.primary }}>
                {(profileQuery.data?.displayName ?? "T").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ alignItems: "center", gap: 2 }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: c.text }}>
                {profileQuery.data?.displayName ?? "Teacher"}
              </Text>
              <Text style={{ fontSize: 14, color: c.textMuted }}>
                {profileQuery.data?.email ?? ""}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: c.primarySoft,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                }}
              >
                <Ionicons name="school-outline" size={14} color={c.primary} />
                <Text style={{ fontSize: 13, fontWeight: "700", color: c.primary }}>
                  {classroomCount} classroom{classroomCount === 1 ? "" : "s"}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Editable Fields ── */}
          <ProfileCard title="Personal Info" subtitle="Edit your display name and department details.">
            <ProfileFieldLabel icon="person-outline" label="Display name" />
            <TextInput
              value={draft.displayName}
              autoCapitalize="words"
              placeholder="Full display name"
              placeholderTextColor={c.textSubtle}
              onChangeText={(value) => {
                setSaveMessage(null)
                setSaveError(null)
                setDraft((d) => ({ ...d, displayName: value }))
              }}
              style={styles.input}
            />

            <ProfileFieldLabel icon="business-outline" label="Department" />
            <TextInput
              value={draft.department}
              autoCapitalize="words"
              placeholder="e.g. Computer Science"
              placeholderTextColor={c.textSubtle}
              onChangeText={(value) => {
                setSaveMessage(null)
                setSaveError(null)
                setDraft((d) => ({ ...d, department: value }))
              }}
              style={styles.input}
            />

            <ProfileFieldLabel icon="ribbon-outline" label="Designation" />
            <TextInput
              value={draft.designation}
              autoCapitalize="words"
              placeholder="e.g. Associate Professor"
              placeholderTextColor={c.textSubtle}
              onChangeText={(value) => {
                setSaveMessage(null)
                setSaveError(null)
                setDraft((d) => ({ ...d, designation: value }))
              }}
              style={styles.input}
            />

            <ProfileFieldLabel icon="id-card-outline" label="Employee code" />
            <TextInput
              value={draft.employeeCode}
              autoCapitalize="characters"
              placeholder="e.g. EMP-1234"
              placeholderTextColor={c.textSubtle}
              onChangeText={(value) => {
                setSaveMessage(null)
                setSaveError(null)
                setDraft((d) => ({ ...d, employeeCode: value }))
              }}
              style={styles.input}
            />
          </ProfileCard>

          {/* ── Status messages ── */}
          {saveError ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                backgroundColor: c.dangerSoft,
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: c.dangerBorder,
              }}
            >
              <Ionicons name="alert-circle" size={16} color={c.danger} />
              <Text style={[styles.bodyText, { color: c.danger, flex: 1 }]}>{saveError}</Text>
            </View>
          ) : null}

          {saveMessage ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: c.successSoft,
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: `${c.success}30`,
              }}
            >
              <Ionicons name="checkmark-circle" size={16} color={c.success} />
              <Text style={styles.successText}>{saveMessage}</Text>
            </View>
          ) : null}

          {/* ── Save / Reset buttons ── */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              style={[
                styles.primaryButton,
                { flex: 1, flexDirection: "row", justifyContent: "center", gap: 8 },
                !canSave ? { opacity: 0.5 } : null,
              ]}
              disabled={!canSave}
              onPress={() => {
                setSaveError(null)
                const displayName = draft.displayName.trim()
                if (displayName.length < 1) return
                updateProfileMutation.mutate(
                  {
                    displayName,
                    department: draft.department.trim() || null,
                    designation: draft.designation.trim() || null,
                    employeeCode: draft.employeeCode.trim() || null,
                  },
                  {
                    onSuccess: (profile) => {
                      const nextDraft = createTeacherProfileDraft(profile)
                      setDraft(nextDraft)
                      setInitialDraft(nextDraft)
                      setSaveMessage("Profile updated.")
                    },
                    onError: (err) => {
                      setSaveMessage(null)
                      setSaveError(err instanceof Error ? err.message : "Failed to save profile.")
                    },
                  },
                )
              }}
            >
              {updateProfileMutation.isPending ? (
                <ActivityIndicator size="small" color={c.primaryContrast} />
              ) : (
                <Ionicons name="checkmark-circle-outline" size={18} color={c.primaryContrast} />
              )}
              <Text style={styles.primaryButtonLabel}>
                {updateProfileMutation.isPending ? "Saving\u2026" : "Save profile"}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.secondaryButton,
                { flex: 0.5, flexDirection: "row", justifyContent: "center", gap: 6 },
              ]}
              disabled={updateProfileMutation.isPending}
              onPress={() => {
                setSaveMessage(null)
                setSaveError(null)
                setDraft(initialDraft)
              }}
            >
              <Ionicons name="refresh-outline" size={16} color={c.text} />
              <Text style={styles.secondaryButtonLabel}>Reset</Text>
            </Pressable>
          </View>

          {/* ── Sign-out and footer ── */}
          <View style={{ gap: 12, marginTop: 8 }}>
            <Pressable
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: c.dangerBorder,
                backgroundColor: c.dangerSoft,
                paddingVertical: 16,
              }}
              onPress={signOut}
            >
              <Ionicons name="log-out-outline" size={18} color={c.danger} />
              <Text style={{ color: c.danger, fontSize: 15, fontWeight: "700" }}>Sign out</Text>
            </Pressable>
            <Text
              style={{
                color: c.textSubtle,
                fontSize: 12,
                textAlign: "center",
                lineHeight: 18,
                paddingHorizontal: 8,
              }}
            >
              Your email is managed by your institution admin.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  )
}
