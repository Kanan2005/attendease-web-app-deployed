import { useLocalSearchParams } from "expo-router"

import { StudentClassroomScheduleScreen } from "../../../../src/student-foundation"

export default function StudentClassroomScheduleRoute() {
  const params = useLocalSearchParams<{
    classroomId?: string | string[]
  }>()
  const classroomId =
    typeof params.classroomId === "string" ? params.classroomId : (params.classroomId?.[0] ?? "")

  return <StudentClassroomScheduleScreen classroomId={classroomId} />
}
