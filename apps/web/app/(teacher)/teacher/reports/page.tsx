import { TeacherReportsWorkspace } from "../../../../src/teacher-workflows-client"
import { buildTeacherReportsPageModel } from "../../../../src/web-portal"
import { requireWebPortalSession } from "../../../../src/web-session"
import { WebPortalPage, WebSectionCard } from "../../../../src/web-shell"

export default async function TeacherReportsPage() {
  const session = await requireWebPortalSession("/teacher/reports")

  return (
    <WebPortalPage model={buildTeacherReportsPageModel()}>
      <WebSectionCard
        title="Report workspace"
        description="Review course rollups, student follow-up, and day-wise trends from one shared filter scope."
      >
        <TeacherReportsWorkspace accessToken={session.accessToken} />
      </WebSectionCard>
    </WebPortalPage>
  )
}
