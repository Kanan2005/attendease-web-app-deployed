import { TeacherEmailAutomationWorkspace } from "../../../../src/teacher-analytics-automation-client"
import { buildTeacherEmailAutomationPageModel } from "../../../../src/web-portal"
import { requireWebPortalSession } from "../../../../src/web-session"
import { WebPortalPage, WebSectionCard } from "../../../../src/web-shell"

export default async function TeacherEmailAutomationPage() {
  const session = await requireWebPortalSession("/teacher/email-automation")

  return (
    <WebPortalPage model={buildTeacherEmailAutomationPageModel()}>
      <WebSectionCard
        title="Email follow-up workspace"
        description="Create reminder rules, preview messages, and review delivery activity in one place."
      >
        <TeacherEmailAutomationWorkspace accessToken={session.accessToken} />
      </WebSectionCard>
    </WebPortalPage>
  )
}
