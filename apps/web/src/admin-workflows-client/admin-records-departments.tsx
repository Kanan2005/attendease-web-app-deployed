"use client"

import { webTheme } from "@attendease/ui-web"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"

import { WebSectionCard } from "../web-shell"
import { adminWorkflowRoutes, webWorkflowQueryKeys } from "../web-workflows"
import { PercentBadge, RecordsBreadcrumb, RecordsCourseSearch } from "./admin-records-shared"
import { Banner, StateCard, bootstrap, styles } from "./shared"

export function AdminRecordsDepartmentsWorkspace(props: { accessToken: string | null }) {
  const departmentsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminRecordsDepartments(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listAdminRecordsDepartments(props.accessToken ?? ""),
    staleTime: 60_000,
  })

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <RecordsBreadcrumb steps={[]} />
      <RecordsCourseSearch accessToken={props.accessToken} />
      <WebSectionCard
        title="Browse by department"
        description="Drill from department to teacher, course offering, and student. Use the search bar above to jump to any course by code."
      >
        {departmentsQuery.isPending ? (
          <StateCard message="Loading departments…" />
        ) : departmentsQuery.isError ? (
          <Banner tone="danger" message="Failed to load departments. Try refreshing." />
        ) : departmentsQuery.data.departments.length === 0 ? (
          <StateCard message="No departments found yet. Add a teacher with a department to populate this view." />
        ) : (
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            {departmentsQuery.data.departments.map((dept) => (
              <Link
                key={dept.department}
                href={adminWorkflowRoutes.recordsDepartment(dept.department)}
                className="ui-card-link"
                style={{
                  ...styles.rowCard,
                  textDecoration: "none",
                  color: webTheme.colors.text,
                  display: "grid",
                  gap: 12,
                  borderLeft: `3px solid ${webTheme.colors.accentBorder}`,
                  position: "relative" as const,
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "grid", gap: 4 }}>
                  <span
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: webTheme.colors.textMuted,
                    }}
                  >
                    Department
                  </span>
                  <strong style={{ fontSize: 18, color: webTheme.colors.accent }}>
                    {dept.department}
                  </strong>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 10,
                    fontSize: 13,
                  }}
                >
                  <DeptStat label="Teachers" value={dept.teacherCount.toString()} />
                  <DeptStat label="Students" value={dept.studentCount.toString()} />
                  <DeptStat label="Courses" value={dept.courseCount.toString()} />
                  <DeptStat
                    label="Active / Archived"
                    value={`${dept.activeCourseCount} / ${dept.archivedCourseCount}`}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 8,
                    borderTop: `1px solid ${webTheme.colors.surfaceMuted}`,
                  }}
                >
                  <span style={{ fontSize: 12, color: webTheme.colors.textMuted }}>
                    Avg attendance
                  </span>
                  <PercentBadge value={dept.averageAttendancePercent} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </WebSectionCard>
    </div>
  )
}

function DeptStat(props: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <span
        style={{
          fontSize: 11,
          color: webTheme.colors.textMuted,
          fontWeight: 500,
          textTransform: "uppercase" as const,
          letterSpacing: "0.04em",
        }}
      >
        {props.label}
      </span>
      <strong style={{ fontSize: 15 }}>{props.value}</strong>
    </div>
  )
}
