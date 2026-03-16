import { TeacherSessionStartWorkspace } from "../../../../../src/teacher-workflows-client"
import { buildTeacherSessionStartPageModel } from "../../../../../src/web-portal"
import { getWebPortalSession } from "../../../../../src/web-session"
import { WebPortalPage } from "../../../../../src/web-shell"

export default async function TeacherSessionStartPage(props: {
  searchParams: Promise<{ classroomId?: string | string[] }>
}) {
  const session = await getWebPortalSession()
  const searchParams = await props.searchParams
  const classroomId = Array.isArray(searchParams.classroomId)
    ? (searchParams.classroomId[0] ?? null)
    : (searchParams.classroomId ?? null)

  return (
    <WebPortalPage model={buildTeacherSessionStartPageModel()}>
      <TeacherSessionStartWorkspace
        accessToken={session?.accessToken ?? null}
        initialClassroomId={classroomId}
      />
    </WebPortalPage>
  )
}
