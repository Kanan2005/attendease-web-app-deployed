import { TeacherReportsWorkspace } from "../../../../../../src/teacher-workflows-client"
import { getWebPortalSession } from "../../../../../../src/web-session"

export default async function TeacherClassroomReportsPage(props: {
  params: Promise<{ classroomId: string }>
}) {
  const params = await props.params
  const session = await getWebPortalSession()

  return (
    <TeacherReportsWorkspace
      accessToken={session?.accessToken ?? null}
      initialClassroomId={params.classroomId}
    />
  )
}
