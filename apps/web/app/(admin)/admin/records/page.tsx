import { cookies } from "next/headers"

import { AdminRecordsDepartmentsWorkspace } from "../../../../src/admin-workflows-client/admin-records-departments"
import { readWebPortalSession } from "../../../../src/web-portal"

export default async function AdminRecordsPage() {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)

  return <AdminRecordsDepartmentsWorkspace accessToken={session?.accessToken ?? null} />
}
