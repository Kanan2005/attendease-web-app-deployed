import { Text, View } from "react-native"

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
      subtitle="Each classroom keeps course info, roster, schedule, and Bluetooth session launch close together."
    >
      {classrooms?.length ? (
        classrooms.map((classroom) => {
          const classroomContext = teacherRoutes.classroomContext(classroom.id)
          const canLaunchBluetooth =
            classroom.status !== "ARCHIVED" && classroom.status !== "COMPLETED"

          return (
            <View key={classroom.id} style={styles.highlightCard}>
              <Text style={styles.listTitle}>
                {classroom.classroomTitle ?? classroom.displayTitle}
              </Text>
              <Text style={styles.listMeta}>
                {(classroom.courseCode ?? classroom.code).toUpperCase()} ·{" "}
                {formatEnum(classroom.status)}
              </Text>
              <Text style={styles.listMeta}>{buildTeacherClassroomSupportingText(classroom)}</Text>
              <Text style={styles.listMeta}>
                Join code: {classroom.activeJoinCode?.code ?? "No live join code"}
              </Text>
              <Text style={styles.listMeta}>
                {classroom.permissions?.canEditCourseInfo
                  ? "Course info can be updated from this phone."
                  : "Course info is read-only for this classroom."}
              </Text>
              <View style={styles.actionGrid}>
                <TeacherNavAction href={classroomContext.detail} label="Open Course" />
                {canLaunchBluetooth ? (
                  <TeacherNavAction href={classroomContext.bluetoothCreate} label="Bluetooth" />
                ) : null}
                <TeacherNavAction href={classroomContext.roster} label="Students" />
                <TeacherNavAction href={classroomContext.schedule} label="Schedule" />
              </View>
            </View>
          )
        })
      ) : (
        <TeacherEmptyCard label="No classrooms are ready yet for this teacher account." />
      )}
    </TeacherCard>
  )
}
