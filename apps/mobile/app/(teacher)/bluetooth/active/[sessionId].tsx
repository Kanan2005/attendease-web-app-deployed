import { useLocalSearchParams } from "expo-router"

import { TeacherBluetoothActiveSessionScreen } from "../../../../src/teacher-foundation"

export default function TeacherBluetoothActiveRoute() {
  const params = useLocalSearchParams<{
    sessionId?: string
    classroomId?: string
    classroomTitle?: string
    lectureTitle?: string
    durationMinutes?: string
    rotationWindowSeconds?: string
  }>()

  return (
    <TeacherBluetoothActiveSessionScreen
      sessionId={params.sessionId ?? ""}
      classroomId={params.classroomId ?? ""}
      classroomTitle={params.classroomTitle ?? "Teacher Classroom"}
      lectureTitle={params.lectureTitle ?? ""}
      durationMinutes={params.durationMinutes ?? "50"}
      rotationWindowSeconds={params.rotationWindowSeconds ?? "10"}
    />
  )
}
