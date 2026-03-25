import { getColors, mobileTheme } from "@attendease/ui-mobile"
import { StatusPill } from "@attendease/ui-mobile/animated"
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
      <View
        style={{
          flex: 1,
          backgroundColor: c.surface,
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <Ionicons name="lock-closed-outline" size={40} color={c.textSubtle} />
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.text, marginTop: 12 }}>
          Sign in required
        </Text>
      </View>
    )
  }

  if (props.isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 12 }}>Loading roster…</Text>
      </View>
    )
  }

  if (props.loadErrorMessage) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.surface,
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <Ionicons name="alert-circle" size={40} color={c.danger} />
        <Text style={{ fontSize: 14, color: c.danger, marginTop: 12, textAlign: "center" }}>
          {props.loadErrorMessage}
        </Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surface }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Classroom header ── */}
      <View style={rs.headerSection}>
        <Text style={[rs.classroomTitle, { color: c.text }]} numberOfLines={2}>
          {props.classroomTitle}
        </Text>
        <View style={rs.statsRow}>
          <StatChip
            label="Total"
            value={props.totalRosterCount}
            color={c.primary}
            bg={c.primarySoft}
          />
          <StatChip
            label="Active"
            value={props.activeRosterCount}
            color={c.success}
            bg={c.successSoft}
          />
          {props.pendingRosterCount > 0 ? (
            <StatChip
              label="Pending"
              value={props.pendingRosterCount}
              color={c.warning}
              bg={c.warningSoft}
            />
          ) : null}
          {props.blockedRosterCount > 0 ? (
            <StatChip
              label="Blocked"
              value={props.blockedRosterCount}
              color={c.danger}
              bg={c.dangerSoft}
            />
          ) : null}
        </View>
      </View>

      {/* ── Search + filter bar ── */}
      <View
        style={[
          rs.section,
          {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: c.border,
            paddingBottom: 16,
          },
        ]}
      >
        <View
          style={[rs.searchBar, { backgroundColor: c.surfaceMuted, borderColor: c.borderStrong }]}
        >
          <Ionicons name="search-outline" size={18} color={c.textSubtle} />
          <TextInput
            value={props.searchText}
            onChangeText={props.onSetSearchText}
            placeholder="Search by name or roll number…"
            placeholderTextColor={c.textSubtle}
            autoCapitalize="none"
            style={[rs.searchInput, { color: c.text }]}
          />
          {props.searchText.length > 0 ? (
            <Pressable onPress={() => props.onSetSearchText("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={c.textSubtle} />
            </Pressable>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 4 }}
          >
            {props.statusFilters.map((filter) => {
              const active = props.statusFilter === filter
              return (
                <Pressable
                  key={filter}
                  onPress={() => props.onSetStatusFilter(filter)}
                  style={[
                    rs.filterPill,
                    {
                      borderColor: active ? c.primary : c.border,
                      backgroundColor: active ? c.primarySoft : c.surfaceRaised,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: active ? c.primary : c.textMuted,
                    }}
                  >
                    {filter === "ALL" ? "All" : filter.charAt(0) + filter.slice(1).toLowerCase()}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
          <Pressable
            onPress={() => setShowAddForm((v) => !v)}
            style={[rs.addToggle, { backgroundColor: c.primary }]}
          >
            <Ionicons
              name={showAddForm ? "close" : "person-add-outline"}
              size={16}
              color={c.primaryContrast}
            />
          </Pressable>
        </View>
        <Text style={{ fontSize: 12, color: c.textSubtle }}>{props.rosterSummaryText}</Text>
      </View>

      {/* ── Inline add student form (toggled) ── */}
      {showAddForm ? (
        <Animated.View
          entering={FadeInDown.duration(250)}
          style={[
            rs.section,
            {
              backgroundColor: c.surfaceTint,
              marginHorizontal: 16,
              marginTop: 12,
              borderRadius: 14,
              padding: 16,
              gap: 12,
              borderWidth: 1,
              borderColor: c.border,
            },
          ]}
        >
          <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>Add Student</Text>
          <TextInput
            value={props.studentLookup}
            autoCapitalize="none"
            placeholder="Email, roll number, or student ID"
            placeholderTextColor={c.textSubtle}
            onChangeText={props.onSetStudentLookup}
            style={[
              rs.searchBar,
              rs.searchInput,
              {
                backgroundColor: c.surfaceMuted,
                borderColor: c.borderStrong,
                flex: 0,
                paddingHorizontal: 14,
                paddingVertical: 12,
              },
            ]}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => props.onSetMemberStatus("ACTIVE")}
              style={[
                rs.filterPill,
                {
                  borderColor: props.memberStatus === "ACTIVE" ? c.primary : c.border,
                  backgroundColor:
                    props.memberStatus === "ACTIVE" ? c.primarySoft : c.surfaceRaised,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: props.memberStatus === "ACTIVE" ? c.primary : c.textMuted,
                }}
              >
                Active
              </Text>
            </Pressable>
            <Pressable
              onPress={() => props.onSetMemberStatus("PENDING")}
              style={[
                rs.filterPill,
                {
                  borderColor: props.memberStatus === "PENDING" ? c.primary : c.border,
                  backgroundColor:
                    props.memberStatus === "PENDING" ? c.primarySoft : c.surfaceRaised,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: props.memberStatus === "PENDING" ? c.primary : c.textMuted,
                }}
              >
                Pending
              </Text>
            </Pressable>
          </View>
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
            <Ionicons name="person-add-outline" size={16} color={c.primaryContrast} />
            <Text style={{ fontSize: 14, fontWeight: "700", color: c.primaryContrast }}>
              {props.isAddPending ? "Adding…" : "Add"}
            </Text>
          </Pressable>
          {rosterErrorMessage(props.addMutationError) ? (
            <Text style={{ fontSize: 13, color: c.danger }}>
              {rosterErrorMessage(props.addMutationError)}
            </Text>
          ) : null}
        </Animated.View>
      ) : null}

      {/* ── Success/error messages ── */}
      {props.rosterMessage ? (
        <View style={[rs.section, { paddingVertical: 8 }]}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: c.successSoft,
              borderRadius: 10,
              padding: 12,
            }}
          >
            <Ionicons name="checkmark-circle" size={18} color={c.success} />
            <Text style={{ fontSize: 13, color: c.success, flex: 1 }}>{props.rosterMessage}</Text>
            <Pressable onPress={() => props.onSetRosterMessage(null)} hitSlop={8}>
              <Ionicons name="close" size={16} color={c.success} />
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* ── Student list ── */}
      <View style={rs.section}>
        {props.members.length > 0 ? (
          props.members.map((member, i) => (
            <StudentRow
              key={member.id}
              member={member}
              isLast={i === props.members.length - 1}
              isRosterLoading={props.isRosterLoading}
              onPerformMemberAction={props.onPerformMemberAction}
            />
          ))
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 32, gap: 8 }}>
            <Ionicons name="people-outline" size={36} color={c.textSubtle} />
            <Text style={{ fontSize: 14, color: c.textMuted }}>
              {props.isAddStudentEnabled ? "No students yet" : "No matching students"}
            </Text>
          </View>
        )}
      </View>

      {props.updateMutationError ? (
        <View style={[rs.section, { paddingVertical: 4 }]}>
          <Text style={{ fontSize: 13, color: c.danger }}>
            {mapTeacherApiErrorToMessage(props.updateMutationError)}
          </Text>
        </View>
      ) : null}
      {props.removeMutationError ? (
        <View style={[rs.section, { paddingVertical: 4 }]}>
          <Text style={{ fontSize: 13, color: c.danger }}>
            {mapTeacherApiErrorToMessage(props.removeMutationError)}
          </Text>
        </View>
      ) : null}

      {/* ── Bulk import (keep existing cards for power users) ── */}
      <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 8 }}>
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
  )
}

/* ── Student row component ── */
function StudentRow(props: {
  member: RosterMemberModel
  isLast: boolean
  isRosterLoading: boolean
  onPerformMemberAction: (member: RosterMemberModel, action: RosterMemberActionModel) => void
}) {
  const c = getColors()
  const { member } = props
  const isActive = member.attendanceDisabled !== "Yes"

  return (
    <View
      style={[
        rs.studentRow,
        !props.isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.border,
        },
      ]}
    >
      <View style={rs.studentRowTop}>
        <View style={[rs.avatar, { backgroundColor: c.primarySoft }]}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: c.primary }}>
            {member.studentDisplayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: c.text }} numberOfLines={1}>
            {member.studentDisplayName}
          </Text>
          <Text style={{ fontSize: 12, color: c.textMuted }} numberOfLines={1}>
            {member.identityText}
          </Text>
        </View>
        <StatusPill
          label={isActive ? "Active" : "Paused"}
          tone={isActive ? "success" : "warning"}
        />
      </View>
      {member.actions.length > 0 ? (
        <View style={rs.actionRow}>
          {member.actions.map((action) => (
            <Pressable
              key={`${member.id}-${action.label}`}
              disabled={props.isRosterLoading}
              onPress={() => props.onPerformMemberAction(member, action)}
              style={[
                rs.actionBtn,
                action.tone === "danger"
                  ? { backgroundColor: c.dangerSoft }
                  : { backgroundColor: c.surfaceTint, borderWidth: 1, borderColor: c.border },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: action.tone === "danger" ? c.danger : c.text,
                }}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}

/* ── Stat chip ── */
function StatChip(props: { label: string; value: number; color: string; bg: string }) {
  return (
    <View style={[rs.statChip, { backgroundColor: props.bg }]}>
      <Text style={{ fontSize: 16, fontWeight: "800", color: props.color }}>{props.value}</Text>
      <Text style={{ fontSize: 11, fontWeight: "600", color: props.color, opacity: 0.8 }}>
        {props.label}
      </Text>
    </View>
  )
}

function rosterErrorMessage(error: unknown): string | null {
  return error ? mapTeacherApiErrorToMessage(error) : null
}

const rs = StyleSheet.create({
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  classroomTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 4,
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
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  filterPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addToggle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
  },
  studentRow: {
    paddingVertical: 12,
    gap: 8,
  },
  studentRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 50,
  },
  actionBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
})
