import { useLocalSearchParams } from "expo-router"

import { StudentSubjectReportScreen } from "../../../../src/student-foundation"

export default function StudentSubjectReportRoute() {
  const params = useLocalSearchParams<{
    subjectId?: string | string[]
  }>()
  const subjectId =
    typeof params.subjectId === "string" ? params.subjectId : (params.subjectId?.[0] ?? "")

  return <StudentSubjectReportScreen subjectId={subjectId} />
}
