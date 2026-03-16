import { TeacherRosterWorkspace } from "../../../../../../src/teacher-workflows-client"
import { getWebPortalSession } from "../../../../../../src/web-session"

export default async function TeacherClassroomRosterPage(props: {
  params: Promise<{ classroomId: string }>
}) {
  const params = await props.params
  const session = await getWebPortalSession()

  return (
    <TeacherRosterWorkspace
      accessToken={session?.accessToken ?? null}
      classroomId={params.classroomId}
    />
  )
}
