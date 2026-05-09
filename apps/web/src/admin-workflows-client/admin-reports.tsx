"use client"

import type {
  AdminCourseReportRequest,
  AdminReportJobSummary,
  AdminStudentReportRequest,
  AdminTeacherReportRequest,
} from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { WebSectionCard } from "../web-shell"
import { webWorkflowQueryKeys } from "../web-workflows"
import { Banner, Field, StateCard, bootstrap, styles } from "./shared"

type Tab = "student" | "teacher" | "course"

export function AdminReportsWorkspace(props: { accessToken: string | null }) {
  const [tab, setTab] = useState<Tab>("student")

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div
        role="tablist"
        aria-label="Reports tabs"
        style={{
          display: "flex",
          gap: 8,
          borderBottom: `1px solid ${webTheme.colors.border}`,
        }}
      >
        <TabButton active={tab === "student"} onClick={() => setTab("student")}>
          Student report
        </TabButton>
        <TabButton active={tab === "teacher"} onClick={() => setTab("teacher")}>
          Teacher report
        </TabButton>
        <TabButton active={tab === "course"} onClick={() => setTab("course")}>
          Course report
        </TabButton>
      </div>

      {tab === "student" ? (
        <StudentReportPanel accessToken={props.accessToken} />
      ) : tab === "teacher" ? (
        <TeacherReportPanel accessToken={props.accessToken} />
      ) : (
        <CourseReportPanel accessToken={props.accessToken} />
      )}

      <RecentReportsPanel accessToken={props.accessToken} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------

function StudentReportPanel(props: { accessToken: string | null }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    branch: "",
    currentSemester: "",
    courseOfferingId: "",
    semesterId: "",
  })
  const mutation = useMutation({
    mutationFn: async (): Promise<AdminReportJobSummary> => {
      const payload: AdminStudentReportRequest = {
        ...(form.branch.trim() ? { branch: form.branch.trim() } : {}),
        ...(form.currentSemester ? { currentSemester: Number(form.currentSemester) } : {}),
        ...(form.courseOfferingId.trim() ? { courseOfferingId: form.courseOfferingId.trim() } : {}),
        ...(form.semesterId.trim() ? { semesterId: form.semesterId.trim() } : {}),
      } as AdminStudentReportRequest
      return bootstrap.authClient.generateAdminStudentReport(props.accessToken ?? "", payload)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: webWorkflowQueryKeys.adminRecentReports() })
      autoOpenDownload(data)
    },
  })

  return (
    <WebSectionCard
      title="Student attendance report"
      description="One row per (student × course offering). Filter by branch, semester, or a specific course."
    >
      <div style={styles.formGrid}>
        <Field
          label="Branch"
          value={form.branch}
          onChange={(value) => setForm({ ...form, branch: value })}
        />
        <Field
          label="Current semester"
          value={form.currentSemester}
          onChange={(value) => setForm({ ...form, currentSemester: value })}
          type="number"
        />
        <Field
          label="Course offering id"
          value={form.courseOfferingId}
          onChange={(value) => setForm({ ...form, courseOfferingId: value })}
        />
        <Field
          label="Semester id"
          value={form.semesterId}
          onChange={(value) => setForm({ ...form, semesterId: value })}
        />
      </div>
      <GenerateRow
        mutation={mutation}
        onGenerate={() => mutation.mutate()}
        onReset={() =>
          setForm({ branch: "", currentSemester: "", courseOfferingId: "", semesterId: "" })
        }
      />
    </WebSectionCard>
  )
}

// ---------------------------------------------------------------------------
// Teacher
// ---------------------------------------------------------------------------

function TeacherReportPanel(props: { accessToken: string | null }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    teacherId: "",
    department: "",
    semesterId: "",
    includeArchived: false,
  })
  const mutation = useMutation({
    mutationFn: async (): Promise<AdminReportJobSummary> => {
      const payload: AdminTeacherReportRequest = {
        includeArchived: form.includeArchived,
        ...(form.teacherId.trim() ? { teacherId: form.teacherId.trim() } : {}),
        ...(form.department.trim() ? { department: form.department.trim() } : {}),
        ...(form.semesterId.trim() ? { semesterId: form.semesterId.trim() } : {}),
      } as AdminTeacherReportRequest
      return bootstrap.authClient.generateAdminTeacherReport(props.accessToken ?? "", payload)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: webWorkflowQueryKeys.adminRecentReports() })
      autoOpenDownload(data)
    },
  })

  return (
    <WebSectionCard
      title="Teacher report"
      description="One row per teacher's course offering with student counts, sessions conducted, and average attendance."
    >
      <div style={styles.formGrid}>
        <Field
          label="Teacher id"
          value={form.teacherId}
          onChange={(value) => setForm({ ...form, teacherId: value })}
        />
        <Field
          label="Department"
          value={form.department}
          onChange={(value) => setForm({ ...form, department: value })}
        />
        <Field
          label="Semester id"
          value={form.semesterId}
          onChange={(value) => setForm({ ...form, semesterId: value })}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={form.includeArchived}
            onChange={(event) => setForm({ ...form, includeArchived: event.target.checked })}
          />
          <span>Include archived courses</span>
        </label>
      </div>
      <GenerateRow
        mutation={mutation}
        onGenerate={() => mutation.mutate()}
        onReset={() =>
          setForm({
            teacherId: "",
            department: "",
            semesterId: "",
            includeArchived: false,
          })
        }
      />
    </WebSectionCard>
  )
}

// ---------------------------------------------------------------------------
// Course
// ---------------------------------------------------------------------------

function CourseReportPanel(props: { accessToken: string | null }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ courseOfferingId: "" })
  const mutation = useMutation({
    mutationFn: async (): Promise<AdminReportJobSummary> => {
      const payload: AdminCourseReportRequest = {
        courseOfferingId: form.courseOfferingId.trim(),
      }
      return bootstrap.authClient.generateAdminCourseReport(props.accessToken ?? "", payload)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: webWorkflowQueryKeys.adminRecentReports() })
      autoOpenDownload(data)
    },
  })

  return (
    <WebSectionCard
      title="Course attendance report"
      description="One row per student in the chosen course offering. Sorted by lowest attendance first."
    >
      <Field
        label="Course offering id"
        value={form.courseOfferingId}
        onChange={(value) => setForm({ ...form, courseOfferingId: value })}
      />
      <GenerateRow
        mutation={mutation}
        onGenerate={() => mutation.mutate()}
        onReset={() => setForm({ courseOfferingId: "" })}
        disabled={!form.courseOfferingId.trim()}
      />
    </WebSectionCard>
  )
}

// ---------------------------------------------------------------------------
// Recent jobs
// ---------------------------------------------------------------------------

function RecentReportsPanel(props: { accessToken: string | null }) {
  const recentQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminRecentReports(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listAdminRecentReports(props.accessToken ?? ""),
    staleTime: 30_000,
  })

  return (
    <WebSectionCard
      title="Recent reports"
      description="The last 25 reports you generated. Download links remain valid as long as the file row is not expired."
    >
      {recentQuery.isPending ? (
        <StateCard message="Loading recent reports…" />
      ) : recentQuery.isError ? (
        <Banner tone="danger" message="Failed to load recent reports." />
      ) : recentQuery.data.jobs.length === 0 ? (
        <StateCard message="No reports yet — generate one above." />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Generated at</th>
                <th style={styles.th}>Filters</th>
                <th style={styles.th}>Rows</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>File</th>
              </tr>
            </thead>
            <tbody>
              {recentQuery.data.jobs.map((job) => (
                <tr key={job.jobId}>
                  <td style={styles.td}>{labelForJobType(job.jobType)}</td>
                  <td style={styles.td}>{new Date(job.generatedAt).toLocaleString()}</td>
                  <td style={styles.td}>
                    <span style={{ fontSize: 12 }}>{job.filtersSummary}</span>
                  </td>
                  <td style={styles.td}>{job.rowCount}</td>
                  <td style={styles.td}>
                    {job.status === "COMPLETED" ? (
                      <span style={{ color: webTheme.colors.success, fontWeight: 700 }}>Ready</span>
                    ) : (
                      <span style={{ color: webTheme.colors.danger, fontWeight: 700 }}>Failed</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {job.downloadUrl ? (
                      <a
                        href={job.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: webTheme.colors.primary,
                          textDecoration: "underline",
                        }}
                      >
                        {job.fileName}
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: webTheme.colors.textMuted }}>
                        {job.errorMessage ?? "—"}
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

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function GenerateRow(props: {
  mutation: {
    isPending: boolean
    isError: boolean
    error: unknown
    data: AdminReportJobSummary | undefined
  }
  onGenerate: () => void
  onReset: () => void
  disabled?: boolean
}) {
  return (
    <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
      <div style={styles.buttonRow}>
        <button
          type="button"
          onClick={props.onGenerate}
          disabled={props.mutation.isPending || props.disabled}
          style={styles.primaryButton}
        >
          {props.mutation.isPending ? "Generating XLSX…" : "Generate report"}
        </button>
        <button type="button" onClick={props.onReset} style={styles.secondaryButton}>
          Reset
        </button>
      </div>
      {props.mutation.isError ? (
        <Banner
          tone="danger"
          message={
            props.mutation.error instanceof Error
              ? props.mutation.error.message
              : "Failed to generate the report."
          }
        />
      ) : null}
      {props.mutation.data ? (
        <Banner
          tone={props.mutation.data.status === "COMPLETED" ? "info" : "danger"}
          message={
            props.mutation.data.status === "COMPLETED"
              ? `Generated ${props.mutation.data.fileName} — ${props.mutation.data.rowCount} rows. Download started in a new tab.`
              : `Failed: ${props.mutation.data.errorMessage ?? "unknown error"}`
          }
        />
      ) : null}
    </div>
  )
}

function TabButton(props: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={props.active}
      onClick={props.onClick}
      style={{
        border: "none",
        padding: "12px 18px",
        background: "transparent",
        color: props.active ? webTheme.colors.primary : webTheme.colors.textMuted,
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
        borderBottom: `2px solid ${props.active ? webTheme.colors.primary : "transparent"}`,
        marginBottom: -1,
      }}
    >
      {props.children}
    </button>
  )
}

function labelForJobType(
  jobType: "ADMIN_STUDENT_REPORT_XLSX" | "ADMIN_TEACHER_REPORT_XLSX" | "ADMIN_COURSE_REPORT_XLSX",
): string {
  switch (jobType) {
    case "ADMIN_STUDENT_REPORT_XLSX":
      return "Student report"
    case "ADMIN_TEACHER_REPORT_XLSX":
      return "Teacher report"
    case "ADMIN_COURSE_REPORT_XLSX":
      return "Course report"
  }
}

function autoOpenDownload(job: AdminReportJobSummary): void {
  if (job.status !== "COMPLETED" || !job.downloadUrl) return
  if (typeof window === "undefined") return
  window.open(job.downloadUrl, "_blank", "noopener,noreferrer")
}
