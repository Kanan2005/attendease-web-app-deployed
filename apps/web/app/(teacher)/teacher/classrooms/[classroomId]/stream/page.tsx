import { TeacherStreamWorkspace } from "../../../../../../src/teacher-workflows-client"
import { buildTeacherClassroomDetailPageModel } from "../../../../../../src/web-portal"
import { getWebPortalSession } from "../../../../../../src/web-session"
import { WebPortalPage, WebSectionCard } from "../../../../../../src/web-shell"

export default async function TeacherClassroomStreamPage(props: {
  params: Promise<{ classroomId: string }>
}) {
  const params = await props.params
  const session = await getWebPortalSession()

  return (
    <WebPortalPage model={buildTeacherClassroomDetailPageModel(params.classroomId)}>
      <WebSectionCard
        title="Classroom Stream"
        description="Teacher announcement composition and classroom stream visibility are now on their own classroom route."
      >
        <TeacherStreamWorkspace
          accessToken={session?.accessToken ?? null}
          classroomId={params.classroomId}
        />
      </WebSectionCard>
    </WebPortalPage>
  )
}
