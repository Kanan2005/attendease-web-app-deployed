import { TeacherImportMonitoringWorkspace } from "../../../../src/admin-workflows-client"
import { buildTeacherImportsPageModel } from "../../../../src/web-portal"
import { requireWebPortalSession } from "../../../../src/web-session"
import { WebPortalPage, WebSectionCard } from "../../../../src/web-shell"

export default async function TeacherImportsPage() {
  const session = await requireWebPortalSession("/teacher/imports")

  return (
    <WebPortalPage model={buildTeacherImportsPageModel()}>
      <WebSectionCard
        title="Teacher Import Status"
        description="This route aggregates roster import status across the teacher classroom scope."
      >
        <TeacherImportMonitoringWorkspace accessToken={session.accessToken} />
      </WebSectionCard>
    </WebPortalPage>
  )
}
