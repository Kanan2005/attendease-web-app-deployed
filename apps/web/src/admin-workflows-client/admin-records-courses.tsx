"use client"

import type { AdminRecordsCourseSummary } from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useState } from "react"

import { WebSectionCard } from "../web-shell"
import { adminWorkflowRoutes, webWorkflowQueryKeys } from "../web-workflows"
import {
  ArchivedPill,
  PercentBadge,
  RecordsBreadcrumb,
  RecordsCourseSearch,
} from "./admin-records-shared"
import { Banner, StateCard, bootstrap, styles } from "./shared"

export function AdminRecordsCoursesWorkspace(props: {
  accessToken: string | null
  department: string
  teacherId: string
}) {
  const queryClient = useQueryClient()
  const coursesQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminRecordsCoursesByTeacher(props.teacherId),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listAdminRecordsCoursesByTeacher(
        props.accessToken ?? "",
        props.teacherId,
      ),
    staleTime: 60_000,
  })

  const [pendingId, setPendingId] = useState<string | null>(null)

  const archiveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      bootstrap.authClient.archiveAdminRecordsCourse(
        props.accessToken ?? "",
        id,
        reason ? { reason } : {},
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.adminRecordsCoursesByTeacher(props.teacherId),
      })
      setPendingId(null)
    },
    onError: () => setPendingId(null),
  })

  const unarchiveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      bootstrap.authClient.unarchiveAdminRecordsCourse(
        props.accessToken ?? "",
        id,
        reason ? { reason } : {},
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.adminRecordsCoursesByTeacher(props.teacherId),
      })
      setPendingId(null)
    },
    onError: () => setPendingId(null),
  })

  function handleArchive(course: AdminRecordsCourseSummary) {
    const reason =
      window.prompt(
        `Archive "${course.code} — ${course.displayTitle}"?\n\nOptional reason for the audit log:`,
        "",
      ) ?? null
    if (reason === null) return // cancelled
    setPendingId(course.courseOfferingId)
    const trimmed = reason.trim()
    archiveMutation.mutate(
      trimmed ? { id: course.courseOfferingId, reason: trimmed } : { id: course.courseOfferingId },
    )
  }

  function handleUnarchive(course: AdminRecordsCourseSummary) {
    const reason =
      window.prompt(
        `Reopen "${course.code} — ${course.displayTitle}"?\n\nOptional reason for the audit log:`,
        "",
      ) ?? null
    if (reason === null) return
    setPendingId(course.courseOfferingId)
    const trimmed = reason.trim()
    unarchiveMutation.mutate(
      trimmed ? { id: course.courseOfferingId, reason: trimmed } : { id: course.courseOfferingId },
    )
  }

  const teacherName = coursesQuery.data?.teacherName ?? "Teacher"
  const departmentLabel = coursesQuery.data?.department || props.department

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <RecordsBreadcrumb
        steps={[
          {
            label: departmentLabel,
            href: adminWorkflowRoutes.recordsDepartment(departmentLabel),
          },
          { label: teacherName },
        ]}
      />
      <RecordsCourseSearch accessToken={props.accessToken} />
      <WebSectionCard
        title={`Courses owned by ${teacherName}`}
        description="Archived courses keep their history but stop accepting new sessions or roster changes. Reopening restores the course to ACTIVE."
      >
        {coursesQuery.isPending ? (
          <StateCard message="Loading courses…" />
        ) : coursesQuery.isError ? (
          <Banner tone="danger" message="Failed to load courses for this teacher." />
        ) : coursesQuery.data.courses.length === 0 ? (
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
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coursesQuery.data.courses.map((course) => {
                  const isPending = pendingId === course.courseOfferingId
                  return (
                    <tr
                      key={course.courseOfferingId}
                      style={{ opacity: course.isArchived ? 0.6 : 1 }}
                    >
                      <td style={styles.td}>
                        <Link
                          href={adminWorkflowRoutes.recordsCourse(
                            departmentLabel,
                            props.teacherId,
                            course.courseOfferingId,
                          )}
                          style={{
                            color: webTheme.colors.text,
                            textDecoration: "none",
                            fontWeight: 600,
                          }}
                        >
                          <div>{course.code}</div>
                          <div style={{ fontSize: 12, color: webTheme.colors.textMuted }}>
                            {course.displayTitle}
                          </div>
                        </Link>
                      </td>
                      <td style={styles.td}>
                        {course.isArchived ? (
                          <ArchivedPill />
                        ) : (
                          <span
                            style={{
                              color: webTheme.colors.success,
                              fontWeight: 600,
                              fontSize: 13,
                            }}
                          >
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
                        {course.lastSessionAt
                          ? new Date(course.lastSessionAt).toLocaleString()
                          : "—"}
                      </td>
                      <td style={styles.td}>
                        {course.isArchived ? (
                          <button
                            type="button"
                            onClick={() => handleUnarchive(course)}
                            disabled={isPending}
                            style={{
                              ...styles.secondaryButton,
                              padding: "8px 14px",
                              fontSize: 12,
                            }}
                          >
                            {isPending ? "Working…" : "Unarchive"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleArchive(course)}
                            disabled={isPending}
                            style={{
                              ...styles.secondaryButton,
                              padding: "8px 14px",
                              fontSize: 12,
                              borderColor: webTheme.colors.warning,
                              color: webTheme.colors.warning,
                            }}
                          >
                            {isPending ? "Working…" : "Archive"}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {archiveMutation.isError || unarchiveMutation.isError ? (
          <div style={{ marginTop: 12 }}>
            <Banner tone="danger" message="Action failed. Please retry." />
          </div>
        ) : null}
      </WebSectionCard>
    </div>
  )
}
