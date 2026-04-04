import { TeacherAnalyticsWorkspace } from "../../../../src/teacher-analytics-automation-client"
import { buildTeacherAnalyticsPageModel } from "../../../../src/web-portal"
import { requireWebPortalSession } from "../../../../src/web-session"
import { WebPortalPage, WebSectionCard } from "../../../../src/web-shell"

export default async function TeacherAnalyticsPage() {
  const session = await requireWebPortalSession("/teacher/analytics")

  return (
    <WebPortalPage model={buildTeacherAnalyticsPageModel()}>
      <WebSectionCard
        title="Analytics workspace"
        description="Review trends, comparisons, mode usage, and drill-downs without leaving the teacher portal."
      >
        <TeacherAnalyticsWorkspace accessToken={session.accessToken} />
      </WebSectionCard>
    </WebPortalPage>
  )
}
