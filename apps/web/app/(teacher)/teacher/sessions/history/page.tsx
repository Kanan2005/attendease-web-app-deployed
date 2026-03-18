import { TeacherSessionHistoryWorkspace } from "../../../../../src/teacher-workflows-client"
import { getWebPortalSession } from "../../../../../src/web-session"

export default async function TeacherSessionHistoryPage() {
  const session = await getWebPortalSession()

  return (
    <TeacherSessionHistoryWorkspace accessToken={session?.accessToken ?? null} />
  )
}
