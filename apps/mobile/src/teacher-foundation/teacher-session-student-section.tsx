import { Pressable, Text, View } from "react-native"

import type { TeacherSessionRosterRowModel } from "../teacher-operational"
import { formatDateTime } from "./shared-ui"
import { styles } from "./shared-ui"

export function TeacherSessionStudentSection(props: {
  title: string
  subtitle: string
  rows: TeacherSessionRosterRowModel[]
  emptyLabel: string
  isEditable?: boolean
  onToggleStatus?: (row: TeacherSessionRosterRowModel) => void
}) {
  return (
    <View style={styles.sessionSection}>
      <Text style={styles.sectionTitle}>{props.title}</Text>
      <Text style={styles.listMeta}>{props.subtitle}</Text>
      {props.rows.length ? (
        props.rows.map((row) => (
          <View key={row.attendanceRecordId} style={styles.sessionStudentCard}>
            <View style={styles.sessionStudentHeader}>
              <Text style={styles.listTitle}>{row.studentDisplayName}</Text>
              <View
                style={[
                  styles.statusChip,
                  row.statusTone === "success"
                    ? styles.successChip
                    : row.statusTone === "warning"
                      ? styles.warningChip
                      : row.statusTone === "danger"
                        ? styles.dangerChip
                        : styles.primaryChip,
                ]}
              >
                <Text style={styles.statusChipText}>
                  {row.effectiveStatus === "PRESENT" ? "Present" : "Absent"}
                </Text>
              </View>
            </View>
            <Text style={styles.listMeta}>{row.identityLabel}</Text>
            <Text style={styles.listMeta}>
              {row.markedAt
                ? `Last marked ${formatDateTime(row.markedAt)}`
                : row.effectiveStatus === "PRESENT"
                  ? "Ready to count as present once you save."
                  : "No attendance mark recorded yet."}
            </Text>
            {row.pendingChangeLabel ? (
              <Text style={styles.pendingText}>{row.pendingChangeLabel}</Text>
            ) : null}
            {props.isEditable && row.actionLabel && props.onToggleStatus ? (
              <View style={styles.actionGrid}>
                <Pressable
                  style={[
                    row.actionTargetStatus === "ABSENT"
                      ? styles.dangerButton
                      : styles.secondaryButton,
                    row.pendingChangeLabel ? styles.selectedActionButton : null,
                  ]}
                  onPress={() => props.onToggleStatus?.(row)}
                >
                  <Text
                    style={
                      row.actionTargetStatus === "ABSENT"
                        ? styles.primaryButtonLabel
                        : styles.secondaryButtonLabel
                    }
                  >
                    {row.actionLabel}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))
      ) : (
        <Text style={styles.listMeta}>{props.emptyLabel}</Text>
      )}
    </View>
  )
}
