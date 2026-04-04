import { TeacherRosterWorkspace } from "../../../../../../src/teacher-workflows-client"
import { requireWebPortalSession } from "../../../../../../src/web-session"

export default async function TeacherClassroomRosterPage(props: {
  params: Promise<{ classroomId: string }>
}) {
  const params = await props.params
  const session = await requireWebPortalSession("/teacher/classrooms")

  return (
    <TeacherRosterWorkspace
      accessToken={session.accessToken}
      classroomId={params.classroomId}
    />
  )
}
