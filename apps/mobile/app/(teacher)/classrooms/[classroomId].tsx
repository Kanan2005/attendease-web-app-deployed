import { useLocalSearchParams } from "expo-router"

import { TeacherClassroomDetailScreen } from "../../../src/teacher-foundation"

export default function TeacherClassroomDetailRoute() {
  const params = useLocalSearchParams<{ classroomId?: string }>()

  return <TeacherClassroomDetailScreen classroomId={params.classroomId ?? ""} />
}
