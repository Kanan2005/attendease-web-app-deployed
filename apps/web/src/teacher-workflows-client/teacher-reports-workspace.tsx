"use client"

import type { SendThresholdEmailsRequest } from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type React from "react"
import { useEffect, useMemo, useState } from "react"

import {
  buildTeacherWebAcademicFilterOptions,
  buildTeacherWebFilterSummary,
  buildTeacherWebReportOverviewModel,
  buildTeacherWebReportQueryFilters,
  createTeacherWebReportFilterDraft,
  mapTeacherWebReviewErrorToMessage,
} from "../teacher-review-workflows"
import type { TeacherWebReportStudentRowModel } from "../teacher-review-workflows-types"
import { webWorkflowQueryKeys } from "../web-workflows"

import {
  type ReportRingMetrics,
  ReportSessionTrendChart,
  ReportSummaryRings,
  type SessionChartPoint,
} from "./reports-charts"
import {
  WorkflowBanner,
  WorkflowField,
  WorkflowSelectField,
  WorkflowStateCard,
  WorkflowSummaryGrid,
  WorkflowTonePill,
  bootstrap,
  findSelectedFilterLabel,
  workflowStyles,
} from "./shared"

const DEFAULT_ATTENDANCE_THRESHOLD = 75

const DEFAULT_STUDENT_SUBJECT = "Attendance below {{thresholdPercent}} for {{classroomTitle}}"
const DEFAULT_STUDENT_BODY = [
  "Hello {{studentName}},",
  "",
  "Your attendance for {{subjectTitle}} in {{classroomTitle}} is currently {{attendancePercentage}}.",
  "Please improve it above {{thresholdPercent}} and contact your teacher if you need support.",
].join("\n")

const DEFAULT_PARENT_BODY = [
  "Dear Parent/Guardian of {{studentName}},",
  "",
  "We are writing to inform you that {{studentName}}'s attendance for {{subjectTitle}} in {{classroomTitle}} is currently {{attendancePercentage}}, which is below the required threshold of {{thresholdPercent}}.",
  "",
  "Please encourage your ward to attend classes regularly.",
].join("\n")

const TEMPLATE_VARIABLE_HINTS = "{{studentName}}, {{classroomTitle}}, {{subjectTitle}}, {{attendancePercentage}}, {{thresholdPercent}}"

/** Substitutes {{variable}} placeholders in a template string. */
function renderPreview(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => vars[key] ?? "")
}

// ---------------------------------------------------------------------------
// ThresholdEmailComposeModal
// ---------------------------------------------------------------------------

function RecipientToggle(props: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  count: number
  disabled?: boolean
}) {
  const active = props.checked
  return (
    <button
      type="button"
      onClick={() => props.onChange(!active)}
      disabled={props.disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderRadius: 10,
        border: `1.5px solid ${active ? webTheme.colors.accent : "var(--ae-card-border)"}`,
        background: active ? `${webTheme.colors.accent}14` : "transparent",
        cursor: props.disabled ? "not-allowed" : "pointer",
        fontSize: 13,
        fontWeight: 600,
        color: active ? webTheme.colors.accent : webTheme.colors.textMuted,
        transition: "all 0.15s ease",
        opacity: props.disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          borderRadius: 5,
          border: `1.5px solid ${active ? webTheme.colors.accent : webTheme.colors.border}`,
          background: active ? webTheme.colors.accent : "transparent",
          color: "#fff",
          fontSize: 11,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        {active ? "✓" : ""}
      </span>
      {props.label}
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          background: active ? `${webTheme.colors.accent}22` : "var(--ae-card-surface)",
          borderRadius: 999,
          padding: "1px 8px",
          lineHeight: 1.6,
        }}
      >
        {props.count}
      </span>
    </button>
  )
}

function ThresholdEmailComposeModal(props: {
  selectedStudents: TeacherWebReportStudentRowModel[]
  classroomTitle: string
  thresholdPercent: number
  accessToken: string
  classroomId: string
  onClose: () => void
  onSuccess: (msg: { tone: "info" | "danger"; text: string }) => void
}) {
  const [emailStudents, setEmailStudents] = useState(true)
  const [emailParents, setEmailParents] = useState(false)
  const [subject, setSubject] = useState(DEFAULT_STUDENT_SUBJECT)
  const [body, setBody] = useState(DEFAULT_STUDENT_BODY)
  const [showPreview, setShowPreview] = useState(false)

  // Swap default body when toggling between student-only and parent-only modes
  useEffect(() => {
    if (emailParents && !emailStudents) {
      setBody(DEFAULT_PARENT_BODY)
    } else if (emailStudents && !emailParents) {
      setBody(DEFAULT_STUDENT_BODY)
    }
  }, [emailStudents, emailParents])

  const studentsWithParentEmail = props.selectedStudents.filter((s) => s.studentParentEmail)
  const studentsWithoutParentEmail = props.selectedStudents.length - studentsWithParentEmail.length

  const sampleStudent = props.selectedStudents[0]
  const previewVars: Record<string, string> = sampleStudent
    ? {
        studentName: sampleStudent.title,
        classroomTitle: props.classroomTitle,
        subjectTitle: props.classroomTitle,
        attendancePercentage: `${sampleStudent.attendancePercentage}%`,
        thresholdPercent: `${props.thresholdPercent}%`,
      }
    : {}

  const previewSubject = renderPreview(subject, previewVars)
  const previewBody = renderPreview(body, previewVars)

  const recipientCount = (() => {
    let count = 0
    if (emailStudents) count += props.selectedStudents.length
    if (emailParents) count += studentsWithParentEmail.length
    return count
  })()

  const sendMutation = useMutation({
    mutationFn: async () => {
      const payload: SendThresholdEmailsRequest = {
        studentIds: props.selectedStudents.map((s) => s.studentId),
        classroomId: props.classroomId,
        emailStudents,
        emailParents,
        subject,
        body,
        thresholdPercent: props.thresholdPercent,
      }
      return bootstrap.authClient.sendThresholdEmails(props.accessToken, payload)
    },
    onSuccess: (data) => {
      const parts: string[] = []
      if (data.sentCount > 0) parts.push(`${data.sentCount} sent`)
      if (data.failedCount > 0) parts.push(`${data.failedCount} failed`)
      if (data.skippedNoParentEmail > 0)
        parts.push(`${data.skippedNoParentEmail} skipped (no parent email)`)
      props.onSuccess({
        tone: data.failedCount > 0 ? "danger" : "info",
        text: parts.length > 0 ? `Email results: ${parts.join(", ")}.` : "No emails were sent.",
      })
    },
    onError: (error) => {
      props.onSuccess({
        tone: "danger",
        text: error instanceof Error ? error.message : "Failed to send emails.",
      })
    },
  })

  const canSend = (emailStudents || emailParents) && subject.trim().length > 0 && body.trim().length > 0

  const fieldLabelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: webTheme.colors.text,
    marginBottom: 6,
  }

  const fieldInputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid var(--ae-card-border)",
    borderRadius: 10,
    fontSize: 14,
    color: webTheme.colors.text,
    background: "var(--ae-card-surface)",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s ease",
  }

  return (
    <div
      style={{
        marginBottom: 16,
        borderRadius: 16,
        border: `1px solid ${webTheme.colors.accent}33`,
        background: "var(--ae-card-surface)",
        boxShadow: `0 4px 24px ${webTheme.colors.accent}0a`,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid var(--ae-card-border)",
          background: `${webTheme.colors.accent}08`,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: webTheme.colors.text }}>
            Compose notification
          </div>
          <div style={{ fontSize: 13, color: webTheme.colors.textMuted, marginTop: 2 }}>
            {props.selectedStudents.length} student{props.selectedStudents.length === 1 ? "" : "s"} selected
            {" · "}below {props.thresholdPercent}% attendance
          </div>
        </div>
        <button
          type="button"
          onClick={props.onClose}
          disabled={sendMutation.isPending}
          aria-label="Close compose modal"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "1px solid var(--ae-card-border)",
            background: "transparent",
            cursor: "pointer",
            fontSize: 18,
            color: webTheme.colors.textMuted,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: "20px 24px" }}>
        {/* Recipient toggles */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: webTheme.colors.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Recipients
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <RecipientToggle
              checked={emailStudents}
              onChange={setEmailStudents}
              label="Students"
              count={props.selectedStudents.length}
              disabled={sendMutation.isPending}
            />
            <RecipientToggle
              checked={emailParents}
              onChange={setEmailParents}
              label="Parents"
              count={studentsWithParentEmail.length}
              disabled={sendMutation.isPending}
            />
          </div>
        </div>

        {emailParents && studentsWithoutParentEmail > 0 ? (
          <div
            style={{
              margin: "0 0 16px",
              padding: "10px 14px",
              borderRadius: 10,
              background: `${webTheme.colors.warning}12`,
              border: `1px solid ${webTheme.colors.warning}33`,
              fontSize: 13,
              color: webTheme.colors.textMuted,
              lineHeight: 1.5,
            }}
          >
            {studentsWithoutParentEmail} student{studentsWithoutParentEmail === 1 ? " has" : "s have"}{" "}
            no parent email on file — they will be skipped for parent emails.
          </div>
        ) : null}

        {!emailStudents && !emailParents ? (
          <div
            style={{
              margin: "0 0 16px",
              padding: "10px 14px",
              borderRadius: 10,
              background: `${webTheme.colors.danger}12`,
              border: `1px solid ${webTheme.colors.danger}33`,
              fontSize: 13,
              color: webTheme.colors.danger,
              lineHeight: 1.5,
            }}
          >
            Select at least one recipient type to send emails.
          </div>
        ) : null}

        {/* Subject */}
        <div style={{ marginBottom: 14 }}>
          <label style={fieldLabelStyle}>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            disabled={sendMutation.isPending}
            style={fieldInputStyle}
          />
        </div>

        {/* Body */}
        <div style={{ marginBottom: 10 }}>
          <label style={fieldLabelStyle}>Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            rows={6}
            disabled={sendMutation.isPending}
            style={{
              ...fieldInputStyle,
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: 1.6,
            }}
          />
        </div>

        {/* Template variable hints */}
        <div
          style={{
            margin: "0 0 16px",
            padding: "8px 12px",
            borderRadius: 8,
            background: `${webTheme.colors.accent}08`,
            fontSize: 12,
            color: webTheme.colors.textMuted,
            lineHeight: 1.6,
          }}
        >
          <span style={{ fontWeight: 600 }}>Variables:</span>{" "}
          <code style={{ fontSize: 11 }}>{TEMPLATE_VARIABLE_HINTS}</code>
        </div>

        {/* Collapsible preview */}
        {sampleStudent ? (
          <div style={{ marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: webTheme.colors.accent,
                marginBottom: showPreview ? 10 : 0,
              }}
            >
              <span style={{ transform: showPreview ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s ease", display: "inline-block" }}>
                ▸
              </span>
              {showPreview ? "Hide preview" : "Show preview"} — {sampleStudent.title}
            </button>
            {showPreview ? (
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: 12,
                  border: "1px dashed var(--ae-card-border)",
                  background: `${webTheme.colors.accent}06`,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: webTheme.colors.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>
                  Email preview
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: webTheme.colors.text, marginBottom: 6, lineHeight: 1.4 }}>
                  {previewSubject}
                </div>
                <div style={{ fontSize: 13, color: webTheme.colors.textMuted, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {previewBody}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending || !canSend}
            style={{
              ...workflowStyles.primaryButton,
              opacity: canSend ? 1 : 0.5,
              padding: "9px 20px",
            }}
          >
            {sendMutation.isPending
              ? "Sending..."
              : `Send ${recipientCount} email${recipientCount === 1 ? "" : "s"}`}
          </button>
          <button
            type="button"
            onClick={props.onClose}
            disabled={sendMutation.isPending}
            style={{
              background: "none",
              border: `1px solid ${webTheme.colors.border}`,
              borderRadius: 8,
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 500,
              color: webTheme.colors.textMuted,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function TeacherReportsWorkspace(props: {
  accessToken: string | null
  initialClassroomId?: string | null
}) {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState(() =>
    props.initialClassroomId
      ? { ...createTeacherWebReportFilterDraft(), classroomId: props.initialClassroomId }
      : createTeacherWebReportFilterDraft(),
  )
  const [attendanceThreshold, setAttendanceThreshold] = useState(DEFAULT_ATTENDANCE_THRESHOLD)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [showComposeModal, setShowComposeModal] = useState(false)
  const [emailResultMessage, setEmailResultMessage] = useState<{
    tone: "info" | "danger"
    text: string
  } | null>(null)

  useEffect(() => {
    if (!exportSuccess) return
    const timer = setTimeout(() => setExportSuccess(false), 4000)
    return () => clearTimeout(timer)
  }, [exportSuccess])

  useEffect(() => {
    if (!emailResultMessage) return
    const timer = setTimeout(() => setEmailResultMessage(null), 6000)
    return () => clearTimeout(timer)
  }, [emailResultMessage])

  const classroomsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classrooms(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listClassrooms(props.accessToken ?? ""),
  })
  const academicFilterOptions = buildTeacherWebAcademicFilterOptions(classroomsQuery.data ?? [])
  const reportFilters = buildTeacherWebReportQueryFilters(filters)
  const filterSummary = buildTeacherWebFilterSummary({
    classroom: findSelectedFilterLabel(academicFilterOptions.classroomOptions, filters.classroomId),
    class: findSelectedFilterLabel(academicFilterOptions.classOptions, filters.classId),
    section: findSelectedFilterLabel(academicFilterOptions.sectionOptions, filters.sectionId),
    subject: findSelectedFilterLabel(academicFilterOptions.subjectOptions, filters.subjectId),
    fromDate: filters.fromDate || null,
    toDate: filters.toDate || null,
  })

  const daywiseQuery = useQuery({
    queryKey: webWorkflowQueryKeys.teacherDaywiseReports(reportFilters),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listTeacherDaywiseReports(props.accessToken ?? "", reportFilters),
  })
  const subjectwiseQuery = useQuery({
    queryKey: webWorkflowQueryKeys.teacherSubjectwiseReports(reportFilters),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listTeacherSubjectwiseReports(props.accessToken ?? "", reportFilters),
  })
  const studentQuery = useQuery({
    queryKey: webWorkflowQueryKeys.teacherStudentPercentageReports(reportFilters),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listTeacherStudentPercentageReports(
        props.accessToken ?? "",
        reportFilters,
      ),
  })

  const sessionsForChartQuery = useQuery({
    queryKey: webWorkflowQueryKeys.sessionHistory(reportFilters),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listAttendanceSessions(props.accessToken ?? "", reportFilters),
  })

  const lecturesQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomLectures(props.initialClassroomId ?? ""),
    enabled: Boolean(props.accessToken && props.initialClassroomId),
    queryFn: () =>
      bootstrap.authClient.listClassroomLectures(
        props.accessToken ?? "",
        props.initialClassroomId ?? "",
      ),
  })

  const reportOverview = buildTeacherWebReportOverviewModel({
    daywiseRows: daywiseQuery.data ?? [],
    subjectRows: subjectwiseQuery.data ?? [],
    studentRows: studentQuery.data ?? [],
    filterSummary,
  })

  const studentsBelowThreshold = useMemo(
    () =>
      reportOverview.studentRows.filter(
        (row) => row.attendancePercentage < attendanceThreshold,
      ),
    [reportOverview.studentRows, attendanceThreshold],
  )

  // Prune selected IDs that are no longer in the below-threshold list
  // (e.g. when the teacher changes the threshold percentage)
  useEffect(() => {
    const validIds = new Set(studentsBelowThreshold.map((r) => r.studentId))
    setSelectedStudentIds((prev) => {
      const pruned = new Set([...prev].filter((id) => validIds.has(id)))
      if (pruned.size === prev.size) return prev
      return pruned
    })
  }, [studentsBelowThreshold])

  const isCourseScoped = Boolean(props.initialClassroomId)
  const allLectures = lecturesQuery.data ?? []
  const sessions = sessionsForChartQuery.data ?? []

  const lectures = allLectures.filter((lec) => {
    const d = lec.lectureDate ? new Date(lec.lectureDate) : null
    if (!d || Number.isNaN(d.getTime())) return true
    const dateStr = d.toISOString().slice(0, 10)
    if (filters.fromDate && dateStr < filters.fromDate) return false
    if (filters.toDate && dateStr > filters.toDate) return false
    return true
  })

  const sessionChartData: SessionChartPoint[] = (() => {
    const shortDateLabel = (iso: string): string => {
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return iso
      return new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(d)
    }

    const sortedSessions = [...sessions].sort((a, b) => {
      const timeA = new Date(a.startedAt ?? a.lectureDate ?? 0).getTime()
      const timeB = new Date(b.startedAt ?? b.lectureDate ?? 0).getTime()
      return timeA - timeB
    })

    const lectureMap = new Map(lectures.map((l) => [l.id, l]))
    const dateCounts = new Map<string, number>()

    return sortedSessions.map((s) => {
      const total = s.presentCount + s.absentCount
      const pct = total > 0 ? Math.round((s.presentCount / total) * 100) : 0
      const dateIso = s.startedAt ?? s.lectureDate ?? ""
      const dateLabel = shortDateLabel(dateIso)
      const count = (dateCounts.get(dateLabel) ?? 0) + 1
      dateCounts.set(dateLabel, count)
      const lecture = s.lectureId ? lectureMap.get(s.lectureId) : null
      const title = lecture?.title || s.lectureTitle || `Session ${count} · ${dateLabel}`
      return { date: dateIso, dateLabel, pct, title }
    })
  })()

  const exportToExcelMutation = useMutation({
    mutationFn: async () => {
      if (!props.accessToken) {
        throw new Error("Sign in to export report data.")
      }
      return bootstrap.authClient.createExportJob(props.accessToken, {
        jobType: "COMPREHENSIVE_CSV",
        filters: reportFilters,
      })
    },
    onSuccess: async () => {
      setExportSuccess(true)
      await queryClient.invalidateQueries({ queryKey: webWorkflowQueryKeys.exportJobs() })
    },
  })

  // Derive the classroom title for the compose modal
  const classroomTitle = useMemo(() => {
    if (!props.initialClassroomId || !classroomsQuery.data) return ""
    const match = classroomsQuery.data.find((c) => c.id === props.initialClassroomId)
    return match?.displayTitle ?? ""
  }, [props.initialClassroomId, classroomsQuery.data])

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  const allBelowThresholdSelected =
    studentsBelowThreshold.length > 0 &&
    studentsBelowThreshold.every((r) => selectedStudentIds.has(r.studentId))

  const toggleSelectAll = () => {
    if (allBelowThresholdSelected) {
      setSelectedStudentIds(new Set())
    } else {
      setSelectedStudentIds(new Set(studentsBelowThreshold.map((r) => r.studentId)))
    }
  }

  const lectureCount = isCourseScoped ? lectures.length : (sessionsForChartQuery.data?.length ?? 0)

  const avgAttendancePct =
    reportOverview.summaryCards.find((c) => c.label === "Attendance")?.value ?? "0%"

  const visibleSummaryCards = isCourseScoped
    ? [
        {
          label: "Students enrolled",
          value: String(
            reportOverview.summaryCards.find((c) => c.label === "Students")?.value ?? "0",
          ),
          tone: (reportOverview.summaryCards.find((c) => c.label === "Students")?.tone ??
            "warning") as "primary" | "success" | "warning" | "danger",
        },
        {
          label: "Lecture sessions",
          value: String(lectureCount),
          tone: (lectureCount > 0 ? "primary" : "warning") as
            | "primary"
            | "success"
            | "warning"
            | "danger",
        },
        {
          label: "Average attendance",
          value: avgAttendancePct,
          tone: (reportOverview.summaryCards.find((c) => c.label === "Attendance")?.tone ??
            "warning") as "primary" | "success" | "warning" | "danger",
        },
      ]
    : reportOverview.summaryCards

  const ringMetrics: ReportRingMetrics | undefined = isCourseScoped
    ? (() => {
        const totalStudents = Number.parseInt(
          reportOverview.summaryCards.find((c) => c.label === "Students")?.value ?? "0",
          10,
        )
        return {
          attendancePct: Number.parseFloat(avgAttendancePct.replace("%", "")) || 0,
          qrSessions: sessions.filter((s) => s.mode === "QR_GPS").length,
          bleSessions: sessions.filter((s) => s.mode === "BLUETOOTH").length,
          manualSessions: sessions.filter((s) => s.mode === "MANUAL").length,
          studentsAtRisk: studentsBelowThreshold.length,
          totalStudents,
          attendanceThreshold,
        }
      })()
    : undefined

  return (
    <div style={workflowStyles.grid}>
      {!props.accessToken ? (
        <WorkflowStateCard message="Sign in to review attendance reports." />
      ) : (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <h2 style={{ fontSize: 22, fontWeight: 700, color: webTheme.colors.text, margin: 0 }}>
              Reports
            </h2>
            <button
              type="button"
              onClick={() => exportToExcelMutation.mutate()}
              disabled={exportToExcelMutation.isPending}
              style={workflowStyles.primaryButton}
            >
              {exportToExcelMutation.isPending ? "Queueing export..." : "Export to Excel"}
            </button>
          </div>

          {isCourseScoped ? (
            <div
              style={{
                ...workflowStyles.formGrid,
                padding: "16px 20px",
                borderRadius: 14,
                border: "1px solid var(--ae-card-border)",
                background: "var(--ae-card-surface)",
                boxShadow: "var(--ae-card-shadow)",
                alignItems: "end",
              }}
            >
              <WorkflowField
                label="From"
                value={filters.fromDate}
                onChange={(value) => setFilters((current) => ({ ...current, fromDate: value }))}
                type="date"
              />
              <WorkflowField
                label="To"
                value={filters.toDate}
                onChange={(value) => setFilters((current) => ({ ...current, toDate: value }))}
                type="date"
              />
              {(filters.fromDate || filters.toDate) ? (
                <button
                  type="button"
                  onClick={() =>
                    setFilters((current) => ({ ...current, fromDate: "", toDate: "" }))
                  }
                  style={{
                    background: "none",
                    border: `1px solid ${webTheme.colors.border}`,
                    borderRadius: 8,
                    padding: "7px 14px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: webTheme.colors.accent,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Reset to all-time
                </button>
              ) : null}
            </div>
          ) : (
            <div
              style={{
                ...workflowStyles.formGrid,
                padding: "16px 20px",
                borderRadius: 14,
                border: "1px solid var(--ae-card-border)",
                background: "var(--ae-card-surface)",
                boxShadow: "var(--ae-card-shadow)",
              }}
            >
              <WorkflowSelectField
                label="Classroom"
                value={filters.classroomId}
                onChange={(value) => setFilters((current) => ({ ...current, classroomId: value }))}
                options={[
                  { value: "", label: "All classrooms" },
                  ...academicFilterOptions.classroomOptions,
                ]}
              />
              <WorkflowSelectField
                label="Class"
                value={filters.classId}
                onChange={(value) => setFilters((current) => ({ ...current, classId: value }))}
                options={[
                  { value: "", label: "All classes" },
                  ...academicFilterOptions.classOptions,
                ]}
              />
              <WorkflowSelectField
                label="Section"
                value={filters.sectionId}
                onChange={(value) => setFilters((current) => ({ ...current, sectionId: value }))}
                options={[
                  { value: "", label: "All sections" },
                  ...academicFilterOptions.sectionOptions,
                ]}
              />
              <WorkflowSelectField
                label="Subject"
                value={filters.subjectId}
                onChange={(value) => setFilters((current) => ({ ...current, subjectId: value }))}
                options={[
                  { value: "", label: "All subjects" },
                  ...academicFilterOptions.subjectOptions,
                ]}
              />
              <WorkflowField
                label="From"
                value={filters.fromDate}
                onChange={(value) => setFilters((current) => ({ ...current, fromDate: value }))}
                type="date"
              />
              <WorkflowField
                label="To"
                value={filters.toDate}
                onChange={(value) => setFilters((current) => ({ ...current, toDate: value }))}
                type="date"
              />
              {(filters.fromDate || filters.toDate) ? (
                <button
                  type="button"
                  onClick={() =>
                    setFilters((current) => ({ ...current, fromDate: "", toDate: "" }))
                  }
                  style={{
                    background: "none",
                    border: `1px solid ${webTheme.colors.border}`,
                    borderRadius: 8,
                    padding: "7px 14px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: webTheme.colors.accent,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    alignSelf: "end",
                  }}
                >
                  Reset to all-time
                </button>
              ) : null}
            </div>
          )}

          {classroomsQuery.isError ? (
            <WorkflowBanner
              tone="danger"
              message={mapTeacherWebReviewErrorToMessage(
                classroomsQuery.error,
                "AttendEase couldn't load the report filters.",
              )}
            />
          ) : null}

          <WorkflowSummaryGrid cards={visibleSummaryCards} />
        </>
      )}

      {!props.accessToken ? null : daywiseQuery.isLoading ||
        subjectwiseQuery.isLoading ||
        studentQuery.isLoading ? (
        <WorkflowStateCard message="Loading report results..." />
      ) : daywiseQuery.isError || subjectwiseQuery.isError || studentQuery.isError ? (
        <WorkflowBanner
          tone="danger"
          message={mapTeacherWebReviewErrorToMessage(
            daywiseQuery.error ?? subjectwiseQuery.error ?? studentQuery.error,
            "AttendEase couldn't load the teacher report results.",
          )}
        />
      ) : !reportOverview.hasAnyData ? (
        <WorkflowStateCard message="No report rows matched the current filters." />
      ) : (
        <>
          <ReportSummaryRings cards={visibleSummaryCards} metrics={ringMetrics} />

          {sessionsForChartQuery.isError ? (
            <WorkflowBanner
              tone="danger"
              message={mapTeacherWebReviewErrorToMessage(
                sessionsForChartQuery.error,
                "Could not load chart data.",
              )}
            />
          ) : null}

          <section style={{ marginBottom: 32 }} aria-labelledby="report-trend-heading">
            <h3
              id="report-trend-heading"
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: webTheme.colors.text,
                margin: "0 0 12px",
              }}
            >
              Attendance by session
            </h3>
            <ReportSessionTrendChart data={sessionChartData} />
          </section>

          <section aria-labelledby="report-threshold-heading">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h3
                  id="report-threshold-heading"
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: webTheme.colors.text,
                    margin: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  Students below threshold
                  {studentsBelowThreshold.length > 0 ? (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: webTheme.colors.danger,
                        background: webTheme.colors.dangerSoft,
                        border: `1px solid ${webTheme.colors.dangerBorder}`,
                        borderRadius: 999,
                        padding: "2px 8px",
                        lineHeight: 1.4,
                      }}
                    >
                      {studentsBelowThreshold.length}
                    </span>
                  ) : null}
                </h3>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: webTheme.colors.textMuted,
                    padding: "6px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--ae-card-border)",
                    background: "var(--ae-card-surface)",
                  }}
                >
                  Threshold
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={attendanceThreshold}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      if (!Number.isNaN(n)) setAttendanceThreshold(Math.max(0, Math.min(100, n)))
                    }}
                    style={{
                      width: 48,
                      padding: "4px 6px",
                      border: "1px solid var(--ae-card-border)",
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 600,
                      color: webTheme.colors.text,
                      background: "transparent",
                      outline: "none",
                      textAlign: "center",
                    }}
                  />
                  <span>%</span>
                </label>
              </div>
              {isCourseScoped && studentsBelowThreshold.length > 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {selectedStudentIds.size > 0 ? (
                    <span style={{ fontSize: 13, color: webTheme.colors.textMuted }}>
                      {selectedStudentIds.size} of {studentsBelowThreshold.length} selected
                    </span>
                  ) : (
                    <span style={{ fontSize: 13, color: webTheme.colors.textMuted }}>
                      Select students to email
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowComposeModal(true)}
                    disabled={selectedStudentIds.size === 0}
                    style={{
                      ...workflowStyles.primaryButton,
                      fontSize: 13,
                      padding: "8px 18px",
                      opacity: selectedStudentIds.size > 0 ? 1 : 0.45,
                      cursor: selectedStudentIds.size > 0 ? "pointer" : "not-allowed",
                    }}
                  >
                    {selectedStudentIds.size > 0
                      ? `Email ${selectedStudentIds.size} student${selectedStudentIds.size === 1 ? "" : "s"}`
                      : "Email students"}
                  </button>
                </div>
              ) : null}
            </div>

            {emailResultMessage ? (
              <div style={{ marginBottom: 12 }}>
                <WorkflowBanner tone={emailResultMessage.tone} message={emailResultMessage.text} />
              </div>
            ) : null}

            {showComposeModal && props.accessToken && props.initialClassroomId ? (
              <ThresholdEmailComposeModal
                selectedStudents={studentsBelowThreshold.filter((r) => selectedStudentIds.has(r.studentId))}
                classroomTitle={classroomTitle}
                thresholdPercent={attendanceThreshold}
                accessToken={props.accessToken}
                classroomId={props.initialClassroomId}
                onClose={() => setShowComposeModal(false)}
                onSuccess={(msg) => {
                  setShowComposeModal(false)
                  setSelectedStudentIds(new Set())
                  setEmailResultMessage(msg)
                }}
              />
            ) : null}

            <div
              style={{
                overflowX: "auto",
                borderRadius: 14,
                border: "1px solid var(--ae-card-border)",
                background: "var(--ae-card-surface)",
                boxShadow: "var(--ae-card-shadow)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "var(--ae-card-glow)",
                  pointerEvents: "none",
                }}
              />
              <table style={{ ...workflowStyles.table, position: "relative", zIndex: 1 }}>
                <thead>
                  <tr>
                    {isCourseScoped && studentsBelowThreshold.length > 0 ? (
                      <th style={{ ...workflowStyles.th, width: 40, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={allBelowThresholdSelected}
                          onChange={toggleSelectAll}
                          title="Select all students"
                          style={{ cursor: "pointer", width: 16, height: 16 }}
                        />
                      </th>
                    ) : null}
                    <th style={workflowStyles.th}>Student</th>
                    <th style={workflowStyles.th}>Roll No.</th>
                    <th style={workflowStyles.th}>Attendance</th>
                    <th style={workflowStyles.th}>Follow-up</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsBelowThreshold.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isCourseScoped ? 5 : 4}
                        style={{ ...workflowStyles.td, color: webTheme.colors.textMuted }}
                      >
                        No students below {attendanceThreshold}% with current filters.
                      </td>
                    </tr>
                  ) : (
                    studentsBelowThreshold.map((row) => (
                      <tr key={row.studentId}>
                        {isCourseScoped ? (
                          <td style={{ ...workflowStyles.td, width: 40, textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.has(row.studentId)}
                              onChange={() => toggleStudentSelection(row.studentId)}
                              style={{ cursor: "pointer", width: 16, height: 16 }}
                            />
                          </td>
                        ) : null}
                        <td style={workflowStyles.td}>
                          <strong>{row.title}</strong>
                        </td>
                        <td
                          style={{
                            ...workflowStyles.td,
                            color: webTheme.colors.textMuted,
                            fontSize: 13,
                          }}
                        >
                          {row.supportingLabel || "—"}
                        </td>
                        <td style={workflowStyles.td}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 15,
                              color:
                                row.attendancePercentage < 50
                                  ? webTheme.colors.danger
                                  : row.attendancePercentage < 75
                                    ? webTheme.colors.warning
                                    : webTheme.colors.success,
                            }}
                          >
                            {row.attendancePercentage}%
                          </div>
                          <div style={{ color: webTheme.colors.textSubtle, marginTop: 4 }}>
                            {row.sessionSummary}
                          </div>
                        </td>
                        <td style={workflowStyles.td}>
                          {row.emailSentCount > 0 ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 13,
                                fontWeight: 600,
                                color: webTheme.colors.accent,
                              }}
                            >
                              {row.emailSentCount} sent
                            </span>
                          ) : (
                            <span style={{ fontSize: 13, color: webTheme.colors.textMuted }}>
                              None
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {exportSuccess ? (
            <WorkflowBanner
              tone="info"
              message="Export queued. Open Exports to download when ready."
            />
          ) : null}
          {exportToExcelMutation.isError ? (
            <WorkflowBanner
              tone="danger"
              message={
                exportToExcelMutation.error instanceof Error
                  ? exportToExcelMutation.error.message
                  : "Failed to queue export."
              }
            />
          ) : null}
        </>
      )}
    </div>
  )
}
