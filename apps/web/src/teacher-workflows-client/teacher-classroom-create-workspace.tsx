"use client"

import type { AttendanceMode } from "@attendease/contracts"
import { webTheme } from "@attendease/ui-web"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { AuthApiClientError } from "@attendease/auth"
import { createWebAuthBootstrap } from "../auth"
import {
  CLASSROOM_DEGREE_OPTIONS,
  CLASSROOM_SEMESTER_OPTIONS,
  CLASSROOM_STREAM_OPTIONS,
  buildTeacherWebClassroomCreateRequest,
  buildTeacherWebClassroomScopeOptions,
  createTeacherWebClassroomCreateDraft,
} from "../teacher-classroom-management"
import { extractApiErrorMessage } from "../teacher-review-workflows-shared"
import { teacherWorkflowRoutes, webWorkflowQueryKeys } from "../web-workflows"

import {
  WorkflowBanner,
  WorkflowField,
  WorkflowStateCard,
  bootstrap,
  workflowStyles,
} from "./shared"

export function TeacherClassroomCreateWorkspace(props: {
  accessToken: string | null
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [statusMessage, setStatusMessage] = useState<{ tone: "info" | "danger"; text: string } | null>(null)
  const [draft, setDraft] = useState(() => createTeacherWebClassroomCreateDraft())

  const assignmentsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.teacherAssignments(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listMyAssignments(props.accessToken ?? ""),
  })

  const existingClassroomsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classrooms(),
    enabled: Boolean(props.accessToken),
    queryFn: () => bootstrap.authClient.listClassrooms(props.accessToken ?? ""),
  })

  const allScopeOptions = buildTeacherWebClassroomScopeOptions(assignmentsQuery.data ?? [])

  const usedScopeKeys = new Set(
    (existingClassroomsQuery.data ?? []).map(
      (c) => `${c.semesterId}|${c.classId}|${c.sectionId}|${c.subjectId}`,
    ),
  )
  const scopeOptions = allScopeOptions.filter(
    (s) => !usedScopeKeys.has(`${s.semesterId}|${s.classId}|${s.sectionId}|${s.subjectId}`),
  )

  const firstScopeKey = scopeOptions[0]?.key ?? ""

  useEffect(() => {
    if (draft.selectedScopeKey || !firstScopeKey) return
    setDraft((current) =>
      current.selectedScopeKey ? current : { ...current, selectedScopeKey: firstScopeKey },
    )
  }, [draft.selectedScopeKey, firstScopeKey])

  const createClassroom = useMutation({
    mutationFn: async () => {
      if (!props.accessToken) throw new Error("Sign in to create a classroom.")
      return bootstrap.authClient.createClassroom(
        props.accessToken,
        buildTeacherWebClassroomCreateRequest(scopeOptions, draft),
      )
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: webWorkflowQueryKeys.classrooms() })
      router.push(teacherWorkflowRoutes.classroomDetail(created.id))
    },
    onError: (error) => {
      let text = "Failed to create classroom."
      if (error instanceof AuthApiClientError) {
        const apiMsg = extractApiErrorMessage(error.details)
        if (error.status === 409) {
          text = apiMsg ?? "A classroom with that code or scope already exists."
        } else if (error.status === 403) {
          text = apiMsg ?? "You don't have permission to create a classroom for this scope."
        } else {
          text = apiMsg ?? error.message
        }
      } else if (error instanceof Error) {
        text = error.message
      }
      setStatusMessage({ tone: "danger", text })
    },
  })

  if (!props.accessToken) {
    return <WorkflowStateCard message="Sign in to create a classroom." />
  }

  if (assignmentsQuery.isLoading || existingClassroomsQuery.isLoading) {
    return <WorkflowStateCard message="Loading..." />
  }

  if (assignmentsQuery.isError) {
    return (
      <WorkflowBanner
        tone="danger"
        message={
          assignmentsQuery.error instanceof Error
            ? assignmentsQuery.error.message
            : "Failed to load teaching scopes."
        }
      />
    )
  }

  if (allScopeOptions.length === 0) {
    return <WorkflowStateCard message="No teaching scope available. Contact your admin." />
  }

  if (scopeOptions.length === 0) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <Link
            href={teacherWorkflowRoutes.classrooms}
            className="ui-back-link"
            style={{ fontSize: 13, color: webTheme.colors.textMuted, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span aria-hidden>←</span> Back to classrooms
          </Link>
        </div>
        <WorkflowBanner
          tone="info"
          message="All available teaching scopes already have classrooms. Contact your admin to get additional scopes assigned."
        />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <Link
          href={teacherWorkflowRoutes.classrooms}
          className="ui-back-link"
          style={{
            fontSize: 13,
            color: webTheme.colors.textMuted,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span aria-hidden>←</span> Back to classrooms
        </Link>
      </div>

      <div
        style={{
          borderRadius: webTheme.radius.card,
          border: `1px solid ${webTheme.colors.border}`,
          background: webTheme.colors.surfaceRaised,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 28px", borderBottom: `1px solid ${webTheme.colors.border}` }}>
          <h2 style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 700, color: webTheme.colors.text, letterSpacing: "-0.02em" }}>
            New classroom
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: webTheme.colors.textMuted }}>
            Enter a title and course code. You can add students and configure settings later.
          </p>
        </div>

        <div style={{ padding: "24px 28px", display: "grid", gap: 18 }}>
          <WorkflowField
            label="Course title"
            value={draft.classroomTitle}
            onChange={(value) => setDraft((c) => ({ ...c, classroomTitle: value }))}
            placeholder="e.g. Data Structures"
          />

          <WorkflowField
            label="Course code"
            value={draft.courseCode}
            onChange={(value) => setDraft((c) => ({ ...c, courseCode: value }))}
            placeholder="e.g. CS201"
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <DropdownField
              label="Degree"
              value={draft.degree}
              options={CLASSROOM_DEGREE_OPTIONS}
              onChange={(v) => setDraft((c) => ({ ...c, degree: v }))}
            />
            <DropdownField
              label="Semester"
              value={draft.semester}
              options={CLASSROOM_SEMESTER_OPTIONS}
              onChange={(v) => setDraft((c) => ({ ...c, semester: v }))}
            />
            <DropdownField
              label="Stream"
              value={draft.stream}
              options={CLASSROOM_STREAM_OPTIONS}
              onChange={(v) => setDraft((c) => ({ ...c, stream: v }))}
            />
          </div>

          {statusMessage ? (
            <WorkflowBanner tone={statusMessage.tone} message={statusMessage.text} />
          ) : null}
        </div>

        <div
          style={{
            padding: "16px 28px",
            borderTop: `1px solid ${webTheme.colors.border}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            background: webTheme.colors.surfaceMuted,
          }}
        >
          <Link
            href={teacherWorkflowRoutes.classrooms}
            className="ui-secondary-btn"
            style={workflowStyles.secondaryButton}
          >
            Cancel
          </Link>
          <button
            type="button"
            className="ui-primary-btn"
            onClick={() => createClassroom.mutate()}
            disabled={createClassroom.isPending || !draft.classroomTitle.trim() || !draft.courseCode.trim()}
            style={workflowStyles.primaryButton}
          >
            {createClassroom.isPending ? "Creating..." : "Create classroom"}
          </button>
        </div>
      </div>
    </div>
  )
}

function DropdownField(props: {
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          color: webTheme.colors.textMuted,
          marginBottom: 6,
        }}
      >
        {props.label}
      </label>
      <div style={{ position: "relative" }}>
        <select
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 32px 10px 12px",
            fontSize: 14,
            borderRadius: 8,
            border: `1px solid ${webTheme.colors.borderStrong}`,
            background: webTheme.colors.surfaceMuted,
            color: webTheme.colors.text,
            outline: "none",
            appearance: "none",
            cursor: "pointer",
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          }}
        >
          {props.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            fontSize: 10,
            color: webTheme.colors.textSubtle,
            lineHeight: 1,
          }}
        >
          ▼
        </span>
      </div>
    </div>
  )
}
