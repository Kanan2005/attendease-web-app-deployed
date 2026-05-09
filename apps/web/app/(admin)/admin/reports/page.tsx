import { cookies } from "next/headers"

import { AdminReportsWorkspace } from "../../../../src/admin-workflows-client/admin-reports"
import { readWebPortalSession } from "../../../../src/web-portal"

export default async function AdminReportsPage() {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)

  return <AdminReportsWorkspace accessToken={session?.accessToken ?? null} />
}
