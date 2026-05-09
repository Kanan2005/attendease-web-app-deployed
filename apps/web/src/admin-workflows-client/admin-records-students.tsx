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
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        <SidePanelStat
          label="Students"
          value={(studentsQuery.data?.studentCount ?? 0).toString()}
        />
        <SidePanelStatPercent
          label="Avg attendance"
          value={studentsQuery.data?.averageAttendancePercent ?? null}
        />
        <SidePanelStat
          label={`Below ${studentsQuery.data?.lowAttendanceThresholdPercent ?? 75}%`}
          value={(studentsQuery.data?.lowAttendanceCount ?? 0).toString()}
          tone="danger"
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
  tone?: "default" | "danger"
}) {
  const color = props.tone === "danger" ? webTheme.colors.danger : webTheme.colors.text
  return (
    <div style={{ ...styles.rowCard, display: "grid", gap: 4 }}>
      <span style={{ fontSize: 11, color: webTheme.colors.textMuted }}>{props.label}</span>
      <strong style={{ fontSize: 22, color }}>{props.value}</strong>
    </div>
  )
}

function SidePanelStatPercent(props: { label: string; value: number | null }) {
  return (
    <div style={{ ...styles.rowCard, display: "grid", gap: 4 }}>
      <span style={{ fontSize: 11, color: webTheme.colors.textMuted }}>{props.label}</span>
      <strong style={{ fontSize: 22 }}>
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
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: isLow ? webTheme.colors.dangerSoft : webTheme.colors.surfaceMuted,
        color: isLow ? webTheme.colors.danger : webTheme.colors.textMuted,
      }}
    >
      {props.status}
    </span>
  )
}
