"use client"

import { webTheme } from "@attendease/ui-web"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useState } from "react"

import { WebSectionCard } from "../web-shell"
import { adminWorkflowRoutes, webWorkflowQueryKeys } from "../web-workflows"
import { Banner, Field, StateCard, bootstrap, styles } from "./shared"

type TeacherFilters = {
  query: string
  department: string
}

const INITIAL_FILTERS: TeacherFilters = { query: "", department: "" }

export function AdminUsersTeachersWorkspace(props: { accessToken: string | null }) {
  const [draft, setDraft] = useState<TeacherFilters>(INITIAL_FILTERS)
  const [submitted, setSubmitted] = useState<TeacherFilters>(INITIAL_FILTERS)

  const filterOptionsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminUsersFilterOptions(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.getAdminUsersFilterOptions(props.accessToken ?? ""),
    staleTime: 120_000,
  })

  const queryParams: Record<string, string | undefined> = {
    ...(submitted.query ? { query: submitted.query } : {}),
    ...(submitted.department ? { department: submitted.department } : {}),
  }

  const teachersQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminUsersTeachers(queryParams),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listAdminUsersTeachers(props.accessToken ?? "", {
        ...(submitted.query ? { query: submitted.query } : {}),
        ...(submitted.department ? { department: submitted.department } : {}),
        limit: 100,
      }),
    staleTime: 30_000,
  })

  const opts = filterOptionsQuery.data

  return (
    <WebSectionCard
      title="Teachers"
      description="Search and filter the teacher directory. Click a row to view their profile, courses, and attendance summary."
    >
      <div style={{ ...styles.formGrid, marginBottom: 16 }}>
        <Field
          label="Search (name, email, employee code)"
          value={draft.query}
          onChange={(value) => setDraft({ ...draft, query: value })}
        />
        <label style={{ display: "grid", gap: 6 }}>
          <span>Department</span>
          <select
            value={draft.department}
            onChange={(e) => setDraft({ ...draft, department: e.target.value })}
            style={styles.input}
          >
            <option value="">All</option>
            {(opts?.departments ?? []).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ ...styles.buttonRow, marginBottom: 16 }}>
        <button type="button" onClick={() => setSubmitted(draft)} style={styles.primaryButton} className="ui-primary-btn">
          Apply filters
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(INITIAL_FILTERS)
            setSubmitted(INITIAL_FILTERS)
          }}
          style={styles.secondaryButton}
          className="ui-secondary-btn"
        >
          Reset
        </button>
      </div>
      {teachersQuery.isPending ? (
        <StateCard message="Loading teachers…" />
      ) : teachersQuery.isError ? (
        <Banner tone="danger" message="Failed to load teachers. Try refreshing." />
      ) : teachersQuery.data.teachers.length === 0 ? (
        <StateCard message="No teachers match the current filters." />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Employee code</th>
                <th style={styles.th}>Department</th>
                <th style={styles.th}>Designation</th>
                <th style={styles.th}>Courses</th>
                <th style={styles.th}>Active / Archived</th>
                <th style={styles.th}>Students</th>
              </tr>
            </thead>
            <tbody>
              {teachersQuery.data.teachers.map((teacher) => (
                <tr key={teacher.teacherId}>
                  <td style={styles.td}>
                    <Link
                      href={adminWorkflowRoutes.usersTeacherProfile(teacher.teacherId)}
                      style={{
                        color: webTheme.colors.accent,
                        textDecoration: "none",
                        fontWeight: 600,
                      }}
                    >
                      <div>{teacher.displayName}</div>
                      <div style={{ fontSize: 12, color: webTheme.colors.textMuted }}>
                        {teacher.email}
                      </div>
                    </Link>
                  </td>
                  <td style={styles.td}>{teacher.employeeCode ?? "—"}</td>
                  <td style={styles.td}>{teacher.department ?? "—"}</td>
                  <td style={styles.td}>{teacher.designation ?? "—"}</td>
                  <td style={styles.td}>{teacher.courseCount}</td>
                  <td style={styles.td}>
                    {teacher.activeCourseCount} / {teacher.archivedCourseCount}
                  </td>
                  <td style={styles.td}>{teacher.studentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WebSectionCard>
  )
}
