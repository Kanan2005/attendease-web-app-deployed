import { TeacherClassroomListWorkspace } from "../../../../src/teacher-workflows-client"
import { getWebPortalSession } from "../../../../src/web-session"

export default async function TeacherDashboardPage() {
  const session = await getWebPortalSession()

  return <TeacherClassroomListWorkspace accessToken={session?.accessToken ?? null} />
}
