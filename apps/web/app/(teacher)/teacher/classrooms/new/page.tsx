import { TeacherClassroomCreateWorkspace } from "../../../../../src/teacher-workflows-client"
import { buildTeacherClassroomPageModel } from "../../../../../src/web-portal"
import { getWebPortalSession } from "../../../../../src/web-session"
import { WebPortalPage, WebSectionCard } from "../../../../../src/web-shell"

export default async function TeacherClassroomCreatePage() {
  const session = await getWebPortalSession()

  return (
    <WebPortalPage model={buildTeacherClassroomPageModel()}>
      <WebSectionCard
        title="Create classroom"
        description="Add a classroom, set course details, and choose attendance defaults before students join."
      >
        <TeacherClassroomCreateWorkspace accessToken={session?.accessToken ?? null} />
      </WebSectionCard>
    </WebPortalPage>
  )
}
