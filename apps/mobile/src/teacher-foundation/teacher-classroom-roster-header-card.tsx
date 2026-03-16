import { Text, View } from "react-native"
import type { RosterRouteLinks } from "./teacher-classroom-roster-screen-models"

import { TeacherCard, TeacherNavAction, styles } from "./shared-ui"

type Props = {
  classroomTitle: string
  classroomSummaryText: string
  totalRosterCount: number
  activeRosterCount: number
  pendingRosterCount: number
  blockedRosterCount: number
  routeLinks: RosterRouteLinks
}

export function TeacherClassroomRosterHeaderCard({
  classroomTitle,
  classroomSummaryText,
  totalRosterCount,
  activeRosterCount,
  pendingRosterCount,
  blockedRosterCount,
  routeLinks,
}: Props) {
  return (
    <TeacherCard
      title={classroomTitle}
      subtitle="Open course context, see current student counts, and keep the most common roster actions close."
    >
      <Text style={styles.listMeta}>{classroomSummaryText}</Text>
      <View style={styles.cardGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Students</Text>
          <Text style={[styles.metricValue, styles.primaryTone]}>{totalRosterCount}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Active</Text>
          <Text style={[styles.metricValue, styles.successTone]}>{activeRosterCount}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Pending</Text>
          <Text style={[styles.metricValue, styles.warningTone]}>{pendingRosterCount}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Blocked</Text>
          <Text style={[styles.metricValue, styles.dangerTone]}>{blockedRosterCount}</Text>
        </View>
      </View>
      <View style={styles.actionGrid}>
        <TeacherNavAction href={routeLinks.detail} label="Back To Course" />
        <TeacherNavAction href={routeLinks.schedule} label="Schedule" />
        <TeacherNavAction href={routeLinks.announcements} label="Updates" />
      </View>
    </TeacherCard>
  )
}
