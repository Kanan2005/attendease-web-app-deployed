import { cookies } from "next/headers"

import { AdminImportMonitoringWorkspace } from "../../../../src/admin-workflows-client"
import { readWebPortalSession } from "../../../../src/web-portal"

export default async function AdminImportsPage() {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)

  return <AdminImportMonitoringWorkspace accessToken={session?.accessToken ?? null} />
}
