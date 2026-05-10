import { TeacherClassroomsScreen } from "../../../src/teacher-foundation"
import { useDoubleBackToExit } from "../../../src/use-back-handler"

export default function TeacherClassroomsRoute() {
  useDoubleBackToExit()
  return <TeacherClassroomsScreen />
}
