import { useLocalSearchParams } from "expo-router"

import { StudentClassroomStreamScreen } from "../../../../src/student-foundation"

export default function StudentClassroomStreamRoute() {
  const params = useLocalSearchParams<{
    classroomId?: string | string[]
  }>()
  const classroomId =
    typeof params.classroomId === "string" ? params.classroomId : (params.classroomId?.[0] ?? "")

  return <StudentClassroomStreamScreen classroomId={classroomId} />
}
