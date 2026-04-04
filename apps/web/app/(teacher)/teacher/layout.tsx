import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"

import {
  evaluateWebPortalAccess,
  readWebPortalSession,
  teacherPortalNavigation,
} from "../../../src/web-portal"
import { WebPortalLayout } from "../../../src/web-shell"

export const metadata: Metadata = { title: "Teacher Portal" }

export default async function TeacherPortalLayout(props: { children: ReactNode }) {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)
  const access = evaluateWebPortalAccess(session, "teacher")

  if (!access.allowed) {
    redirect(access.loginHref)
  }

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
