import { TeacherClassroomListWorkspace } from "../../../../src/teacher-workflows-client"
import { getWebPortalSession } from "../../../../src/web-session"

export default async function TeacherClassroomsPage() {
  const session = await getWebPortalSession()

  return <TeacherClassroomListWorkspace accessToken={session?.accessToken ?? null} />
}
