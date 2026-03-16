import { TeacherClassroomDetailWorkspace } from "../../../../../../src/teacher-workflows-client"
import { buildTeacherClassroomDetailPageModel } from "../../../../../../src/web-portal"
import { getWebPortalSession } from "../../../../../../src/web-session"
import { WebPortalPage, WebSectionCard } from "../../../../../../src/web-shell"

export default async function TeacherClassroomLecturesPage(props: {
  params: Promise<{ classroomId: string }>
}) {
  const params = await props.params
  const session = await getWebPortalSession()

  return (
    <WebPortalPage model={buildTeacherClassroomDetailPageModel(params.classroomId)}>
      <WebSectionCard
        title="Lecture Visibility"
        description="The classroom overview already loads linked lectures, so this route keeps a stable lecture page path without duplicating transport logic."
      >
        <TeacherClassroomDetailWorkspace
          accessToken={session?.accessToken ?? null}
          classroomId={params.classroomId}
        />
      </WebSectionCard>
    </WebPortalPage>
  )
}
