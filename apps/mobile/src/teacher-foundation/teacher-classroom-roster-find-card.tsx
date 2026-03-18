import { Pressable, Text, TextInput, View } from "react-native"

import { TeacherCard, formatEnum, styles } from "./shared-ui"
import type { TeacherRosterStatusFilter as FilterType } from "./teacher-classroom-roster-screen-models"

type Props = {
  searchText: string
  statusFilter: FilterType
  statusFilters: readonly FilterType[]
  rosterSummaryText: string
  onSetSearchText: (value: string) => void
  onSetStatusFilter: (value: FilterType) => void
}

export function TeacherClassroomRosterFindCard({
  searchText,
  statusFilter,
  statusFilters,
  rosterSummaryText,
  onSetSearchText,
  onSetStatusFilter,
}: Props) {
  return (
    <TeacherCard
      title="Find Students"
      subtitle="Search students."
    >
      <TextInput
        value={searchText}
        autoCapitalize="none"
        placeholder="Search students"
        onChangeText={onSetSearchText}
        style={styles.input}
      />
      <View style={styles.actionGrid}>
        {statusFilters.map((filter) => (
          <Pressable
            key={filter}
            style={[
              styles.secondaryButton,
              statusFilter === filter ? styles.selectedActionButton : null,
            ]}
            onPress={() => onSetStatusFilter(filter)}
          >
            <Text style={styles.secondaryButtonLabel}>
              {filter === "ALL" ? "All" : formatEnum(filter as never)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.listMeta}>{rosterSummaryText}</Text>
    </TeacherCard>
  )
}
