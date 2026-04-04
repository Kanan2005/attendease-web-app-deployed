import { TeacherExportsWorkspace } from "../../../../src/teacher-workflows-client"
import { buildTeacherExportsPageModel } from "../../../../src/web-portal"
import { requireWebPortalSession } from "../../../../src/web-session"
import { WebPortalPage, WebSectionCard } from "../../../../src/web-shell"

export default async function TeacherExportsPage() {
  const session = await requireWebPortalSession("/teacher/exports")

  return (
    <WebPortalPage model={buildTeacherExportsPageModel()}>
      <WebSectionCard
        title="Export workspace"
        description="Queue attendance files, watch delivery status, and download completed exports."
      >
        <TeacherExportsWorkspace accessToken={session.accessToken} />
      </WebSectionCard>
    </WebPortalPage>
  )
}
