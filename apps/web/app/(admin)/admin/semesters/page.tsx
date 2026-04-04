import { cookies } from "next/headers"

import { AdminSemesterManagementWorkspace } from "../../../../src/admin-workflows-client"
import { readWebPortalSession } from "../../../../src/web-portal"

export default async function AdminSemestersPage() {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)

  return <AdminSemesterManagementWorkspace accessToken={session?.accessToken ?? null} />
}
