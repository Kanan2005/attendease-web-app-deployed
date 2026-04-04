import { TeacherClassroomListWorkspace } from "../../../../src/teacher-workflows-client"
import { requireWebPortalSession } from "../../../../src/web-session"

export default async function TeacherClassroomsPage() {
  const session = await requireWebPortalSession("/teacher/classrooms")

  return <TeacherClassroomListWorkspace accessToken={session.accessToken} />
}
