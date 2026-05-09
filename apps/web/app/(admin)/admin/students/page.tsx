import { cookies } from "next/headers"

import { AdminStudentManagementWorkspace } from "../../../../src/admin-workflows-client/student-management"
import { readWebPortalSession } from "../../../../src/web-portal"

export default async function AdminStudentsPage() {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)

  return <AdminStudentManagementWorkspace accessToken={session?.accessToken ?? null} />
}
