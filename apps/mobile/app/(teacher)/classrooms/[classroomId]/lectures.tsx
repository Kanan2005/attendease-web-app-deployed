import { useLocalSearchParams } from "expo-router"

import { TeacherClassroomLecturesScreen } from "../../../../src/teacher-foundation"

export default function TeacherClassroomLecturesRoute() {
  const params = useLocalSearchParams<{ classroomId?: string }>()

  return <TeacherClassroomLecturesScreen classroomId={params.classroomId ?? ""} />
}
