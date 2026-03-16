import { TeacherStreamWorkspace } from "../../../../../../src/teacher-workflows-client"
import { getWebPortalSession } from "../../../../../../src/web-session"

export default async function TeacherClassroomStreamPage(props: {
  params: Promise<{ classroomId: string }>
}) {
  const params = await props.params
  const session = await getWebPortalSession()

  return (
    <TeacherStreamWorkspace
      accessToken={session?.accessToken ?? null}
      classroomId={params.classroomId}
    />
  )
}
