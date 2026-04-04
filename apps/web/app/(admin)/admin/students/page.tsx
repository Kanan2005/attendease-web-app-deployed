import { cookies } from "next/headers"

import { readWebPortalSession } from "../../../../src/web-portal"
import { AdminStudentManagementWorkspace } from "../../../../src/admin-workflows-client/student-management"

export default async function AdminStudentsPage() {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)

  return <AdminStudentManagementWorkspace accessToken={session?.accessToken ?? null} />
}
