import { TeacherReportsWorkspace } from "../../../../../../src/teacher-workflows-client"
import { requireWebPortalSession } from "../../../../../../src/web-session"

export default async function TeacherClassroomReportsPage(props: {
  params: Promise<{ classroomId: string }>
}) {
  const params = await props.params
  const session = await requireWebPortalSession("/teacher/classrooms")

  return (
    <TeacherReportsWorkspace
      accessToken={session.accessToken}
      initialClassroomId={params.classroomId}
    />
  )
}
