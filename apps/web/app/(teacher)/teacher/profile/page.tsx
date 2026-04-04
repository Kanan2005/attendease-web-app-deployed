import type { Metadata } from "next"

import { TeacherProfileWorkspace } from "../../../../src/teacher-workflows-client/teacher-profile-workspace"
import { requireWebPortalSession } from "../../../../src/web-session"

export const metadata: Metadata = { title: "My Profile" }

export default async function TeacherProfilePage() {
  const session = await requireWebPortalSession("/teacher/profile")

  return <TeacherProfileWorkspace accessToken={session.accessToken} />
}
