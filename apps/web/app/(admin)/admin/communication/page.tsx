import { cookies } from "next/headers"

import { AdminCommunicationComposerWorkspace } from "../../../../src/admin-workflows-client/admin-communication-composer"
import { readWebPortalSession } from "../../../../src/web-portal"

export default async function AdminCommunicationPage() {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)

  return <AdminCommunicationComposerWorkspace accessToken={session?.accessToken ?? null} />
}
