"use client"

import type { AdminTeacherDetail, AdminTeacherSummary } from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { webWorkflowQueryKeys } from "../web-workflows"
import { bootstrap, styles } from "./shared"

type TeacherStatusFilter = "ALL" | "ACTIVE" | "BLOCKED" | "ARCHIVED" | "PENDING" | "SUSPENDED"

export function AdminTeachersWorkspace(props: { accessToken: string | null }) {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<TeacherStatusFilter>("ALL")
  const [submittedFilters, setSubmittedFilters] = useState({ query: "", status: "ALL" as TeacherStatusFilter })
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)

  const teachersQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminTeachers({
      query: submittedFilters.query || undefined,
      status: submittedFilters.status === "ALL" ? undefined : submittedFilters.status,
    }),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listAdminTeachers(props.accessToken ?? "", {
        query: submittedFilters.query || undefined,
        status: submittedFilters.status === "ALL" ? undefined : submittedFilters.status,
        limit: 50,
      }),
  })

  const detailQuery = useQuery({
    queryKey: selectedTeacherId
      ? webWorkflowQueryKeys.adminTeacherDetail(selectedTeacherId)
      : ["noop"],
    enabled: Boolean(props.accessToken && selectedTeacherId),
    queryFn: () =>
      bootstrap.authClient.getAdminTeacher(props.accessToken ?? "", selectedTeacherId ?? ""),
  })

  function handleSearch() {
    setSubmittedFilters({ query: query.trim(), status: statusFilter })
    setSelectedTeacherId(null)
  }

  return (
    <div style={styles.grid}>
      <div>
        <h2 style={headingStyle}>Teachers</h2>
        <p style={subtitleStyle}>View and search teacher records across the institution.</p>
      </div>

      <div style={styles.formGrid}>
        <label style={fieldStyle}>
          <span style={labelStyle}>Search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Name, email, or employee code..."
            style={styles.input}
          />
        </label>
        <label style={fieldStyle}>
          <span style={labelStyle}>Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TeacherStatusFilter)}
            style={styles.input}
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="BLOCKED">Blocked</option>
            <option value="ARCHIVED">Archived</option>
            <option value="PENDING">Pending</option>
          </select>
        </label>
      </div>

      <div style={styles.buttonRow}>
        <button type="button" onClick={handleSearch} style={styles.primaryButton}>
          {teachersQuery.isFetching ? "Searching..." : "Search teachers"}
        </button>
      </div>

      {teachersQuery.isError ? (
        <p style={{ color: webTheme.colors.danger }}>Failed to load teachers.</p>
      ) : null}

      {teachersQuery.data ? (
        <div style={{ display: "grid", gridTemplateColumns: selectedTeacherId ? "1fr 1fr" : "1fr", gap: 20 }}>
          <TeacherTable
            teachers={teachersQuery.data}
            selectedId={selectedTeacherId}
            onSelect={setSelectedTeacherId}
          />
          {selectedTeacherId && detailQuery.data ? (
            <TeacherDetailPanel
              detail={detailQuery.data}
              isLoading={detailQuery.isLoading}
              onClose={() => setSelectedTeacherId(null)}
            />
          ) : null}
        </div>
      ) : teachersQuery.isLoading ? (
        <p style={subtitleStyle}>Loading teachers...</p>
      ) : null}
    </div>
  )
}

function TeacherTable(props: {
  teachers: AdminTeacherSummary[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  if (props.teachers.length === 0) {
    return <div style={emptyStyle}>No teachers found matching your search.</div>
  }

  return (
    <div style={tableContainerStyle}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Department</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Classrooms</th>
          </tr>
        </thead>
        <tbody>
          {props.teachers.map((teacher) => (
            <tr
              key={teacher.id}
              onClick={() => props.onSelect(teacher.id === props.selectedId ? null : teacher.id)}
              style={{
                cursor: "pointer",
                background: teacher.id === props.selectedId ? webTheme.colors.surfaceMuted : "transparent",
              }}
            >
              <td style={styles.td}>
                <div style={{ fontWeight: 600 }}>{teacher.displayName}</div>
                <div style={{ fontSize: 12, color: webTheme.colors.textMuted }}>{teacher.email}</div>
              </td>
              <td style={{ ...styles.td, fontSize: 13 }}>
                {teacher.department ?? "—"}
              </td>
              <td style={styles.td}>
                <StatusBadge status={teacher.status} />
              </td>
              <td style={{ ...styles.td, fontSize: 13 }}>{teacher.classroomCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TeacherDetailPanel(props: {
  detail: AdminTeacherDetail
  isLoading: boolean
  onClose: () => void
}) {
  const { detail } = props

  return (
    <div style={detailPanelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: webTheme.colors.text }}>
          {detail.displayName}
        </h3>
        <button type="button" onClick={props.onClose} style={closeBtnStyle}>
          ✕
        </button>
      </div>

      <div style={detailGridStyle}>
        <DetailRow label="Email" value={detail.email} />
        <DetailRow label="Status" value={detail.status} />
        <DetailRow label="Employee Code" value={detail.employeeCode ?? "—"} />
        <DetailRow label="Department" value={detail.department ?? "—"} />
        <DetailRow label="Designation" value={detail.designation ?? "—"} />
        <DetailRow
          label="Last Login"
          value={detail.lastLoginAt ? new Date(detail.lastLoginAt).toLocaleString() : "Never"}
        />
        <DetailRow label="Joined" value={new Date(detail.createdAt).toLocaleDateString()} />
      </div>

      {detail.classrooms.length > 0 ? (
        <div>
          <h4 style={{ margin: "16px 0 10px", fontSize: 14, fontWeight: 600, color: webTheme.colors.text }}>
            Classrooms ({detail.classrooms.length})
          </h4>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Course</th>
                <th style={styles.th}>Semester</th>
                <th style={styles.th}>Students</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {detail.classrooms.map((classroom) => (
                <tr key={classroom.classroomId}>
                  <td style={{ ...styles.td, fontSize: 13 }}>{classroom.classroomTitle}</td>
                  <td style={{ ...styles.td, fontSize: 13 }}>{classroom.semesterTitle}</td>
                  <td style={{ ...styles.td, fontSize: 13 }}>{classroom.studentCount}</td>
                  <td style={styles.td}>
                    <StatusBadge status={classroom.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: webTheme.colors.textMuted }}>No classrooms assigned.</p>
      )}
    </div>
  )
}

function DetailRow(props: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: webTheme.colors.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {props.label}
      </div>
      <div style={{ fontSize: 14, color: webTheme.colors.text, marginTop: 2 }}>{props.value}</div>
    </div>
  )
}

function StatusBadge(props: { status: string }) {
  const colorMap: Record<string, string> = {
    ACTIVE: webTheme.colors.success,
    BLOCKED: webTheme.colors.danger,
    ARCHIVED: webTheme.colors.textMuted,
    PENDING: webTheme.colors.warning,
    COMPLETED: webTheme.colors.success,
    DRAFT: webTheme.colors.textMuted,
  }

  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: 999,
        background: webTheme.colors.surfaceMuted,
        color: colorMap[props.status] ?? webTheme.colors.text,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {props.status}
    </span>
  )
}

const headingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 700,
  color: webTheme.colors.text,
  letterSpacing: "-0.02em",
}

const subtitleStyle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 15,
  color: webTheme.colors.textMuted,
  lineHeight: 1.5,
}

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: webTheme.colors.textMuted,
}

const tableContainerStyle: React.CSSProperties = {
  borderRadius: 14,
  border: `1px solid ${webTheme.colors.border}`,
  background: webTheme.colors.surfaceRaised,
  overflow: "hidden",
}

const detailPanelStyle: React.CSSProperties = {
  borderRadius: 14,
  border: `1px solid ${webTheme.colors.border}`,
  background: webTheme.colors.surfaceRaised,
  padding: 22,
  alignSelf: "start",
}

const detailGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
  marginTop: 16,
}

const closeBtnStyle: React.CSSProperties = {
  border: "none",
  background: "none",
  fontSize: 16,
  cursor: "pointer",
  color: webTheme.colors.textMuted,
  padding: "4px 8px",
}

const emptyStyle: React.CSSProperties = {
  borderRadius: 14,
  border: `1px dashed ${webTheme.colors.borderStrong}`,
  background: webTheme.colors.surfaceMuted,
  padding: 24,
  color: webTheme.colors.textMuted,
  textAlign: "center",
}
