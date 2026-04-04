import { TeacherClassroomDetailWorkspace } from "../../../../../../src/teacher-workflows-client"
import { requireWebPortalSession } from "../../../../../../src/web-session"

export default async function ClassroomSettingsPage(props: {
  params: Promise<{ classroomId: string }>
}) {
  const [session, params] = await Promise.all([
    requireWebPortalSession("/teacher/classrooms"),
    props.params,
  ])

  return (
    <TeacherClassroomDetailWorkspace
      accessToken={session.accessToken}
      classroomId={params.classroomId}
    />
  )
}
