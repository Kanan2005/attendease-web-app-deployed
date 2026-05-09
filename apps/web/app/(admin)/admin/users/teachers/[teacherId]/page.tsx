import { cookies } from "next/headers"

import { AdminUsersTeacherProfileWorkspace } from "../../../../../../src/admin-workflows-client/admin-users-teacher-profile"
import { readWebPortalSession } from "../../../../../../src/web-portal"

export default async function AdminUsersTeacherProfilePage(props: {
  params: Promise<{ teacherId: string }>
}) {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)
  const { teacherId } = await props.params

  return (
    <AdminUsersTeacherProfileWorkspace
      accessToken={session?.accessToken ?? null}
      teacherId={teacherId}
    />
  )
}
