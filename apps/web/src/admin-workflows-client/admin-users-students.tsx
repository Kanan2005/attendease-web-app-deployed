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

  const filterOptionsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminUsersFilterOptions(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.getAdminUsersFilterOptions(props.accessToken ?? ""),
    staleTime: 120_000,
  })

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

  const opts = filterOptionsQuery.data

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
      <div style={studentFilterGridStyle}>
        <Field
          label="Search (name, email, roll no.)"
          value={draft.query}
          onChange={(value) => setDraft({ ...draft, query: value })}
        />
        <label style={{ display: "grid", gap: 6 }}>
          <span>Degree</span>
          <select
            value={draft.degree}
            onChange={(e) => setDraft({ ...draft, degree: e.target.value })}
            style={styles.input}
          >
            <option value="">All</option>
            {(opts?.degrees ?? []).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Branch</span>
          <select
            value={draft.branch}
            onChange={(e) => setDraft({ ...draft, branch: e.target.value })}
            style={styles.input}
          >
            <option value="">All</option>
            {(opts?.branches ?? []).map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Current semester</span>
          <select
            value={draft.currentSemester}
            onChange={(e) => setDraft({ ...draft, currentSemester: e.target.value })}
            style={styles.input}
          >
            <option value="">All</option>
            {(opts?.semesters ?? []).map((s) => (
              <option key={s} value={String(s)}>Semester {s}</option>
            ))}
          </select>
        </label>
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
        <button type="button" onClick={handleApply} style={styles.primaryButton} className="ui-primary-btn">
          Apply filters
        </button>
        <button type="button" onClick={handleReset} style={styles.secondaryButton} className="ui-secondary-btn">
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
                        color: webTheme.colors.accent,
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
                          background: webTheme.colors.dangerSoft,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                        }}
                      >
                        DISABLED
                      </span>
                    ) : (
                      <span
                        style={{
                          color: webTheme.colors.success,
                          background: webTheme.colors.successSoft,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
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

const studentFilterGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(3, 1fr)",
  marginBottom: 16,
}
