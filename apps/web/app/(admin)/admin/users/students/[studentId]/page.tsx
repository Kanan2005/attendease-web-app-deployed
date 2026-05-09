import { cookies } from "next/headers"

import { AdminUsersStudentProfileWorkspace } from "../../../../../../src/admin-workflows-client/admin-users-student-profile"
import { readWebPortalSession } from "../../../../../../src/web-portal"

export default async function AdminUsersStudentProfilePage(props: {
  params: Promise<{ studentId: string }>
}) {
  const cookieStore = await cookies()
  const session = readWebPortalSession(cookieStore)
  const { studentId } = await props.params

  return (
    <AdminUsersStudentProfileWorkspace
      accessToken={session?.accessToken ?? null}
      studentId={studentId}
    />
  )
}
