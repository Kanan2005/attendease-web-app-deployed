import { getColors } from "@attendease/ui-mobile"
import { Ionicons } from "@expo/vector-icons"
import { Pressable, Text, TextInput, View } from "react-native"

import { TeacherCard, styles } from "./shared-ui"

type Props = {
  studentLookup: string
  memberStatus: "ACTIVE" | "PENDING"
  isAddPending: boolean
  addButtonDisabled: boolean
  addMutationErrorMessage: string | null
  onSetStudentLookup: (value: string) => void
  onSetMemberStatus: (status: "ACTIVE" | "PENDING") => void
  onAddStudent: () => void
  clearMessage: () => void
}

export function TeacherClassroomRosterAddCard({
  studentLookup,
  memberStatus,
  isAddPending,
  addButtonDisabled,
  addMutationErrorMessage,
  onSetStudentLookup,
  onSetMemberStatus,
  onAddStudent,
  clearMessage,
}: Props) {
  const c = getColors()
  const canAdd = !isAddPending && studentLookup.trim().length >= 3 && !addButtonDisabled

  return (
    <TeacherCard title="Add Student" subtitle="Add by email, roll number, or ID.">
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="search-outline" size={14} color={c.textSubtle} />
          <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600" }}>Student lookup</Text>
        </View>
        <TextInput
          value={studentLookup}
          autoCapitalize="none"
          placeholder="student@example.com or 23CS001"
          placeholderTextColor={c.textSubtle}
          onChangeText={onSetStudentLookup}
          style={styles.input}
        />
      </View>

      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="flag-outline" size={14} color={c.textSubtle} />
          <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600" }}>Enrollment state</Text>
        </View>
        <View style={styles.actionGrid}>
          <Pressable
            style={[
              styles.secondaryButton,
              memberStatus === "ACTIVE" ? styles.selectedActionButton : null,
            ]}
            onPress={() => onSetMemberStatus("ACTIVE")}
          >
            <Text style={styles.secondaryButtonLabel}>
              {memberStatus === "ACTIVE" ? "Active now" : "Mark active"}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.secondaryButton,
              memberStatus === "PENDING" ? styles.selectedActionButton : null,
            ]}
            onPress={() => onSetMemberStatus("PENDING")}
          >
            <Text style={styles.secondaryButtonLabel}>
              {memberStatus === "PENDING" ? "Pending review" : "Mark pending"}
            </Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        style={[styles.primaryButton, !canAdd ? { opacity: 0.5 } : null]}
        disabled={!canAdd}
        onPress={() => {
          clearMessage()
          onAddStudent()
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="person-add-outline" size={18} color={c.primaryContrast} />
          <Text style={styles.primaryButtonLabel}>{isAddPending ? "Adding…" : "Add student"}</Text>
        </View>
      </Pressable>
      {addMutationErrorMessage ? (
        <Text style={styles.errorText}>{addMutationErrorMessage}</Text>
      ) : null}
    </TeacherCard>
  )
}
