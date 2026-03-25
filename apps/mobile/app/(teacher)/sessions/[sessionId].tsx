import { useLocalSearchParams } from "expo-router"

import { TeacherSessionDetailScreen } from "../../../src/teacher-foundation"

export default function TeacherSessionDetailRoute() {
  const params = useLocalSearchParams<{ sessionId?: string; classroomId?: string }>()
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : ""

  return (
    <TeacherSessionDetailScreen
      sessionId={sessionId}
      {...(params.classroomId ? { classroomId: params.classroomId } : {})}
    />
  )
}
