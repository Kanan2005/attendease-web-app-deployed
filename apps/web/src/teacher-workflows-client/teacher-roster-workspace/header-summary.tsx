"use client"

import type { ClassroomDetail } from "@attendease/contracts"

import {
  buildTeacherWebClassroomScopeSummary,
  formatTeacherWebAttendanceModeLabel,
} from "../../teacher-classroom-management"
import { WebSectionCard } from "../../web-shell"

import { workflowStyles } from "../shared"

export function TeacherRosterHeaderSummary(props: {
  classroom: ClassroomDetail
  visibleCount: number
  pendingCount: number
  blockedCount: number
  loading: boolean
}) {
  const classroomTitle = props.classroom.classroomTitle ?? props.classroom.displayTitle
  const courseCode = props.classroom.courseCode ?? props.classroom.code
  const scopeSummary = buildTeacherWebClassroomScopeSummary(props.classroom)

  return (
    <WebSectionCard
      title={`${classroomTitle} (${courseCode})`}
      description="Keep student lookup, membership state, and course context together so roster work does not feel separate from the classroom."
    >
      <div style={workflowStyles.summaryGrid}>
        <div style={workflowStyles.summaryMetric}>
          <div style={{ color: "#475569", fontSize: 13 }}>Teaching scope</div>
          <strong style={{ display: "block", marginTop: 6 }}>{scopeSummary}</strong>
        </div>
        <div style={workflowStyles.summaryMetric}>
          <div style={{ color: "#475569", fontSize: 13 }}>Attendance mode</div>
          <strong style={{ display: "block", marginTop: 6 }}>
            {formatTeacherWebAttendanceModeLabel(props.classroom.defaultAttendanceMode)}
          </strong>
        </div>
        <div style={workflowStyles.summaryMetric}>
          <div style={{ color: "#475569", fontSize: 13 }}>Students in view</div>
          <strong style={{ display: "block", fontSize: 24, marginTop: 6 }}>
            {props.loading ? "..." : props.visibleCount}
          </strong>
        </div>
        <div style={workflowStyles.summaryMetric}>
          <div style={{ color: "#475569", fontSize: 13 }}>Pending / Blocked</div>
          <strong style={{ display: "block", marginTop: 6 }}>
            {props.pendingCount} pending · {props.blockedCount} blocked
          </strong>
        </div>
      </div>
    </WebSectionCard>
  )
}
