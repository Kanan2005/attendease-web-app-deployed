"use client"

import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useState } from "react"

import { WebSectionCard } from "../web-shell"
import { adminWorkflowRoutes, webWorkflowQueryKeys } from "../web-workflows"
import { ArchivedPill, PercentBadge } from "./admin-records-shared"
import { AdminUserSessionsPanel } from "./admin-user-sessions"
import { BackLink, Banner, StateCard, bootstrap, styles } from "./shared"

export function AdminUsersStudentProfileWorkspace(props: {
  accessToken: string | null
  studentId: string
}) {
  const queryClient = useQueryClient()
  const profileQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminUsersStudentProfile(props.studentId),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.getAdminUsersStudentProfile(props.accessToken ?? "", props.studentId),
    staleTime: 30_000,
  })

  const [busy, setBusy] = useState(false)

  const disableMutation = useMutation({
    mutationFn: (reason: string | undefined) =>
      bootstrap.authClient.disableAdminUsersStudentAttendance(
        props.accessToken ?? "",
        props.studentId,
        reason ? { reason } : {},
      ),
    onSuccess: async (data) => {
      queryClient.setQueryData(webWorkflowQueryKeys.adminUsersStudentProfile(props.studentId), data)
      await queryClient.invalidateQueries({
        queryKey: ["web-workflows", "admin-users", "students"],
      })
      setBusy(false)
    },
    onError: () => setBusy(false),
  })

  const enableMutation = useMutation({
    mutationFn: (reason: string | undefined) =>
      bootstrap.authClient.enableAdminUsersStudentAttendance(
        props.accessToken ?? "",
        props.studentId,
        reason ? { reason } : {},
      ),
    onSuccess: async (data) => {
      queryClient.setQueryData(webWorkflowQueryKeys.adminUsersStudentProfile(props.studentId), data)
      await queryClient.invalidateQueries({
        queryKey: ["web-workflows", "admin-users", "students"],
      })
      setBusy(false)
    },
    onError: () => setBusy(false),
  })

  function handleDisable() {
    const reason = window.prompt(
      "Disable attendance for this student?\n\nReason (min 3 chars, optional):",
      "",
    )
    if (reason === null) return
    setBusy(true)
    const trimmed = reason.trim()
    disableMutation.mutate(trimmed.length >= 3 ? trimmed : undefined)
  }

  function handleEnable() {
    const reason = window.prompt(
      "Re-enable attendance for this student?\n\nReason (min 3 chars, optional):",
      "",
    )
    if (reason === null) return
    setBusy(true)
    const trimmed = reason.trim()
    enableMutation.mutate(trimmed.length >= 3 ? trimmed : undefined)
  }

  if (profileQuery.isPending) {
    return <StateCard message="Loading student profile…" />
  }
  if (profileQuery.isError) {
    return <Banner tone="danger" message="Failed to load student profile." />
  }

  const profile = profileQuery.data

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <BackLink href={adminWorkflowRoutes.usersStudents}>Back to all students</BackLink>

      <WebSectionCard
        title={profile.displayName}
        description={`${profile.email} · ${profile.rollNumber ?? "no roll number"}`}
      >
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            marginBottom: 16,
          }}
        >
          <ProfileStat label="Account status" value={profile.accountStatus} />
          <ProfileStat label="Degree" value={profile.degree ?? "—"} />
          <ProfileStat label="Branch" value={profile.branch ?? "—"} />
          <ProfileStat
            label="Current semester"
            value={profile.currentSemester ? `Sem ${profile.currentSemester}` : "—"}
          />
          <ProfileStat label="University ID" value={profile.universityId ?? "—"} />
          <ProfileStat label="Parent email" value={profile.parentEmail ?? "—"} />
        </div>

        <div
          style={{
            ...styles.rowCard,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 11, color: webTheme.colors.textMuted }}>
              Attendance access
            </span>
            <strong
              style={{
                fontSize: 16,
                color: profile.attendanceDisabled
                  ? webTheme.colors.danger
                  : webTheme.colors.success,
              }}
            >
              {profile.attendanceDisabled ? "DISABLED" : "ENABLED"}
            </strong>
            <span style={{ fontSize: 12, color: webTheme.colors.textMuted }}>
              {profile.attendanceDisabled
                ? "Student cannot mark attendance from any device. Existing records preserved."
                : "Student can mark attendance normally from their trusted device."}
            </span>
          </div>
          {profile.attendanceDisabled ? (
            <button
              type="button"
              onClick={handleEnable}
              disabled={busy}
              style={{ ...styles.primaryButton, padding: "10px 16px" }}
            >
              {busy ? "Working…" : "Enable attendance"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDisable}
              disabled={busy}
              style={{ ...styles.dangerButton, padding: "10px 16px" }}
            >
              {busy ? "Working…" : "Disable attendance"}
            </button>
          )}
        </div>

        {disableMutation.isError || enableMutation.isError ? (
          <div style={{ marginTop: 12 }}>
            <Banner tone="danger" message="Toggle failed. Please retry." />
          </div>
        ) : null}
      </WebSectionCard>

      <WebSectionCard
        title="Attendance summary"
        description="Overall attendance across every course this student is enrolled in."
      >
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          <ProfileStat
            label="Overall attendance"
            valueNode={<PercentBadge value={profile.overallAttendancePercent} />}
          />
          <ProfileStat label="Sessions present" value={profile.overallPresentSessions.toString()} />
          <ProfileStat label="Sessions total" value={profile.overallTotalSessions.toString()} />
          <ProfileStat label="Courses enrolled" value={profile.courses.length.toString()} />
        </div>
      </WebSectionCard>

      <WebSectionCard
        title="Per-course breakdown"
        description="One row per active or archived course offering. Click through to view course-level details under Records."
      >
        {profile.courses.length === 0 ? (
          <StateCard message="This student has no enrollments yet." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Course</th>
                  <th style={styles.th}>Teacher</th>
                  <th style={styles.th}>Sessions</th>
                  <th style={styles.th}>Attendance</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Last session</th>
                </tr>
              </thead>
              <tbody>
                {profile.courses.map((course) => (
                  <tr key={course.courseOfferingId}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600 }}>{course.code}</div>
                      <div style={{ fontSize: 12, color: webTheme.colors.textMuted }}>
                        {course.displayTitle}
                      </div>
                    </td>
                    <td style={styles.td}>{course.primaryTeacherName}</td>
                    <td style={styles.td}>
                      {course.presentSessions} / {course.totalSessions}
                    </td>
                    <td style={styles.td}>
                      <PercentBadge value={course.attendancePercent} />
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

      <AdminUserSessionsPanel
        accessToken={props.accessToken}
        userId={profile.studentId}
        userName={profile.displayName}
      />
    </div>
  )
}

function ProfileStat(props: {
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
