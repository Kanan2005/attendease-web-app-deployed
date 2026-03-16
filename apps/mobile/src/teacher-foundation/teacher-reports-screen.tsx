import { useEffect, useState } from "react"

import { mapTeacherApiErrorToMessage } from "../teacher-models"
import { useTeacherSession } from "../teacher-session"
import { buildTeacherReportsStatus } from "../teacher-view-state"
import { useTeacherFilteredReportsData } from "./queries"
import { TeacherReportsScreenContent } from "./teacher-reports-screen-content"

export function TeacherReportsScreen() {
  const { session } = useTeacherSession()
  const [selectedClassroomId, setSelectedClassroomId] = useState("")
  const [selectedSubjectId, setSelectedSubjectId] = useState("")
  const reports = useTeacherFilteredReportsData({
    ...(selectedClassroomId ? { classroomId: selectedClassroomId } : {}),
    ...(selectedSubjectId ? { subjectId: selectedSubjectId } : {}),
  })
  const reportsStatus = buildTeacherReportsStatus({
    hasSession: Boolean(session),
    isLoading:
      reports.classroomsQuery.isLoading ||
      reports.daywiseQuery.isLoading ||
      reports.subjectwiseQuery.isLoading ||
      reports.studentPercentagesQuery.isLoading ||
      reports.subjectOptionsQuery.isLoading,
    errorMessage:
      reports.classroomsQuery.error ||
      reports.daywiseQuery.error ||
      reports.subjectwiseQuery.error ||
      reports.studentPercentagesQuery.error ||
      reports.subjectOptionsQuery.error
        ? mapTeacherApiErrorToMessage(
            reports.classroomsQuery.error ??
              reports.daywiseQuery.error ??
              reports.subjectwiseQuery.error ??
              reports.studentPercentagesQuery.error ??
              reports.subjectOptionsQuery.error,
          )
        : null,
    hasAnyData: reports.model.hasAnyData,
    hasClassroomFilter: Boolean(selectedClassroomId),
    hasSubjectFilter: Boolean(selectedSubjectId),
    followUpCount: reports.model.studentRows.filter(
      (row) =>
        row.followUpLabel === "Needs follow-up" || row.followUpLabel === "Immediate follow-up",
    ).length,
  })

  useEffect(() => {
    if (
      selectedClassroomId &&
      !reports.filterOptions.classroomOptions.some((option) => option.value === selectedClassroomId)
    ) {
      setSelectedClassroomId("")
    }
  }, [reports.filterOptions.classroomOptions, selectedClassroomId])

  useEffect(() => {
    if (
      selectedSubjectId &&
      !reports.filterOptions.subjectOptions.some((option) => option.value === selectedSubjectId)
    ) {
      setSelectedSubjectId("")
    }
  }, [reports.filterOptions.subjectOptions, selectedSubjectId])

  return (
    <TeacherReportsScreenContent
      session={session}
      reports={reports}
      selectedClassroomId={selectedClassroomId}
      selectedSubjectId={selectedSubjectId}
      setSelectedClassroomId={setSelectedClassroomId}
      setSelectedSubjectId={setSelectedSubjectId}
      reportsStatus={reportsStatus}
    />
  )
}
