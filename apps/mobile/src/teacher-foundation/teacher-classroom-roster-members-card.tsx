import { Pressable, Text, View } from "react-native"

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { TeacherCard, TeacherEmptyCard, styles } from "./shared-ui"
import type { RosterMemberModel } from "./teacher-classroom-roster-screen-models"

type Props = {
  members: RosterMemberModel[]
  rosterMessage: string | null
  updateMutationError: unknown | null
  removeMutationError: unknown | null
  isAddStudentEnabled: boolean
  isRosterLoading: boolean
  onPerformMemberAction: (
    member: RosterMemberModel,
    action: RosterMemberModel["actions"][number],
  ) => void
}

export function TeacherClassroomRosterMembersCard({
  members,
  rosterMessage,
  updateMutationError,
  removeMutationError,
  isAddStudentEnabled,
  isRosterLoading,
  onPerformMemberAction,
}: Props) {
  return (
    <TeacherCard
      title="Students"
      subtitle="Update enrollment state or remove a student without leaving the classroom."
    >
      {members.length ? (
        members.map((member) => (
          <View key={member.id} style={styles.memberCard}>
            <Text style={styles.listTitle}>{member.studentDisplayName}</Text>
            <Text style={styles.listMeta}>{member.identityText}</Text>
            <Text style={styles.listMeta}>
              {member.statusText} · Joined {member.joinedAtText}
            </Text>
            <Text style={styles.listMeta}>Attendance disabled: {member.attendanceDisabled}</Text>
            <View style={styles.actionGrid}>
              {member.actions.map((action) => (
                <Pressable
                  key={`${member.id}-${action.label}`}
                  style={action.tone === "danger" ? styles.dangerButton : styles.secondaryButton}
                  disabled={isRosterLoading}
                  onPress={() => {
                    onPerformMemberAction(member, action)
                  }}
                >
                  <Text
                    style={
                      action.tone === "danger"
                        ? styles.primaryButtonLabel
                        : styles.secondaryButtonLabel
                    }
                  >
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))
      ) : isAddStudentEnabled ? (
        <TeacherEmptyCard label="No students are in this classroom yet." />
      ) : (
        <TeacherEmptyCard label="No students match this search or status filter yet." />
      )}
      {updateMutationError ? (
        <Text style={styles.errorText}>{mapTeacherApiErrorToMessage(updateMutationError)}</Text>
      ) : null}
      {removeMutationError ? (
        <Text style={styles.errorText}>{mapTeacherApiErrorToMessage(removeMutationError)}</Text>
      ) : null}
      {rosterMessage ? <Text style={styles.successText}>{rosterMessage}</Text> : null}
    </TeacherCard>
  )
}
