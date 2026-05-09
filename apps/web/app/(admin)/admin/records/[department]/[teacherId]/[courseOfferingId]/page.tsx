import { cookies } from "next/headers"

import { AdminRecordsStudentsWorkspace } from "../../../../../../../src/admin-workflows-client/admin-records-students"
import { readWebPortalSession } from "../../../../../../../src/web-portal"

export default async function AdminRecordsCoursePage(props: {
  params: Promise<{ department: string; teacherId: string; courseOfferingId: string }>
}) {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)
  const { department, teacherId, courseOfferingId } = await props.params

  return (
    <AdminRecordsStudentsWorkspace
      accessToken={session?.accessToken ?? null}
      department={decodeURIComponent(department)}
      teacherId={teacherId}
      courseOfferingId={courseOfferingId}
    />
  )
}
