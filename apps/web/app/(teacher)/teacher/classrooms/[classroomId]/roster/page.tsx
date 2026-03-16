import { TeacherRosterWorkspace } from "../../../../../../src/teacher-workflows-client"
import { buildTeacherClassroomRosterPageModel } from "../../../../../../src/web-portal"
import { getWebPortalSession } from "../../../../../../src/web-session"
import { WebPortalPage, WebSectionCard } from "../../../../../../src/web-shell"

export default async function TeacherClassroomRosterPage(props: {
  params: Promise<{ classroomId: string }>
}) {
  const params = await props.params
  const session = await getWebPortalSession()

  return (
    <WebPortalPage model={buildTeacherClassroomRosterPageModel(params.classroomId)}>
      <WebSectionCard
        title="Roster management"
        description="View students, add a student, update membership state, and remove a student from the current classroom."
      >
        <TeacherRosterWorkspace
          accessToken={session?.accessToken ?? null}
          classroomId={params.classroomId}
        />
      </WebSectionCard>
    </WebPortalPage>
  )
}
