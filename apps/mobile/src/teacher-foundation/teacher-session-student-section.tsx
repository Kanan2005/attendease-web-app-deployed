import { Pressable, StyleSheet, Text, View } from "react-native"

import { getColors } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import Animated, { FadeInDown } from "react-native-reanimated"

import type { TeacherSessionRosterRowModel } from "../teacher-operational"

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? "?"
    const last = parts[parts.length - 1]?.[0] ?? "?"
    return (first + last).toUpperCase()
  }
  return (parts[0]?.[0] ?? "?").toUpperCase()
}

export function TeacherSessionStudentSection(props: {
  title: string
  subtitle?: string
  rows: TeacherSessionRosterRowModel[]
  emptyLabel: string
  isEditable?: boolean
  onToggleStatus?: (row: TeacherSessionRosterRowModel) => void
}) {
  const c = getColors()

  if (!props.rows.length) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 20 }}>
        <Ionicons name="people-outline" size={28} color={c.textSubtle} />
        <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 6 }}>{props.emptyLabel}</Text>
      </View>
    )
  }

  return (
    <View style={{ gap: 6 }}>
      {props.rows.map((row, i) => {
        const isAbsentAction = row.actionTargetStatus === "ABSENT"
        return (
          <Animated.View
            key={row.attendanceRecordId}
            entering={FadeInDown.duration(180).delay(i * 20)}
          >
            <View
              style={[
                ss.studentRow,
                {
                  backgroundColor: c.surfaceRaised,
                  borderColor: row.pendingChangeLabel ? c.warning : c.border,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {/* Avatar */}
                <View style={[ss.avatar, { backgroundColor: c.primarySoft }]}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: c.primary }}>
                    {getInitials(row.studentDisplayName)}
                  </Text>
                </View>
                {/* Info */}
                <View style={{ flex: 1, gap: 1 }}>
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", color: c.text }}
                    numberOfLines={1}
                  >
                    {row.studentDisplayName}
                  </Text>
                  <Text style={{ fontSize: 11, color: c.textMuted }} numberOfLines={1}>
                    {row.identityLabel}
                  </Text>
                  {row.pendingChangeLabel ? (
                    <Text style={{ fontSize: 11, fontWeight: "600", color: c.warning }}>
                      {row.pendingChangeLabel}
                    </Text>
                  ) : null}
                </View>
                {/* Action */}
                {props.isEditable && row.actionLabel && props.onToggleStatus ? (
                  <Pressable
                    style={[
                      ss.actionBtn,
                      { backgroundColor: isAbsentAction ? c.dangerSoft : c.primarySoft },
                    ]}
                    onPress={() => props.onToggleStatus?.(row)}
                  >
                    <Ionicons
                      name={isAbsentAction ? "close-circle-outline" : "checkmark-circle-outline"}
                      size={14}
                      color={isAbsentAction ? c.danger : c.primary}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: isAbsentAction ? c.danger : c.primary,
                      }}
                    >
                      {row.actionLabel}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </Animated.View>
        )
      })}
    </View>
  )
}

const ss = StyleSheet.create({
  studentRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
})
