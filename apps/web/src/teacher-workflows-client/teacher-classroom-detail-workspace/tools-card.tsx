"use client"

import { webTheme } from "@attendease/ui-web"
import Link from "next/link"

import type { ClassroomSummary, LectureSummary } from "@attendease/contracts"
import { WebSectionCard } from "../../web-shell"
import {
  buildTeacherClassroomLinks,
  formatPortalDateTime,
  teacherWorkflowRoutes,
} from "../../web-workflows"

import { WorkflowBanner, WorkflowStateCard, workflowStyles } from "../shared"

export function TeacherClassroomNextToolsCard(props: { classroomId: string }) {
  return (
    <WebSectionCard
      title="Next classroom tools"
      description="Keep the main classroom routes close to course management instead of sending teachers back through the main dashboard."
    >
      <div style={workflowStyles.cardGrid}>
        {buildTeacherClassroomLinks(props.classroomId).map((link) => (
          <Link key={link.href} href={link.href} style={workflowStyles.linkCard}>
            <strong style={{ display: "block", marginBottom: 6 }}>{link.label}</strong>
            <span style={{ color: webTheme.colors.textSubtle, lineHeight: 1.5 }}>
              {link.label === "Course"
                ? "Review course settings, join code, and QR launch."
                : link.label === "Roster"
                  ? "Manage students and membership state."
                  : link.label === "Schedule"
                    ? "Plan recurring slots and class exceptions."
                    : link.label === "Updates"
                      ? "Post announcements and review classroom activity."
                      : link.label === "Class Sessions"
                        ? "Review class-session rows linked to attendance."
                        : "Review classroom import status."}
            </span>
          </Link>
        ))}
      </div>
    </WebSectionCard>
  )
}

export function TeacherClassroomQrLaunchCard(props: {
  classroomId: string
  classroom: ClassroomSummary
}) {
  return (
    <WebSectionCard
      title="QR + GPS attendance"
      description="Open the short QR setup flow with this classroom preselected, then move straight into the live teacher controls."
    >
      <div style={workflowStyles.grid}>
        <div style={workflowStyles.summaryGrid}>
          <div style={workflowStyles.summaryMetric}>
            <div style={{ color: webTheme.colors.textMuted, fontSize: 13 }}>Default duration</div>
            <strong style={{ display: "block", marginTop: 6 }}>
              {props.classroom.defaultSessionDurationMinutes} minutes
            </strong>
          </div>
          <div style={workflowStyles.summaryMetric}>
            <div style={{ color: webTheme.colors.textMuted, fontSize: 13 }}>Allowed distance</div>
            <strong style={{ display: "block", marginTop: 6 }}>
              {props.classroom.defaultGpsRadiusMeters} meters
            </strong>
          </div>
          <div style={workflowStyles.summaryMetric}>
            <div style={{ color: webTheme.colors.textMuted, fontSize: 13 }}>
              Location requirement
            </div>
            <strong style={{ display: "block", marginTop: 6 }}>Browser location required</strong>
          </div>
        </div>

        <div style={workflowStyles.buttonRow}>
          <Link
            href={`${teacherWorkflowRoutes.sessionStart}?classroomId=${props.classroomId}`}
            style={workflowStyles.primaryButton}
          >
            Open QR setup
          </Link>
          <Link href={teacherWorkflowRoutes.sessionHistory} style={workflowStyles.secondaryButton}>
            Open session history
          </Link>
        </div>

        {props.classroom.defaultAttendanceMode !== "QR_GPS" ? (
          <WorkflowBanner
            tone="info"
            message="This classroom is not set to QR + GPS. Update the attendance mode first if this class should launch from teacher web."
          />
        ) : null}
      </div>
    </WebSectionCard>
  )
}

export function TeacherClassroomRecentSessionsCard(props: {
  lectures: LectureSummary[] | undefined
  loading: boolean
  error: unknown
}) {
  return (
    <WebSectionCard
      title="Recent class sessions"
      description="Recent class sessions stay nearby so QR launch does not feel disconnected from the classroom schedule."
    >
      {props.loading ? (
        <WorkflowStateCard message="Loading class sessions..." />
      ) : props.error ? (
        <WorkflowBanner
          tone="danger"
          message={
            props.error instanceof Error ? props.error.message : "Failed to load class sessions."
          }
        />
      ) : props.lectures && props.lectures.length > 0 ? (
        <div style={workflowStyles.grid}>
          {props.lectures.slice(0, 5).map((lecture) => (
            <div key={lecture.id} style={workflowStyles.rowCard}>
              <strong>{lecture.title ?? "Untitled class session"}</strong>
              <div style={{ color: webTheme.colors.textSubtle, marginTop: 4 }}>
                {formatPortalDateTime(lecture.lectureDate)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <WorkflowStateCard message="No class sessions exist yet for this classroom." />
      )}
    </WebSectionCard>
  )
}
