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
  return (
    <TeacherCard
      title="Add Student"
      subtitle="Use email, roll number, university ID, or student identifier to add a student without leaving the classroom."
    >
      <Text style={styles.fieldLabel}>Student lookup</Text>
      <TextInput
        value={studentLookup}
        autoCapitalize="none"
        placeholder="student.one@attendease.dev or 23CS001"
        onChangeText={onSetStudentLookup}
        style={styles.input}
      />
      <Text style={styles.fieldLabel}>Enrollment state</Text>
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
      <Pressable
        style={[
          styles.primaryButton,
          isAddPending || studentLookup.trim().length < 3 || addButtonDisabled
            ? styles.disabledButton
            : null,
        ]}
        disabled={isAddPending || studentLookup.trim().length < 3 || addButtonDisabled}
        onPress={() => {
          clearMessage()
          onAddStudent()
        }}
      >
        <Text style={styles.primaryButtonLabel}>{isAddPending ? "Adding..." : "Add Student"}</Text>
      </Pressable>
      {addMutationErrorMessage ? (
        <Text style={styles.errorText}>{addMutationErrorMessage}</Text>
      ) : null}
    </TeacherCard>
  )
}
