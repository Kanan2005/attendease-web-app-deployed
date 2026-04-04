import { TeacherImportStatusWorkspace } from "../../../../../../src/teacher-workflows-client"
import { buildTeacherClassroomDetailPageModel } from "../../../../../../src/web-portal"
import { requireWebPortalSession } from "../../../../../../src/web-session"
import { WebPortalPage, WebSectionCard } from "../../../../../../src/web-shell"

export default async function TeacherClassroomImportsPage(props: {
  params: Promise<{ classroomId: string }>
}) {
  const params = await props.params
  const session = await requireWebPortalSession("/teacher/classrooms")

  return (
    <WebPortalPage model={buildTeacherClassroomDetailPageModel(params.classroomId)}>
      <WebSectionCard
        title="Classroom Imports"
        description="Create, inspect, and apply roster import jobs from the classroom-level import status page."
      >
        <TeacherImportStatusWorkspace
          accessToken={session.accessToken}
          classroomId={params.classroomId}
        />
      </WebSectionCard>
    </WebPortalPage>
  )
}
