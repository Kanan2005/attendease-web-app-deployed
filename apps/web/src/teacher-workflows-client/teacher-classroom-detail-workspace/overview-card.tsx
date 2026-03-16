"use client"

import type { ClassroomSummary } from "@attendease/contracts"

import {
  buildTeacherWebClassroomScopeSummary,
  formatTeacherWebAttendanceModeLabel,
} from "../../teacher-classroom-management"
import { WebSectionCard } from "../../web-shell"

import { workflowStyles } from "../shared"

export function TeacherClassroomOverviewCard(props: {
  classroom: ClassroomSummary
  joinCode: string | null
}) {
  const courseTitle = props.classroom.classroomTitle ?? props.classroom.displayTitle
  const courseCode = props.classroom.courseCode ?? props.classroom.code
  const scopeSummary = buildTeacherWebClassroomScopeSummary(props.classroom)

  return (
    <WebSectionCard
      title={`${courseTitle} (${courseCode})`}
      description="Keep course details, classroom status, join code, QR launch, and the next classroom tools together."
    >
      <div style={workflowStyles.summaryGrid}>
        <div style={workflowStyles.summaryMetric}>
          <div style={{ color: "#475569", fontSize: 13 }}>Teaching scope</div>
          <strong style={{ display: "block", marginTop: 6 }}>{scopeSummary}</strong>
        </div>
        <div style={workflowStyles.summaryMetric}>
          <div style={{ color: "#475569", fontSize: 13 }}>Join code</div>
          <strong style={{ display: "block", marginTop: 6 }}>
            {props.joinCode ?? "Not loaded yet"}
          </strong>
        </div>
        <div style={workflowStyles.summaryMetric}>
          <div style={{ color: "#475569", fontSize: 13 }}>Attendance mode</div>
          <strong style={{ display: "block", marginTop: 6 }}>
            {formatTeacherWebAttendanceModeLabel(props.classroom.defaultAttendanceMode)}
          </strong>
        </div>
      </div>
    </WebSectionCard>
  )
}
