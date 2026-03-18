import { Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { getColors } from "@attendease/ui-mobile"

import type { ClassroomSummary } from "@attendease/contracts"
import { buildTeacherClassroomSupportingText } from "../teacher-classroom-management"
import { teacherRoutes } from "../teacher-routes"
import { TeacherCard, TeacherEmptyCard, TeacherNavAction, formatEnum, styles } from "./shared-ui"

type ClassroomListCardProps = {
  classrooms: ClassroomSummary[] | undefined
}

export function TeacherClassroomsListCard({ classrooms }: ClassroomListCardProps) {
  return (
    <TeacherCard
      title="Classroom List"
    >
      {classrooms?.length ? (
        classrooms.map((classroom) => {
          const classroomContext = teacherRoutes.classroomContext(classroom.id)
          const canLaunchBluetooth =
            classroom.status !== "ARCHIVED" && classroom.status !== "COMPLETED"

          return (
            <View key={classroom.id} style={styles.highlightCard}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: getColors().primarySoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="library-outline" size={18} color={getColors().primary} />
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={styles.listTitle}>
                    {classroom.classroomTitle ?? classroom.displayTitle}
                  </Text>
                  <Text style={styles.listMeta}>
                    {(classroom.courseCode ?? classroom.code).toUpperCase()} · {formatEnum(classroom.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.listMeta}>
                Join code: {classroom.activeJoinCode?.code ?? "No live join code"}
              </Text>
              <View style={styles.actionGrid}>
                <TeacherNavAction href={classroomContext.detail} label="Open Course" icon="open-outline" />
                {canLaunchBluetooth ? (
                  <TeacherNavAction href={classroomContext.bluetoothCreate} label="Bluetooth" icon="bluetooth-outline" />
                ) : null}
                <TeacherNavAction href={classroomContext.roster} label="Students" icon="people-outline" />
                <TeacherNavAction href={classroomContext.schedule} label="Schedule" icon="calendar-outline" />
              </View>
            </View>
          )
        })
      ) : (
        <TeacherEmptyCard label="No classrooms yet." />
      )}
    </TeacherCard>
  )
}
