"use client"

import { webTheme } from "@attendease/ui-web"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useState } from "react"

import { WebSectionCard } from "../web-shell"
import { adminWorkflowRoutes, webWorkflowQueryKeys } from "../web-workflows"
import { PercentBadge } from "./admin-records-shared"
import { Banner, Field, StateCard, bootstrap, styles } from "./shared"

type StudentFilters = {
  query: string
  degree: string
  branch: string
  currentSemester: string
  attendanceDisabled: "ALL" | "DISABLED" | "ACTIVE"
}

const INITIAL_FILTERS: StudentFilters = {
  query: "",
  degree: "",
  branch: "",
  currentSemester: "",
  attendanceDisabled: "ALL",
}

export function AdminUsersStudentsWorkspace(props: { accessToken: string | null }) {
  const [draft, setDraft] = useState<StudentFilters>(INITIAL_FILTERS)
  const [submitted, setSubmitted] = useState<StudentFilters>(INITIAL_FILTERS)

  const queryParams: Record<string, string | undefined> = {
    ...(submitted.query ? { query: submitted.query } : {}),
    ...(submitted.degree ? { degree: submitted.degree } : {}),
    ...(submitted.branch ? { branch: submitted.branch } : {}),
    ...(submitted.currentSemester ? { currentSemester: submitted.currentSemester } : {}),
    ...(submitted.attendanceDisabled !== "ALL"
      ? { attendanceDisabled: submitted.attendanceDisabled === "DISABLED" ? "true" : "false" }
      : {}),
  }

  const studentsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminUsersStudents(queryParams),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listAdminUsersStudents(props.accessToken ?? "", {
        ...(submitted.query ? { query: submitted.query } : {}),
        ...(submitted.degree ? { degree: submitted.degree } : {}),
        ...(submitted.branch ? { branch: submitted.branch } : {}),
        ...(submitted.currentSemester
          ? { currentSemester: Number(submitted.currentSemester) }
          : {}),
        ...(submitted.attendanceDisabled !== "ALL"
          ? { attendanceDisabled: submitted.attendanceDisabled === "DISABLED" }
          : {}),
        limit: 100,
      }),
    staleTime: 30_000,
  })

  function handleApply() {
    setSubmitted(draft)
  }

  function handleReset() {
    setDraft(INITIAL_FILTERS)
    setSubmitted(INITIAL_FILTERS)
  }

  return (
    <WebSectionCard
      title="Students"
      description="Search and filter the student directory. Click any row to open the profile and toggle attendance access."
    >
      <div style={{ ...styles.formGrid, marginBottom: 16 }}>
        <Field
          label="Search (name, email, roll no.)"
          value={draft.query}
          onChange={(value) => setDraft({ ...draft, query: value })}
        />
        <Field
          label="Degree (e.g. B.Tech)"
          value={draft.degree}
          onChange={(value) => setDraft({ ...draft, degree: value })}
        />
        <Field
          label="Branch (e.g. Computer Science)"
          value={draft.branch}
          onChange={(value) => setDraft({ ...draft, branch: value })}
        />
        <Field
          label="Current semester"
          value={draft.currentSemester}
          onChange={(value) => setDraft({ ...draft, currentSemester: value })}
          type="number"
        />
        <label style={{ display: "grid", gap: 6 }}>
          <span>Attendance access</span>
          <select
            value={draft.attendanceDisabled}
            onChange={(event) =>
              setDraft({
                ...draft,
                attendanceDisabled: event.target.value as StudentFilters["attendanceDisabled"],
              })
            }
            style={styles.input}
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Enabled only</option>
            <option value="DISABLED">Disabled only</option>
          </select>
        </label>
      </div>
      <div style={{ ...styles.buttonRow, marginBottom: 16 }}>
        <button type="button" onClick={handleApply} style={styles.primaryButton}>
          Apply filters
        </button>
        <button type="button" onClick={handleReset} style={styles.secondaryButton}>
          Reset
        </button>
      </div>
      {studentsQuery.isPending ? (
        <StateCard message="Loading students…" />
      ) : studentsQuery.isError ? (
        <Banner tone="danger" message="Failed to load students. Try refreshing." />
      ) : studentsQuery.data.students.length === 0 ? (
        <StateCard message="No students match the current filters." />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Roll number</th>
                <th style={styles.th}>Branch / Sem</th>
                <th style={styles.th}>Courses</th>
                <th style={styles.th}>Attendance</th>
                <th style={styles.th}>Access</th>
              </tr>
            </thead>
            <tbody>
              {studentsQuery.data.students.map((student) => (
                <tr key={student.studentId}>
                  <td style={styles.td}>
                    <Link
                      href={adminWorkflowRoutes.usersStudentProfile(student.studentId)}
                      style={{
                        color: webTheme.colors.text,
                        textDecoration: "none",
                        fontWeight: 600,
                      }}
                    >
                      <div>{student.displayName}</div>
                      <div style={{ fontSize: 12, color: webTheme.colors.textMuted }}>
                        {student.email}
                      </div>
                    </Link>
                  </td>
                  <td style={styles.td}>{student.rollNumber ?? "—"}</td>
                  <td style={styles.td}>
                    {student.branch ?? "—"}
                    {student.currentSemester ? ` · Sem ${student.currentSemester}` : ""}
                  </td>
                  <td style={styles.td}>{student.enrollmentCount}</td>
                  <td style={styles.td}>
                    <PercentBadge value={student.attendancePercent} />
                  </td>
                  <td style={styles.td}>
                    {student.attendanceDisabled ? (
                      <span
                        style={{
                          color: webTheme.colors.danger,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        DISABLED
                      </span>
                    ) : (
                      <span
                        style={{
                          color: webTheme.colors.success,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        ENABLED
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WebSectionCard>
  )
}
