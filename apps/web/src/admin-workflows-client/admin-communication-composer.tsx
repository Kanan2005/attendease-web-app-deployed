"use client"

import type {
  AdminCommunicationAttendanceComparator,
  AdminCommunicationAudiencePreviewRequest,
  AdminCommunicationAudiencePreviewResponse,
  AdminCommunicationAudienceType,
  AdminCommunicationDispatchChannel,
} from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"

import { WebSectionCard } from "../web-shell"
import { webWorkflowQueryKeys } from "../web-workflows"
import { Banner, Field, StateCard, bootstrap, styles } from "./shared"

// Gmail compose URL caps out around ~2KB. To stay safe across browsers and
// avoid being silently truncated, we chunk recipients into batches when
// emailing large audiences.
const GMAIL_BCC_CHUNK = 100
const MAILTO_BCC_CHUNK = 80

type FormState = {
  audience: AdminCommunicationAudienceType
  degree: string
  branch: string
  currentSemester: string
  courseOfferingId: string
  attendanceThresholdPercent: string
  attendanceComparator: AdminCommunicationAttendanceComparator
  subject: string
  body: string
}

const INITIAL_FORM: FormState = {
  audience: "STUDENT",
  degree: "",
  branch: "",
  currentSemester: "",
  courseOfferingId: "",
  attendanceThresholdPercent: "",
  attendanceComparator: "BELOW",
  subject: "",
  body: "",
}

export function AdminCommunicationComposerWorkspace(props: { accessToken: string | null }) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [preview, setPreview] = useState<AdminCommunicationAudiencePreviewResponse | null>(null)

  const filterOptionsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminUsersFilterOptions(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.getAdminUsersFilterOptions(props.accessToken ?? ""),
    staleTime: 120_000,
  })
  const opts = filterOptionsQuery.data

  const previewMutation = useMutation({
    mutationFn: async (): Promise<AdminCommunicationAudiencePreviewResponse> => {
      const payload: AdminCommunicationAudiencePreviewRequest = {
        audience: form.audience,
        ...(form.degree.trim() ? { degree: form.degree.trim() } : {}),
        ...(form.branch.trim() ? { branch: form.branch.trim() } : {}),
        ...(form.currentSemester ? { currentSemester: Number(form.currentSemester) } : {}),
        ...(form.courseOfferingId.trim() ? { courseOfferingId: form.courseOfferingId.trim() } : {}),
        ...(form.attendanceThresholdPercent
          ? {
              attendanceThresholdPercent: Number(form.attendanceThresholdPercent),
              attendanceComparator: form.attendanceComparator,
            }
          : {}),
        sampleLimit: 5,
      }
      return bootstrap.authClient.previewAdminCommunicationAudience(
        props.accessToken ?? "",
        payload,
      )
    },
    onSuccess: (data) => setPreview(data),
  })

  const filtersSummary = useMemo(() => buildFiltersSummary(form), [form])

  function handlePreview() {
    setPreview(null)
    previewMutation.mutate()
  }

  function handleReset() {
    setForm(INITIAL_FORM)
    setPreview(null)
  }

  function logDispatch(channel: AdminCommunicationDispatchChannel, recipientCount: number) {
    if (!props.accessToken) return
    bootstrap.authClient
      .logAdminCommunicationDispatch(props.accessToken, {
        audience: form.audience,
        channel,
        recipientCount,
        subjectPreview: form.subject.trim().slice(0, 240) || "(no subject)",
        filtersSummary,
      })
      .catch(() => undefined)
  }

  function handleOpenGmail() {
    if (!preview || preview.emails.length === 0) return
    const subject = encodeURIComponent(form.subject)
    const body = encodeURIComponent(form.body)
    const chunks = chunk(preview.emails, GMAIL_BCC_CHUNK)
    for (const batch of chunks) {
      const bcc = encodeURIComponent(batch.join(","))
      const url = `https://mail.google.com/mail/?view=cm&fs=1&bcc=${bcc}&su=${subject}&body=${body}`
      window.open(url, "_blank", "noopener,noreferrer")
    }
    logDispatch("GMAIL", preview.emails.length)
  }

  function handleOpenMailto() {
    if (!preview || preview.emails.length === 0) return
    const subject = encodeURIComponent(form.subject)
    const body = encodeURIComponent(form.body)
    const chunks = chunk(preview.emails, MAILTO_BCC_CHUNK)
    for (const batch of chunks) {
      const bcc = encodeURIComponent(batch.join(","))
      const url = `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`
      window.location.href = url
      // Only one mailto: navigation is meaningful per click; if there are
      // overflow chunks, surface a warning to the admin once.
      break
    }
    logDispatch("MAILTO", preview.emails.length)
  }

  const overflowChunks =
    preview && preview.emails.length > MAILTO_BCC_CHUNK
      ? Math.ceil(preview.emails.length / MAILTO_BCC_CHUNK)
      : 0

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <WebSectionCard
        title="Audience filters"
        description="Pick at least one filter so we never accidentally email the entire institution. Combine filters to narrow the audience further."
      >
        <div style={styles.formGrid}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Audience</span>
            <select
              value={form.audience}
              onChange={(event) =>
                setForm({
                  ...form,
                  audience: event.target.value as AdminCommunicationAudienceType,
                })
              }
              style={styles.input}
            >
              <option value="STUDENT">Students</option>
              <option value="PARENT">Parents</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Degree</span>
            <select
              value={form.degree}
              onChange={(e) => setForm({ ...form, degree: e.target.value })}
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
              value={form.branch}
              onChange={(e) => setForm({ ...form, branch: e.target.value })}
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
              value={form.currentSemester}
              onChange={(e) => setForm({ ...form, currentSemester: e.target.value })}
              style={styles.input}
            >
              <option value="">All</option>
              {(opts?.semesters ?? []).map((s) => (
                <option key={s} value={String(s)}>Semester {s}</option>
              ))}
            </select>
          </label>
          <Field
            label="Course ID (optional)"
            value={form.courseOfferingId}
            onChange={(value) => setForm({ ...form, courseOfferingId: value })}
          />
          <Field
            label="Attendance threshold %"
            value={form.attendanceThresholdPercent}
            onChange={(value) => setForm({ ...form, attendanceThresholdPercent: value })}
            type="number"
          />
          <label style={{ display: "grid", gap: 6 }}>
            <span>Threshold comparator</span>
            <select
              value={form.attendanceComparator}
              onChange={(event) =>
                setForm({
                  ...form,
                  attendanceComparator: event.target
                    .value as AdminCommunicationAttendanceComparator,
                })
              }
              style={styles.input}
            >
              <option value="BELOW">Below threshold</option>
              <option value="ABOVE">At or above threshold</option>
            </select>
          </label>
        </div>
        <div style={{ ...styles.buttonRow, marginTop: 16 }}>
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewMutation.isPending}
            style={styles.primaryButton}
          >
            {previewMutation.isPending ? "Resolving audience…" : "Preview audience"}
          </button>
          <button type="button" onClick={handleReset} style={styles.secondaryButton}>
            Reset
          </button>
        </div>
        {previewMutation.isError ? (
          <div style={{ marginTop: 12 }}>
            <Banner
              tone="danger"
              message={
                previewMutation.error instanceof Error
                  ? previewMutation.error.message
                  : "Failed to resolve audience."
              }
            />
          </div>
        ) : null}
      </WebSectionCard>

      {preview ? (
        <WebSectionCard
          title="Audience preview"
          description="Counts and a small sample. Recipients will be hidden from each other via BCC."
        >
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              marginBottom: 16,
            }}
          >
            <Stat label="Audience" value={preview.audience} />
            <Stat label="Students matched" value={preview.studentCount.toString()} />
            <Stat label="Recipients (with email)" value={preview.emailCount.toString()} />
            <Stat
              label={preview.audience === "PARENT" ? "Missing parent email" : "Missing email"}
              value={preview.missingEmailCount.toString()}
              tone={preview.missingEmailCount > 0 ? "warning" : "default"}
            />
          </div>
          {preview.sample.length === 0 ? (
            <StateCard message="No students matched the current filters." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Roll no.</th>
                    <th style={styles.th}>Branch / Sem</th>
                    <th style={styles.th}>Attendance</th>
                    <th style={styles.th}>Email used</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.sample.map((entry) => (
                    <tr key={entry.studentId}>
                      <td style={styles.td}>{entry.displayName}</td>
                      <td style={styles.td}>{entry.rollNumber ?? "—"}</td>
                      <td style={styles.td}>
                        {entry.branch ?? "—"}
                        {entry.currentSemester ? ` · Sem ${entry.currentSemester}` : ""}
                      </td>
                      <td style={styles.td}>
                        {entry.attendancePercent === null
                          ? "—"
                          : `${entry.attendancePercent.toFixed(1)}%`}
                      </td>
                      <td style={styles.td}>
                        {entry.email ?? (
                          <span style={{ color: webTheme.colors.warning, fontSize: 12 }}>
                            missing
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {preview.studentCount > preview.sample.length ? (
            <p style={{ fontSize: 12, color: webTheme.colors.textMuted, marginTop: 8 }}>
              Showing first {preview.sample.length} of {preview.studentCount} matched students. All{" "}
              {preview.emailCount} recipients are included in BCC when you click Send.
            </p>
          ) : null}
        </WebSectionCard>
      ) : null}

      <WebSectionCard
        title="Compose message"
        description="Draft your message below and open it in your mail client."
      >
        <div style={{ display: "grid", gap: 12 }}>
          <Field
            label="Subject"
            value={form.subject}
            onChange={(value) => setForm({ ...form, subject: value })}
          />
          <label style={{ display: "grid", gap: 6 }}>
            <span>Body</span>
            <textarea
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
              rows={8}
              style={{
                ...styles.input,
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: 1.45,
              }}
              placeholder="Write your message. Use plain text — Gmail and Mail will preserve line breaks."
            />
          </label>
        </div>
        <div style={{ ...styles.buttonRow, marginTop: 16 }}>
          <button
            type="button"
            onClick={handleOpenGmail}
            disabled={
              !preview || preview.emails.length === 0 || !form.subject.trim() || !form.body.trim()
            }
            style={styles.primaryButton}
          >
            Open in Gmail
          </button>
          <button
            type="button"
            onClick={handleOpenMailto}
            disabled={
              !preview || preview.emails.length === 0 || !form.subject.trim() || !form.body.trim()
            }
            style={styles.secondaryButton}
          >
            Open in default mail app
          </button>
        </div>
        {preview && preview.emails.length === 0 ? (
          <div style={{ marginTop: 12 }}>
            <Banner
              tone="info"
              message="No recipients with an email address. Adjust the filters or switch audience."
            />
          </div>
        ) : null}
        {overflowChunks > 1 ? (
          <p style={{ fontSize: 12, color: webTheme.colors.textMuted, marginTop: 12 }}>
            Heads-up: {preview?.emails.length} recipients exceed the {MAILTO_BCC_CHUNK}-per-link URL
            safety limit for the default mail app. Gmail will open{" "}
            {Math.ceil((preview?.emails.length ?? 0) / GMAIL_BCC_CHUNK)} compose tabs (one per
            chunk). For the default mail app, only the first chunk opens — copy-paste the remaining
            recipients from the audit log if needed.
          </p>
        ) : null}
      </WebSectionCard>
    </div>
  )
}

function buildFiltersSummary(form: FormState): string {
  const parts: string[] = []
  if (form.degree) parts.push(`degree=${form.degree}`)
  if (form.branch) parts.push(`branch=${form.branch}`)
  if (form.currentSemester) parts.push(`sem=${form.currentSemester}`)
  if (form.courseOfferingId) parts.push(`courseOfferingId=${form.courseOfferingId}`)
  if (form.attendanceThresholdPercent) {
    parts.push(
      `attendance${form.attendanceComparator === "BELOW" ? "<" : "≥"}${form.attendanceThresholdPercent}%`,
    )
  }
  return parts.join(", ") || "(no filters)"
}

function chunk<T>(arr: readonly T[], size: number): T[][] {
  if (arr.length === 0) return []
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size))
  }
  return out
}

function Stat(props: {
  label: string
  value: string
  tone?: "default" | "warning"
}) {
  const color = props.tone === "warning" ? webTheme.colors.warning : webTheme.colors.text
  return (
    <div style={{ ...styles.rowCard, display: "grid", gap: 4 }}>
      <span style={{ fontSize: 11, color: webTheme.colors.textMuted }}>{props.label}</span>
      <strong style={{ fontSize: 18, color }}>{props.value}</strong>
    </div>
  )
}
