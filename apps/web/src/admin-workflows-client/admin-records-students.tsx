"use client"

import { webTheme } from "@attendease/ui-web"
import { useQuery } from "@tanstack/react-query"

import { WebSectionCard } from "../web-shell"
import { adminWorkflowRoutes, webWorkflowQueryKeys } from "../web-workflows"
import {
  ArchivedPill,
  PercentBadge,
  RecordsBreadcrumb,
  RecordsCourseSearch,
} from "./admin-records-shared"
import { Banner, StateCard, bootstrap, styles } from "./shared"

export function AdminRecordsStudentsWorkspace(props: {
  accessToken: string | null
  department: string
  teacherId: string
  courseOfferingId: string
}) {
  const studentsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminRecordsStudentsInCourse(props.courseOfferingId),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listAdminRecordsStudentsInCourse(
        props.accessToken ?? "",
        props.courseOfferingId,
      ),
    staleTime: 30_000,
  })

  const courseTitle = studentsQuery.data?.courseTitle ?? "Course"
  const courseCode = studentsQuery.data?.courseCode ?? props.courseOfferingId
  const isArchived = studentsQuery.data?.isArchived ?? false

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <RecordsBreadcrumb
        steps={[
          {
            label: props.department,
            href: adminWorkflowRoutes.recordsDepartment(props.department),
          },
          {
            label: "Teacher",
            href: adminWorkflowRoutes.recordsTeacher(props.department, props.teacherId),
          },
          { label: courseCode },
        ]}
      />
      <RecordsCourseSearch accessToken={props.accessToken} />
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        }}
      >
        <SidePanelStat
          label="Active students"
          value={(studentsQuery.data?.studentCount ?? 0).toString()}
          tone="accent"
        />
        <SidePanelStat
          label="Total sessions"
          value={(studentsQuery.data?.totalSessionsConducted ?? 0).toString()}
          tone="success"
        />
        <SidePanelStat
          label="Last attendance"
          value={
            studentsQuery.data?.lastSessionAt
              ? new Date(studentsQuery.data.lastSessionAt).toLocaleDateString()
              : "—"
          }
          tone="warning"
        />
        <SidePanelStat
          label="Join code"
          value={studentsQuery.data?.joinCode ?? "—"}
        />
        <SidePanelStatPercent
          label="Avg attendance"
          value={studentsQuery.data?.averageAttendancePercent ?? null}
        />
      </div>
      <WebSectionCard
        title={`${courseCode} — ${courseTitle}`}
        description={
          isArchived
            ? "This course is archived. Attendance history is preserved but the course is no longer accepting new sessions."
            : "All active enrollments are listed below with their attendance percentage in this course."
        }
      >
        {isArchived ? (
          <div style={{ marginBottom: 12 }}>
            <ArchivedPill />
          </div>
        ) : null}
        {studentsQuery.isPending ? (
          <StateCard message="Loading students…" />
        ) : studentsQuery.isError ? (
          <Banner tone="danger" message="Failed to load students for this course." />
        ) : studentsQuery.data.students.length === 0 ? (
          <StateCard message="No active enrollments in this course yet." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Roll number</th>
                  <th style={styles.th}>Branch / Sem</th>
                  <th style={styles.th}>Sessions</th>
                  <th style={styles.th}>Attendance</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Last session</th>
                </tr>
              </thead>
              <tbody>
                {studentsQuery.data.students.map((student) => (
                  <tr key={student.studentId}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600 }}>{student.displayName}</div>
                      <div style={{ fontSize: 12, color: webTheme.colors.textMuted }}>
                        {student.email}
                      </div>
                    </td>
                    <td style={styles.td}>{student.rollNumber ?? "—"}</td>
                    <td style={styles.td}>
                      {student.branch ?? "—"}
                      {student.currentSemester ? ` · Sem ${student.currentSemester}` : ""}
                    </td>
                    <td style={styles.td}>
                      {student.presentSessions} / {student.totalSessions}
                    </td>
                    <td style={styles.td}>
                      <PercentBadge value={student.attendancePercent} />
                    </td>
                    <td style={styles.td}>
                      <StatusPill status={student.attendanceStatus} />
                      {student.attendanceDisabled ? (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 11,
                            color: webTheme.colors.warning,
                            fontWeight: 700,
                          }}
                        >
                          DISABLED
                        </span>
                      ) : null}
                    </td>
                    <td style={styles.td}>
                      {student.lastSessionAt
                        ? new Date(student.lastSessionAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </WebSectionCard>
    </div>
  )
}

function SidePanelStat(props: {
  label: string
  value: string
  tone?: "default" | "danger" | "accent" | "success" | "warning"
}) {
  const toneMap: Record<string, { color: string; accent: string }> = {
    default: { color: webTheme.colors.text, accent: webTheme.colors.border },
    danger: { color: webTheme.colors.danger, accent: webTheme.colors.dangerBorder },
    accent: { color: webTheme.colors.accent, accent: webTheme.colors.accentBorder },
    success: { color: webTheme.colors.success, accent: webTheme.colors.successBorder },
    warning: { color: webTheme.colors.warning, accent: webTheme.colors.warningBorder },
  }
  const t = toneMap[props.tone ?? "default"] ?? toneMap.default!
  return (
    <div
      style={{
        ...styles.rowCard,
        display: "grid",
        gap: 6,
        borderTop: `3px solid ${t.accent}`,
        borderRadius: 12,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: webTheme.colors.textMuted,
        }}
      >
        {props.label}
      </span>
      <strong style={{ fontSize: 24, color: t.color, letterSpacing: "-0.02em" }}>
        {props.value}
      </strong>
    </div>
  )
}

function SidePanelStatPercent(props: { label: string; value: number | null }) {
  return (
    <div
      style={{
        ...styles.rowCard,
        display: "grid",
        gap: 6,
        borderTop: `3px solid ${webTheme.colors.accentBorder}`,
        borderRadius: 12,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: webTheme.colors.textMuted,
        }}
      >
        {props.label}
      </span>
      <strong style={{ fontSize: 24, letterSpacing: "-0.02em" }}>
        <PercentBadge value={props.value} />
      </strong>
    </div>
  )
}

function StatusPill(props: { status: "LOW" | "NORMAL" }) {
  const isLow = props.status === "LOW"
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        background: isLow ? webTheme.colors.dangerSoft : webTheme.colors.successSoft,
        color: isLow ? webTheme.colors.danger : webTheme.colors.success,
      }}
    >
      {props.status}
    </span>
  )
}
