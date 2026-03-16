import { TeacherSemesterVisibilityWorkspace } from "../../../../src/teacher-workflows-client"
import { buildTeacherSemesterPageModel } from "../../../../src/web-portal"
import { getWebPortalSession } from "../../../../src/web-session"
import { WebPortalPage, WebSectionCard } from "../../../../src/web-shell"

export default async function TeacherSemestersPage() {
  const session = await getWebPortalSession()

  return (
    <WebPortalPage model={buildTeacherSemesterPageModel()}>
      <WebSectionCard
        title="Teacher Semester Visibility"
        description="Teachers consume semester-linked classroom state here while admin pages own lifecycle mutation."
      >
        <TeacherSemesterVisibilityWorkspace accessToken={session?.accessToken ?? null} />
      </WebSectionCard>
    </WebPortalPage>
  )
}
