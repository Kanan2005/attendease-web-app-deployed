import { TeacherClassroomDetailWorkspace } from "../../../../../../src/teacher-workflows-client"
import { getWebPortalSession } from "../../../../../../src/web-session"

export default async function TeacherClassroomLecturesPage(props: {
  params: Promise<{ classroomId: string }>
}) {
  const params = await props.params
  const session = await getWebPortalSession()

  return (
    <TeacherClassroomDetailWorkspace
      accessToken={session?.accessToken ?? null}
      classroomId={params.classroomId}
    />
  )
}
