import { TeacherClassroomDetailWorkspace } from "../../../../../src/teacher-workflows-client"
import { buildTeacherClassroomDetailPageModel } from "../../../../../src/web-portal"
import { getWebPortalSession } from "../../../../../src/web-session"
import { WebPortalPage } from "../../../../../src/web-shell"

export default async function TeacherClassroomDetailPage(props: {
  params: Promise<{ classroomId: string }>
}) {
  const params = await props.params
  const session = await getWebPortalSession()

  return (
    <WebPortalPage model={buildTeacherClassroomDetailPageModel(params.classroomId)}>
      <TeacherClassroomDetailWorkspace
        accessToken={session?.accessToken ?? null}
        classroomId={params.classroomId}
      />
    </WebPortalPage>
  )
}
