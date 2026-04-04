import { TeacherSessionHistoryWorkspace } from "../../../../../src/teacher-workflows-client"
import { requireWebPortalSession } from "../../../../../src/web-session"

export default async function TeacherSessionHistoryPage() {
  const session = await requireWebPortalSession("/teacher/sessions/history")

  return <TeacherSessionHistoryWorkspace accessToken={session.accessToken} />
}
