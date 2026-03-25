import { getColors } from "@attendease/ui-mobile"
import { StatusPill } from "@attendease/ui-mobile/animated"
import { Ionicons } from "@expo/vector-icons"
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

function actionIcon(
  action: RosterMemberModel["actions"][number],
): React.ComponentProps<typeof Ionicons>["name"] {
  const lower = action.label.toLowerCase()
  if (lower.includes("remove")) return "trash-outline"
  if (lower.includes("deactivate") || lower.includes("suspend")) return "pause-circle-outline"
  if (lower.includes("activate") || lower.includes("reinstate")) return "play-circle-outline"
  return "swap-horizontal-outline"
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
  const c = getColors()

  return (
    <TeacherCard title="Students">
      {members.length ? (
        members.map((member) => {
          const attendanceActive = member.attendanceDisabled !== "true"
          return (
            <View key={member.id} style={styles.memberCard}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: c.primarySoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "800", color: c.primary }}>
                    {member.studentDisplayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.listTitle}>{member.studentDisplayName}</Text>
                  <Text style={styles.listMeta}>{member.identityText}</Text>
                </View>
                <StatusPill
                  label={attendanceActive ? "Active" : "Paused"}
                  tone={attendanceActive ? "success" : "warning"}
                />
              </View>
              <Text style={styles.listMeta}>
                {member.statusText} · Joined {member.joinedAtText}
              </Text>
              <View style={styles.actionGrid}>
                {member.actions.map((action) => (
                  <Pressable
                    key={`${member.id}-${action.label}`}
                    style={action.tone === "danger" ? styles.dangerButton : styles.secondaryButton}
                    disabled={isRosterLoading}
                    onPress={() => onPerformMemberAction(member, action)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons
                        name={actionIcon(action)}
                        size={15}
                        color={action.tone === "danger" ? c.primaryContrast : c.primary}
                      />
                      <Text
                        style={
                          action.tone === "danger"
                            ? styles.primaryButtonLabel
                            : styles.secondaryButtonLabel
                        }
                      >
                        {action.label}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )
        })
      ) : isAddStudentEnabled ? (
        <TeacherEmptyCard label="No students yet." />
      ) : (
        <TeacherEmptyCard label="No matching students." />
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
