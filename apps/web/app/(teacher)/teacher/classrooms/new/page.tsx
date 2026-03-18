import type { Metadata } from "next"

import { TeacherClassroomCreateWorkspace } from "../../../../../src/teacher-workflows-client"
import { getWebPortalSession } from "../../../../../src/web-session"

export const metadata: Metadata = { title: "New Classroom" }

export default async function TeacherClassroomCreatePage() {
  const session = await getWebPortalSession()

  return <TeacherClassroomCreateWorkspace accessToken={session?.accessToken ?? null} />
}
