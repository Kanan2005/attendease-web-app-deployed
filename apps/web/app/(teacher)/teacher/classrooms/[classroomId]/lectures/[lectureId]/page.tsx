import { TeacherLectureSessionDetailWorkspace } from "../../../../../../../src/teacher-workflows-client"
import { getWebPortalSession } from "../../../../../../../src/web-session"

export default async function TeacherLectureSessionDetailPage(props: {
  params: Promise<{ classroomId: string; lectureId: string }>
}) {
  const params = await props.params
  const session = await getWebPortalSession()

  return (
    <TeacherLectureSessionDetailWorkspace
      accessToken={session?.accessToken ?? null}
      classroomId={params.classroomId}
      lectureId={params.lectureId}
    />
  )
}
