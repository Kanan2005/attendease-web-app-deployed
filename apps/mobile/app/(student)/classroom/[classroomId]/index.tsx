import { useLocalSearchParams } from "expo-router"

import { StudentClassroomDetailScreen } from "../../../../src/student-foundation"

export default function StudentClassroomDetailRoute() {
  const params = useLocalSearchParams<{
    classroomId?: string | string[]
  }>()
  const classroomId =
    typeof params.classroomId === "string" ? params.classroomId : (params.classroomId?.[0] ?? "")

  return <StudentClassroomDetailScreen classroomId={classroomId} />
}
