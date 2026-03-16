import { TeacherSessionHistoryWorkspace } from "../../../../../src/teacher-workflows-client"
import { buildTeacherSessionHistoryPageModel } from "../../../../../src/web-portal"
import { getWebPortalSession } from "../../../../../src/web-session"
import { WebPortalPage } from "../../../../../src/web-shell"

export default async function TeacherSessionHistoryPage() {
  const session = await getWebPortalSession()

  return (
    <WebPortalPage model={buildTeacherSessionHistoryPageModel()}>
      <TeacherSessionHistoryWorkspace accessToken={session?.accessToken ?? null} />
    </WebPortalPage>
  )
}
