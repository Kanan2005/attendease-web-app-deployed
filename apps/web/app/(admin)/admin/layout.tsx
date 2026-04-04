import { cookies } from "next/headers"
import { redirect } from "next/navigation"
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

  if (!access.allowed) {
    redirect(access.loginHref)
  }

  return (
    <WebPortalLayout
      scopeLabel="Admin"
      scopeDescription="Manage students, teachers, devices, classrooms, and semesters from one place."
      session={session}
      navItems={adminPortalNavigation}
      access={access}
    >
      {props.children}
    </WebPortalLayout>
  )
}
