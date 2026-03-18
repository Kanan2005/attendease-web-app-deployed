import { useLocalSearchParams } from "expo-router"

import { TeacherClassroomAnnouncementsScreen } from "../../../../src/teacher-foundation"

export default function TeacherClassroomAnnouncementsRoute() {
  const params = useLocalSearchParams<{ classroomId?: string }>()

  return <TeacherClassroomAnnouncementsScreen classroomId={params.classroomId ?? ""} />
}
