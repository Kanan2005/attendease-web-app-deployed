import { TeacherEmailAutomationWorkspace } from "../../../../src/teacher-analytics-automation-client"
import { buildTeacherEmailAutomationPageModel } from "../../../../src/web-portal"
import { getWebPortalSession } from "../../../../src/web-session"
import { WebPortalPage, WebSectionCard } from "../../../../src/web-shell"

export default async function TeacherEmailAutomationPage() {
  const session = await getWebPortalSession()

  return (
    <WebPortalPage model={buildTeacherEmailAutomationPageModel()}>
      <WebSectionCard
        title="Email follow-up workspace"
        description="Create reminder rules, preview messages, and review delivery activity in one place."
      >
        <TeacherEmailAutomationWorkspace accessToken={session?.accessToken ?? null} />
      </WebSectionCard>
    </WebPortalPage>
  )
}
