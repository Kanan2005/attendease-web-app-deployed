import { cookies } from "next/headers"
import type { ReactNode } from "react"

import {
  adminPortalNavigation,
  evaluateWebPortalAccess,
  readWebPortalSession,
} from "../../../src/web-portal"
import { WebPortalLayout } from "../../../src/web-shell"

export default async function AdminPortalLayout(props: { children: ReactNode }) {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)
  const access = evaluateWebPortalAccess(session, "admin")

  return (
    <WebPortalLayout
      scopeLabel="Admin"
      scopeDescription="Student support, device recovery, imports, and academic governance with audited controls."
      session={session}
      navItems={adminPortalNavigation}
      access={access}
    >
      {props.children}
    </WebPortalLayout>
  )
}
