import { StudentClassroomsScreen } from "../../../src/student-foundation"
import { useDoubleBackToExit } from "../../../src/use-back-handler"

export default function StudentClassroomsRoute() {
  useDoubleBackToExit()
  return <StudentClassroomsScreen />
}
