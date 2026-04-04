import { getColors, mobileTheme } from "@attendease/ui-mobile"
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
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { TeacherClassroomRosterBulkCard } from "./teacher-classroom-roster-bulk-card"
import { TeacherClassroomRosterImportStatusCard } from "./teacher-classroom-roster-import-status-card"
import type {
  RosterJobModel,
  RosterMemberActionModel,
  RosterMemberModel,
  RosterRouteLinks,
  TeacherRosterStatusFilter,
} from "./teacher-classroom-roster-screen-models"

export type { TeacherRosterStatusFilter } from "./teacher-classroom-roster-screen-models"

type Props = {
  hasSession: boolean
  isLoading: boolean
  loadErrorMessage: string | null
  rosterStatusBanner: {
    tone: "primary" | "success" | "warning" | "danger"
    title: string
    message: string
  }
  classroomTitle: string
  classroomSummaryText: string
  totalRosterCount: number
  activeRosterCount: number
  pendingRosterCount: number
  blockedRosterCount: number
  routeLinks: RosterRouteLinks
  studentLookup: string
  memberStatus: "ACTIVE" | "PENDING"
  importSourceFileName: string
  importRowsText: string
  invalidImportRows: number
  parsedRowsCount: number
  importPreviewTitle: string
  importPreviewMessage: string
  searchText: string
  statusFilter: TeacherRosterStatusFilter
  statusFilters: readonly TeacherRosterStatusFilter[]
  rosterSummaryText: string
  rosterMessage: string | null
  members: RosterMemberModel[]
  jobs: RosterJobModel[]
  isCreateImportPending: boolean
  isApplyImportPending: boolean
  addMutationError: unknown | null
  updateMutationError: unknown | null
  removeMutationError: unknown | null
  applyImportMutationError: unknown | null
  isAddPending: boolean
  addButtonDisabled: boolean
  isRosterLoading: boolean
  rosterImportLoading: boolean
  onSetStudentLookup: (value: string) => void
  onSetMemberStatus: (status: "ACTIVE" | "PENDING") => void
  onAddStudent: () => void
  onSetSearchText: (value: string) => void
  onSetStatusFilter: (value: TeacherRosterStatusFilter) => void
  onPerformMemberAction: (member: RosterMemberModel, action: RosterMemberActionModel) => void
  onSetImportSourceFileName: (value: string) => void
  onSetImportRows: (value: string) => void
  onCreateImportJob: () => void
  onApplyReviewJob: (jobId: string) => void
  onSetRosterMessage: (value: string | null) => void
  isAddStudentEnabled: boolean
}

export function TeacherClassroomRosterScreenContent(props: Props) {
  const c = getColors()
  const insets = useSafeAreaInsets()
  const [showAddForm, setShowAddForm] = useState(false)

  if (!props.hasSession) {
    return (
      <View style={[rs.centerContainer, { backgroundColor: c.surface }]}>
        <Ionicons name="lock-closed-outline" size={40} color={c.textSubtle} />
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.text, marginTop: 12 }}>
          Sign in required
        </Text>
      </View>
    )
  }

  if (props.isLoading) {
    return (
      <View style={[rs.centerContainer, { backgroundColor: c.surface }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 12 }}>Loading students…</Text>
      </View>
    )
  }

  if (props.loadErrorMessage) {
    return (
      <View style={[rs.centerContainer, { backgroundColor: c.surface }]}>
        <Ionicons name="alert-circle" size={40} color={c.danger} />
        <Text style={{ fontSize: 14, color: c.danger, marginTop: 12, textAlign: "center" }}>
          {props.loadErrorMessage}
        </Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header: count + search ── */}
        <View style={rs.header}>
          <View style={rs.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[rs.heading, { color: c.text }]}>
                {props.totalRosterCount} Student{props.totalRosterCount === 1 ? "" : "s"}
              </Text>
              <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 2 }}>
                {props.classroomTitle}
              </Text>
            </View>
          </View>

          {/* Search bar */}
          <View style={[rs.searchBar, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
            <Ionicons name="search-outline" size={17} color={c.textSubtle} />
            <TextInput
              value={props.searchText}
              onChangeText={props.onSetSearchText}
              placeholder="Search students…"
              placeholderTextColor={c.textSubtle}
              autoCapitalize="none"
              style={[rs.searchInput, { color: c.text }]}
            />
            {props.searchText.length > 0 ? (
              <Pressable onPress={() => props.onSetSearchText("")} hitSlop={8}>
                <Ionicons name="close-circle" size={17} color={c.textSubtle} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* ── Success/error toast ── */}
        {props.rosterMessage ? (
          <Animated.View entering={FadeInDown.duration(200)} style={rs.toastContainer}>
            <View style={[rs.toast, { backgroundColor: c.successSoft }]}>
              <Ionicons name="checkmark-circle" size={17} color={c.success} />
              <Text style={{ fontSize: 13, color: c.success, flex: 1 }}>
                {props.rosterMessage}
              </Text>
              <Pressable onPress={() => props.onSetRosterMessage(null)} hitSlop={8}>
                <Ionicons name="close" size={15} color={c.success} />
              </Pressable>
            </View>
          </Animated.View>
        ) : null}

        {/* ── Inline add student form ── */}
        {showAddForm ? (
          <Animated.View
            entering={FadeInDown.duration(250)}
            style={[rs.addFormCard, { backgroundColor: c.surfaceRaised, borderColor: c.border }]}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>Add Student</Text>
            <TextInput
              value={props.studentLookup}
              autoCapitalize="none"
              placeholder="Email, roll number, or student ID"
              placeholderTextColor={c.textSubtle}
              onChangeText={props.onSetStudentLookup}
              style={[
                rs.addInput,
                { backgroundColor: c.surfaceMuted, borderColor: c.border, color: c.text },
              ]}
            />
            <Pressable
              style={[
                rs.addButton,
                {
                  backgroundColor: c.primary,
                  opacity: props.isAddPending || props.studentLookup.trim().length < 3 ? 0.5 : 1,
                },
              ]}
              disabled={props.isAddPending || props.studentLookup.trim().length < 3}
              onPress={() => {
                props.onSetRosterMessage(null)
                props.onAddStudent()
              }}
            >
              <Ionicons name="person-add-outline" size={15} color={c.primaryContrast} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.primaryContrast }}>
                {props.isAddPending ? "Adding…" : "Add Student"}
              </Text>
            </Pressable>
            {rosterErrorMessage(props.addMutationError) ? (
              <Text style={{ fontSize: 12, color: c.danger }}>
                {rosterErrorMessage(props.addMutationError)}
              </Text>
            ) : null}
          </Animated.View>
        ) : null}

        {/* ── Student list ── */}
        <View style={rs.listContainer}>
          {props.members.length > 0 ? (
            props.members.map((member, i) => (
              <Animated.View key={member.id} entering={FadeInDown.duration(200).delay(i * 25)}>
                <StudentRow
                  member={member}
                  index={i}
                  isLast={i === props.members.length - 1}
                  isRosterLoading={props.isRosterLoading}
                  onPerformMemberAction={props.onPerformMemberAction}
                />
              </Animated.View>
            ))
          ) : (
            <View style={rs.emptyState}>
              <Ionicons name="people-outline" size={44} color={c.textSubtle} />
              <Text style={{ fontSize: 16, fontWeight: "600", color: c.text, marginTop: 8 }}>
                {props.searchText.trim() ? "No matches" : "No students yet"}
              </Text>
              <Text style={{ fontSize: 13, color: c.textMuted, textAlign: "center" }}>
                {props.searchText.trim()
                  ? "Try a different search term"
                  : "Tap the + button to add students"}
              </Text>
            </View>
          )}
        </View>

        {/* ── Error messages ── */}
        {props.removeMutationError ? (
          <View style={rs.toastContainer}>
            <View style={[rs.toast, { backgroundColor: c.dangerSoft }]}>
              <Ionicons name="alert-circle" size={17} color={c.danger} />
              <Text style={{ fontSize: 13, color: c.danger, flex: 1 }}>
                {mapTeacherApiErrorToMessage(props.removeMutationError)}
              </Text>
            </View>
          </View>
        ) : null}

        {/* ── Bulk import section ── */}
        <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 12 }}>
          <TeacherClassroomRosterBulkCard
            importPreviewTitle={props.importPreviewTitle}
            importPreviewMessage={props.importPreviewMessage}
            importSourceFileName={props.importSourceFileName}
            importRowsText={props.importRowsText}
            parsedRowsCount={props.parsedRowsCount}
            invalidImportRows={props.invalidImportRows}
            isCreateImportPending={props.isCreateImportPending}
            onSetImportSourceFileName={props.onSetImportSourceFileName}
            onSetImportRows={props.onSetImportRows}
            onCreateImportJob={props.onCreateImportJob}
            onSetRosterMessage={props.onSetRosterMessage}
            isAddStudentEnabled={props.isAddStudentEnabled}
            hasSourceAndRows={
              props.importSourceFileName.trim().length > 0 && props.parsedRowsCount > 0
            }
          />
          {props.rosterImportLoading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12 }}>
              <ActivityIndicator size="small" color={c.primary} />
              <Text style={{ fontSize: 13, color: c.textMuted }}>Loading import status…</Text>
            </View>
          ) : null}
          <TeacherClassroomRosterImportStatusCard
            jobs={props.jobs}
            isApplyImportPending={props.isApplyImportPending}
            applyImportMutationError={props.applyImportMutationError}
            onApplyReviewJob={props.onApplyReviewJob}
          />
        </View>
      </ScrollView>

      {/* ── FAB to toggle add form ── */}
      <Pressable
        onPress={() => setShowAddForm((v) => !v)}
        style={[rs.fab, { backgroundColor: c.primary, ...mobileTheme.shadow.glow }]}
      >
        <Ionicons
          name={showAddForm ? "close" : "person-add-outline"}
          size={24}
          color={c.primaryContrast}
        />
      </Pressable>
    </View>
  )
}

/* ── Student row ── */
function StudentRow(props: {
  member: RosterMemberModel
  index: number
  isLast: boolean
  isRosterLoading: boolean
  onPerformMemberAction: (member: RosterMemberModel, action: RosterMemberActionModel) => void
}) {
  const c = getColors()
  const { member } = props
  const removeAction = member.actions.find((a) => a.kind === "REMOVE") ?? null

  // Alternate avatar colors for visual variety
  const avatarColors = [
    { bg: c.primarySoft, fg: c.primary },
    { bg: c.successSoft, fg: c.success },
    { bg: c.warningSoft, fg: c.warning },
  ]
  const pal = avatarColors[props.index % avatarColors.length]!

  return (
    <View
      style={[
        rs.studentRow,
        { backgroundColor: c.surfaceRaised, borderColor: c.border },
      ]}
    >
      <View style={[rs.avatar, { backgroundColor: pal.bg }]}>
        <Text style={{ fontSize: 14, fontWeight: "800", color: pal.fg }}>
          {member.studentDisplayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: c.text }} numberOfLines={1}>
          {member.studentDisplayName}
        </Text>
        <Text style={{ fontSize: 11, color: c.textMuted }} numberOfLines={1}>
          {member.identityText}
        </Text>
      </View>
      {removeAction ? (
        <Pressable
          disabled={props.isRosterLoading}
          onPress={() => props.onPerformMemberAction(member, removeAction)}
          hitSlop={10}
          style={[rs.removeBtn, { backgroundColor: c.dangerSoft }]}
        >
          <Ionicons name="trash-outline" size={15} color={c.danger} />
        </Pressable>
      ) : null}
    </View>
  )
}

function rosterErrorMessage(error: unknown): string | null {
  return error ? mapTeacherApiErrorToMessage(error) : null
}

const rs = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  toastContainer: {
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addFormCard: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  addInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
  },
  listContainer: {
    paddingHorizontal: 16,
    gap: 6,
    paddingTop: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 4,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
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
