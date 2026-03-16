import { TeacherScheduleWorkspace } from "../../../../../../src/teacher-workflows-client"
import { buildTeacherClassroomDetailPageModel } from "../../../../../../src/web-portal"
import { getWebPortalSession } from "../../../../../../src/web-session"
import { WebPortalPage, WebSectionCard } from "../../../../../../src/web-shell"

export default async function TeacherClassroomSchedulePage(props: {
  params: Promise<{ classroomId: string }>
}) {
  const params = await props.params
  const session = await getWebPortalSession()

  return (
    <WebPortalPage model={buildTeacherClassroomDetailPageModel(params.classroomId)}>
      <WebSectionCard
        title="Schedule Calendar Editing"
        description="Recurring slots, date exceptions, and Save & Notify now live on the dedicated classroom schedule route."
      >
        <TeacherScheduleWorkspace
          accessToken={session?.accessToken ?? null}
          classroomId={params.classroomId}
        />
      </WebSectionCard>
    </WebPortalPage>
  )
}
