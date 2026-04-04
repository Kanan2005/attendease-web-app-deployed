import { TeacherLectureSessionDetailWorkspace } from "../../../../../../../src/teacher-workflows-client"
import { requireWebPortalSession } from "../../../../../../../src/web-session"

export default async function TeacherLectureSessionDetailPage(props: {
  params: Promise<{ classroomId: string; lectureId: string }>
}) {
  const params = await props.params
  const session = await requireWebPortalSession("/teacher/classrooms")

  return (
    <TeacherLectureSessionDetailWorkspace
      accessToken={session.accessToken}
      classroomId={params.classroomId}
      lectureId={params.lectureId}
    />
  )
}
