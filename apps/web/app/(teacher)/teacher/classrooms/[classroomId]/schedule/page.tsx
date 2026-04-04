import { TeacherScheduleWorkspace } from "../../../../../../src/teacher-workflows-client"
import { requireWebPortalSession } from "../../../../../../src/web-session"

export default async function TeacherClassroomSchedulePage(props: {
  params: Promise<{ classroomId: string }>
}) {
  const params = await props.params
  const session = await requireWebPortalSession("/teacher/classrooms")

  return (
    <TeacherScheduleWorkspace
      accessToken={session.accessToken}
      classroomId={params.classroomId}
    />
  )
}
