import { useLocalSearchParams } from "expo-router"

import { TeacherClassroomRosterScreen } from "../../../../src/teacher-foundation"

export default function TeacherClassroomRosterRoute() {
  const params = useLocalSearchParams<{ classroomId?: string }>()

  return <TeacherClassroomRosterScreen classroomId={params.classroomId ?? ""} />
}
