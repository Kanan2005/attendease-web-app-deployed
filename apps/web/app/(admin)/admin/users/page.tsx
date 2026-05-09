import { cookies } from "next/headers"
import { Suspense } from "react"

import { AdminUsersTabsWorkspace } from "../../../../src/admin-workflows-client/admin-users-tabs"
import { readWebPortalSession } from "../../../../src/web-portal"

export default async function AdminUsersPage() {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)

  return (
    <Suspense fallback={null}>
      <AdminUsersTabsWorkspace accessToken={session?.accessToken ?? null} />
    </Suspense>
  )
}
