import { useLocalSearchParams } from "expo-router"

import { StudentQrAttendanceScreen } from "../../../src/student-foundation"

export default function StudentQrAttendanceRoute() {
  const params = useLocalSearchParams<{ classroomId?: string }>()
  return (
    <StudentQrAttendanceScreen
      {...(params.classroomId ? { classroomId: params.classroomId } : {})}
    />
  )
}
