import { redirect } from "next/navigation"

export default async function TeacherClassroomDetailPage(props: {
  params: Promise<{ classroomId: string }>
}) {
  const params = await props.params
  redirect(`/teacher/classrooms/${params.classroomId}/lectures`)
}
