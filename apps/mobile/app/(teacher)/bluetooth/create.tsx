import { useLocalSearchParams } from "expo-router"

import { TeacherBluetoothSessionCreateScreen } from "../../../src/teacher-foundation"

export default function TeacherBluetoothCreateRoute() {
  const params = useLocalSearchParams<{ classroomId?: string }>()

  return params.classroomId ? (
    <TeacherBluetoothSessionCreateScreen preselectedClassroomId={params.classroomId} />
  ) : (
    <TeacherBluetoothSessionCreateScreen />
  )
}
