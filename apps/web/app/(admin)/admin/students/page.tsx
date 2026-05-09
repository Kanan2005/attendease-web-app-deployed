import { redirect } from "next/navigation"

export default function AdminStudentsPage() {
  redirect("/admin/users?tab=students")
}
