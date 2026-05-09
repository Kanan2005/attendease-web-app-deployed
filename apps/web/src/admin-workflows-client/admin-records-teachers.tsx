"use client"

import { webTheme } from "@attendease/ui-web"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"

import { WebSectionCard } from "../web-shell"
import { adminWorkflowRoutes, webWorkflowQueryKeys } from "../web-workflows"
import { PercentBadge, RecordsBreadcrumb, RecordsCourseSearch } from "./admin-records-shared"
import { Banner, StateCard, bootstrap, styles } from "./shared"

export function AdminRecordsTeachersWorkspace(props: {
  accessToken: string | null
  department: string
}) {
  const teachersQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminRecordsTeachersInDepartment(props.department),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listAdminRecordsTeachersInDepartment(
        props.accessToken ?? "",
        props.department,
      ),
    staleTime: 60_000,
  })

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <RecordsBreadcrumb steps={[{ label: props.department }]} />
      <RecordsCourseSearch accessToken={props.accessToken} />
      <WebSectionCard
        title={`Teachers in ${props.department}`}
        description="Each row aggregates the teacher's courses and student attendance. Click a teacher to drill into their course offerings."
      >
        {teachersQuery.isPending ? (
          <StateCard message="Loading teachers…" />
        ) : teachersQuery.isError ? (
          <Banner tone="danger" message="Failed to load teachers. Try refreshing." />
        ) : teachersQuery.data.teachers.length === 0 ? (
          <StateCard message={`No teachers found in ${props.department}.`} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Teacher</th>
                  <th style={styles.th}>Employee code</th>
                  <th style={styles.th}>Courses</th>
                  <th style={styles.th}>Active / Archived</th>
                  <th style={styles.th}>Classes taken</th>
                  <th style={styles.th}>Avg attendance</th>
                </tr>
              </thead>
              <tbody>
                {teachersQuery.data.teachers.map((teacher) => (
                  <tr key={teacher.teacherId}>
                    <td style={styles.td}>
                      <Link
                        href={adminWorkflowRoutes.recordsTeacher(
                          props.department,
                          teacher.teacherId,
                        )}
                        style={{
                          color: webTheme.colors.accent,
                          textDecoration: "none",
                          fontWeight: 600,
                        }}
                      >
                        {teacher.displayName}
                      </Link>
                    </td>
                    <td style={styles.td}>{teacher.employeeCode ?? "—"}</td>
                    <td style={styles.td}>{teacher.courseCount}</td>
                    <td style={styles.td}>
                      {teacher.activeCourseCount} / {teacher.archivedCourseCount}
                    </td>
                    <td style={styles.td}>{teacher.classesTaken}</td>
                    <td style={styles.td}>
                      <PercentBadge value={teacher.averageAttendancePercent} />
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
