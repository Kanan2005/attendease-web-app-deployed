import { cookies } from "next/headers"

import { AdminRecordsCoursesWorkspace } from "../../../../../../src/admin-workflows-client/admin-records-courses"
import { readWebPortalSession } from "../../../../../../src/web-portal"

export default async function AdminRecordsTeacherPage(props: {
  params: Promise<{ department: string; teacherId: string }>
}) {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)
  const { department, teacherId } = await props.params

  return (
    <AdminRecordsCoursesWorkspace
      accessToken={session?.accessToken ?? null}
      department={decodeURIComponent(department)}
      teacherId={teacherId}
    />
  )
}
