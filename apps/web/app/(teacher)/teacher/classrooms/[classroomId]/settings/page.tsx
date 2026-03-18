import { TeacherClassroomDetailWorkspace } from "../../../../../../src/teacher-workflows-client"
import { getWebPortalSession } from "../../../../../../src/web-session"

export default async function ClassroomSettingsPage(props: {
  params: Promise<{ classroomId: string }>
}) {
  const [session, params] = await Promise.all([getWebPortalSession(), props.params])

  return (
    <TeacherClassroomDetailWorkspace
      accessToken={session?.accessToken ?? null}
      classroomId={params.classroomId}
    />
  )
}
