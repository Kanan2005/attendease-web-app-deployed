import { TeacherSessionStartWorkspace } from "../../../../../src/teacher-workflows-client"
import { getWebPortalSession } from "../../../../../src/web-session"

export default async function TeacherSessionStartPage(props: {
  searchParams: Promise<{ classroomId?: string | string[]; lectureId?: string | string[] }>
}) {
  const session = await getWebPortalSession()
  const searchParams = await props.searchParams
  const classroomId = Array.isArray(searchParams.classroomId)
    ? (searchParams.classroomId[0] ?? null)
    : (searchParams.classroomId ?? null)
  const lectureId = Array.isArray(searchParams.lectureId)
    ? (searchParams.lectureId[0] ?? null)
    : (searchParams.lectureId ?? null)

  return (
    <TeacherSessionStartWorkspace
      accessToken={session?.accessToken ?? null}
      initialClassroomId={classroomId ?? null}
      initialLectureId={lectureId ?? null}
    />
  )
}
