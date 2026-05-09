"use client"

import { webTheme } from "@attendease/ui-web"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"

import { WebSectionCard } from "../web-shell"
import { adminWorkflowRoutes, webWorkflowQueryKeys } from "../web-workflows"
import { ArchivedPill, PercentBadge } from "./admin-records-shared"
import { Banner, StateCard, bootstrap, styles } from "./shared"

export function AdminUsersTeacherProfileWorkspace(props: {
  accessToken: string | null
  teacherId: string
}) {
  const profileQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminUsersTeacherProfile(props.teacherId),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.getAdminUsersTeacherProfile(props.accessToken ?? "", props.teacherId),
    staleTime: 30_000,
  })

  if (profileQuery.isPending) {
    return <StateCard message="Loading teacher profile…" />
  }
  if (profileQuery.isError) {
    return <Banner tone="danger" message="Failed to load teacher profile." />
  }

  const profile = profileQuery.data

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Link
        href={adminWorkflowRoutes.usersTeachers}
        style={{ fontSize: 13, color: webTheme.colors.textMuted, textDecoration: "none" }}
      >
        ← Back to all teachers
      </Link>

      <WebSectionCard
        title={profile.displayName}
        description={`${profile.email} · ${profile.employeeCode ?? "no employee code"}`}
      >
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          <Stat label="Account status" value={profile.accountStatus} />
          <Stat label="Department" value={profile.department ?? "—"} />
          <Stat label="Designation" value={profile.designation ?? "—"} />
          <Stat label="Courses" value={profile.courseCount.toString()} />
          <Stat
            label="Active / Archived"
            value={`${profile.activeCourseCount} / ${profile.archivedCourseCount}`}
          />
          <Stat label="Students" value={profile.studentCount.toString()} />
          <Stat
            label="Avg attendance"
            valueNode={<PercentBadge value={profile.averageAttendancePercent} />}
          />
        </div>
      </WebSectionCard>

      <WebSectionCard
        title="Courses"
        description="Course offerings owned by this teacher across active and archived terms."
      >
        {profile.courses.length === 0 ? (
          <StateCard message="This teacher has no course offerings yet." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Course</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Students</th>
                  <th style={styles.th}>Sessions</th>
                  <th style={styles.th}>Avg attendance</th>
                  <th style={styles.th}>Last session</th>
                </tr>
              </thead>
              <tbody>
                {profile.courses.map((course) => (
                  <tr
                    key={course.courseOfferingId}
                    style={{ opacity: course.isArchived ? 0.6 : 1 }}
                  >
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600 }}>{course.code}</div>
                      <div style={{ fontSize: 12, color: webTheme.colors.textMuted }}>
                        {course.displayTitle}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {course.isArchived ? (
                        <ArchivedPill />
                      ) : (
                        <span style={{ color: webTheme.colors.success, fontSize: 13 }}>
                          {course.status}
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>{course.studentCount}</td>
                    <td style={styles.td}>{course.sessionsConductedCount}</td>
                    <td style={styles.td}>
                      <PercentBadge value={course.averageAttendancePercent} />
                    </td>
                    <td style={styles.td}>
                      {course.lastSessionAt ? new Date(course.lastSessionAt).toLocaleString() : "—"}
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

function Stat(props: {
  label: string
  value?: string
  valueNode?: React.ReactNode
}) {
  return (
    <div style={{ ...styles.rowCard, display: "grid", gap: 4 }}>
      <span style={{ fontSize: 11, color: webTheme.colors.textMuted }}>{props.label}</span>
      <strong style={{ fontSize: 16 }}>{props.valueNode ?? props.value}</strong>
    </div>
  )
}
