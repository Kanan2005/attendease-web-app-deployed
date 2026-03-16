import { TeacherClassroomListWorkspace } from "../../../../src/teacher-workflows-client"
import { buildTeacherClassroomPageModel } from "../../../../src/web-portal"
import { getWebPortalSession } from "../../../../src/web-session"
import { WebPortalPage, WebSectionCard } from "../../../../src/web-shell"

export default async function TeacherClassroomsPage() {
  const session = await getWebPortalSession()

  return (
    <WebPortalPage model={buildTeacherClassroomPageModel()}>
      <WebSectionCard
        title="Classroom workspace"
        description="Open a classroom to manage course details, roster, schedule, announcements, and QR attendance from one place."
      >
        <TeacherClassroomListWorkspace accessToken={session?.accessToken ?? null} />
      </WebSectionCard>
    </WebPortalPage>
  )
}
