import { useLocalSearchParams } from "expo-router"

import { StudentBluetoothAttendanceScreen } from "../../../src/student-foundation"

export default function StudentBluetoothAttendanceRoute() {
  const params = useLocalSearchParams<{ classroomId?: string }>()
  return (
    <StudentBluetoothAttendanceScreen
      {...(params.classroomId ? { classroomId: params.classroomId } : {})}
    />
  )
}
