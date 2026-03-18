import { useLocalSearchParams } from "expo-router"

import { TeacherClassroomScheduleScreen } from "../../../../src/teacher-foundation"

export default function TeacherClassroomScheduleRoute() {
  const params = useLocalSearchParams<{ classroomId?: string }>()

  return <TeacherClassroomScheduleScreen classroomId={params.classroomId ?? ""} />
}
