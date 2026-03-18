import { useLocalSearchParams } from "expo-router"

import { TeacherBluetoothSessionCreateScreen } from "../../../src/teacher-foundation"

export default function TeacherBluetoothCreateRoute() {
  const params = useLocalSearchParams<{ classroomId?: string; lectureId?: string }>()

  return (
    <TeacherBluetoothSessionCreateScreen
      classroomId={params.classroomId ?? ""}
      lectureId={params.lectureId ?? ""}
    />
  )
}
