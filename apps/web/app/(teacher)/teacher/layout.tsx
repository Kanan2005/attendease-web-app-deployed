import { cookies } from "next/headers"
import type { ReactNode } from "react"

import {
  evaluateWebPortalAccess,
  readWebPortalSession,
  teacherPortalNavigation,
} from "../../../src/web-portal"
import { WebPortalLayout } from "../../../src/web-shell"

export default async function TeacherPortalLayout(props: { children: ReactNode }) {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)
  const access = evaluateWebPortalAccess(session, "teacher")

  return (
    <WebPortalLayout
      scopeLabel="Teacher"
      scopeDescription="Classrooms, QR attendance, session review, and reports in one place."
      session={session}
      navItems={teacherPortalNavigation}
      access={access}
    >
      {props.children}
    </WebPortalLayout>
  )
}
