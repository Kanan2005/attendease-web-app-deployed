"use client"

import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"

import { AuthApiClientError } from "@attendease/auth"

import {
  buildTeacherWebRosterAddRequest,
  buildTeacherWebRosterFilters,
} from "../teacher-roster-management"
import { webWorkflowQueryKeys } from "../web-workflows"

import {
  WorkflowBanner,
  WorkflowField,
  WorkflowStateCard,
  bootstrap,
  workflowStyles,
} from "./shared"
import { TeacherRosterStudentsCard } from "./teacher-roster-workspace/students-card"

interface BulkUploadResult {
  total: number
  added: number
  skipped: string[]
}

function parseEmailsFromText(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
  const matches = text.match(emailRegex) ?? []
  return [...new Set(matches.map((e) => e.toLowerCase()))]
}

export function TeacherRosterWorkspace(props: {
  accessToken: string | null
  classroomId: string
}) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [statusMessage, setStatusMessage] = useState<{
    tone: "info" | "danger"
    text: string
  } | null>(null)
  const [search, setSearch] = useState("")
  const [studentEmail, setStudentEmail] = useState("")
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkUploadResult | null>(null)

  const rosterFilters = buildTeacherWebRosterFilters({
    searchText: search,
    statusFilter: "ACTIVE",
  })

  const rosterQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classroomRoster(props.classroomId, rosterFilters),
    enabled: Boolean(props.accessToken),
    queryFn: () =>
      bootstrap.authClient.listClassroomRoster(
        props.accessToken ?? "",
        props.classroomId,
        rosterFilters,
      ),
  })

  const addMember = useMutation({
    mutationFn: async () => {
      if (!props.accessToken) throw new Error("Sign in to add students.")
      if (!studentEmail.trim()) throw new Error("Enter a student email address.")
      return bootstrap.authClient.addClassroomRosterMember(
        props.accessToken,
        props.classroomId,
        buildTeacherWebRosterAddRequest({
          lookup: studentEmail.trim(),
          membershipStatus: "ACTIVE",
        }),
      )
    },
    onSuccess: async (member) => {
      setStatusMessage({
        tone: "info",
        text: `Added ${member.studentName ?? member.studentDisplayName}.`,
      })
      setStudentEmail("")
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.classroomRoster(props.classroomId),
      })
    },
    onError: (error) => {
      let text = "Failed to add student."
      if (error instanceof AuthApiClientError) {
        const details = error.details as Record<string, unknown> | undefined
        if (error.status === 404) text = "No student found with that email address."
        else text = typeof details?.message === "string" ? details.message : error.message
      } else if (error instanceof Error) {
        text = error.message
      }
      setStatusMessage({ tone: "danger", text })
    },
  })

  const removeMember = useMutation({
    mutationFn: async (enrollmentId: string) => {
      if (!props.accessToken) throw new Error("Sign in to remove students.")
      return bootstrap.authClient.removeClassroomRosterMember(
        props.accessToken,
        props.classroomId,
        enrollmentId,
      )
    },
    onSuccess: async () => {
      setStatusMessage({ tone: "info", text: "Student removed." })
      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.classroomRoster(props.classroomId),
      })
    },
    onError: (error) => {
      let text = "Failed to remove student."
      if (error instanceof AuthApiClientError) {
        const details = error.details as Record<string, unknown> | undefined
        text = typeof details?.message === "string" ? details.message : error.message
      } else if (error instanceof Error) {
        text = error.message
      }
      setStatusMessage({ tone: "danger", text })
    },
  })

  async function handleBulkUpload(file: File) {
    if (!props.accessToken) return
    setBulkUploading(true)
    setBulkResult(null)
    setStatusMessage(null)

    try {
      const text = await file.text()
      const emails = parseEmailsFromText(text)

      if (emails.length === 0) {
        setStatusMessage({
          tone: "danger",
          text: "No valid email addresses found in the uploaded file.",
        })
        setBulkUploading(false)
        return
      }

      const rows = emails.map((email) => ({ studentEmail: email }))
      const importJob = await bootstrap.authClient.createRosterImportJob(
        props.accessToken,
        props.classroomId,
        { sourceFileName: file.name, rows },
      )

      const appliedJob = await bootstrap.authClient.applyRosterImportJob(
        props.accessToken,
        props.classroomId,
        importJob.id,
      )

      const skipped: string[] = []
      if (appliedJob.rows) {
        for (const row of appliedJob.rows) {
          if (row.status !== "APPLIED" && row.studentEmail) {
            skipped.push(`${row.studentEmail}${row.errorMessage ? ` — ${row.errorMessage}` : ""}`)
          }
        }
      }

      setBulkResult({
        total: emails.length,
        added: appliedJob.appliedRows,
        skipped,
      })

      await queryClient.invalidateQueries({
        queryKey: webWorkflowQueryKeys.classroomRoster(props.classroomId),
      })
    } catch (error) {
      setStatusMessage({
        tone: "danger",
        text: error instanceof Error ? error.message : "Bulk upload failed.",
      })
    } finally {
      setBulkUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  if (!props.accessToken) {
    return <WorkflowStateCard message="Sign in to manage students." />
  }

  const members = rosterQuery.data ?? []
  const filteredMembers = search.trim()
    ? members.filter((m) => {
        const q = search.toLowerCase()
        return (
          (m.studentName ?? m.studentDisplayName ?? "").toLowerCase().includes(q) ||
          (m.studentEmail ?? "").toLowerCase().includes(q) ||
          (m.studentIdentifier ?? "").toLowerCase().includes(q)
        )
      })
    : members

  return (
    <div style={workflowStyles.grid}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: webTheme.colors.text,
              letterSpacing: "-0.02em",
            }}
          >
            Students
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: webTheme.colors.textMuted }}>
            {members.length} enrolled student{members.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleBulkUpload(file)
            }}
          />
          <button
            type="button"
            className="ui-secondary-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={bulkUploading}
            style={{
              ...workflowStyles.secondaryButton,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {bulkUploading ? "Uploading..." : "↑ Upload student list"}
          </button>
        </div>
      </div>

      {/* Add student + search row */}
      <div
        style={{
          borderRadius: webTheme.radius.card,
          border: `1px solid ${webTheme.colors.border}`,
          background: webTheme.colors.surfaceRaised,
          padding: "16px 20px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr auto",
          gap: 12,
          alignItems: "end",
        }}
      >
        <WorkflowField
          label="Add by email"
          value={studentEmail}
          onChange={setStudentEmail}
          placeholder="student@school.edu"
        />
        <WorkflowField
          label="Search"
          value={search}
          onChange={setSearch}
          placeholder="Name or email..."
        />
        <button
          type="button"
          className="ui-primary-btn"
          onClick={() => addMember.mutate()}
          disabled={addMember.isPending || !studentEmail.trim()}
          style={workflowStyles.primaryButton}
        >
          {addMember.isPending ? "Adding..." : "+ Add"}
        </button>
      </div>

      {statusMessage ? (
        <WorkflowBanner tone={statusMessage.tone} message={statusMessage.text} />
      ) : null}

      {bulkResult ? (
        <div
          style={{
            borderRadius: 10,
            border: `1px solid ${bulkResult.skipped.length > 0 ? webTheme.colors.warningBorder : webTheme.colors.successBorder}`,
            background:
              bulkResult.skipped.length > 0
                ? webTheme.colors.warningSoft
                : webTheme.colors.successSoft,
            padding: "14px 18px",
            fontSize: 14,
          }}
        >
          <p style={{ margin: "0 0 4px", fontWeight: 600, color: webTheme.colors.text }}>
            Bulk upload complete — {bulkResult.added} of {bulkResult.total} students added
          </p>
          {bulkResult.skipped.length > 0 ? (
            <div style={{ marginTop: 8 }}>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: webTheme.colors.warning,
                }}
              >
                Skipped ({bulkResult.skipped.length}):
              </p>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: 13,
                  color: webTheme.colors.textMuted,
                  lineHeight: 1.7,
                }}
              >
                {bulkResult.skipped.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setBulkResult(null)}
            style={{
              marginTop: 10,
              border: "none",
              background: "transparent",
              color: webTheme.colors.textSubtle,
              fontSize: 12,
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <TeacherRosterStudentsCard
        members={filteredMembers}
        loading={rosterQuery.isLoading}
        error={rosterQuery.error}
        removePending={removeMember.isPending}
        onRemove={(enrollmentId) => removeMember.mutate(enrollmentId)}
        hasSearchFilter={Boolean(search.trim())}
      />
    </div>
  )
}
