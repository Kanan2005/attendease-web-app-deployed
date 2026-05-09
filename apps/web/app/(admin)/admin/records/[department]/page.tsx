import { cookies } from "next/headers"

import { AdminRecordsTeachersWorkspace } from "../../../../../src/admin-workflows-client/admin-records-teachers"
import { readWebPortalSession } from "../../../../../src/web-portal"

export default async function AdminRecordsDepartmentPage(props: {
  params: Promise<{ department: string }>
}) {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)
  const { department } = await props.params

  return (
    <AdminRecordsTeachersWorkspace
      accessToken={session?.accessToken ?? null}
      department={decodeURIComponent(department)}
    />
  )
}
