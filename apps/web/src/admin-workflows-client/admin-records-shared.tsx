"use client"

import { webTheme } from "@attendease/ui-web"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useEffect, useState } from "react"

import { adminWorkflowRoutes, webWorkflowQueryKeys } from "../web-workflows"
import { bootstrap, styles } from "./shared"

export type RecordsBreadcrumbStep = {
  label: string
  href?: string
}

export function RecordsBreadcrumb(props: { steps: RecordsBreadcrumbStep[] }) {
  return (
    <nav
      aria-label="Records breadcrumb"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        fontSize: 13,
        color: webTheme.colors.textMuted,
      }}
    >
      <Link
        href={adminWorkflowRoutes.records}
        style={{ color: webTheme.colors.textMuted, textDecoration: "none" }}
      >
        Records
      </Link>
      {props.steps.map((step, index) => (
        <span
          key={`${step.label}-${index}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <span style={{ opacity: 0.6 }}>›</span>
          {step.href ? (
            <Link
              href={step.href}
              style={{ color: webTheme.colors.textMuted, textDecoration: "none" }}
            >
              {step.label}
            </Link>
          ) : (
            <span style={{ color: webTheme.colors.text, fontWeight: 600 }}>{step.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export function RecordsCourseSearch(props: { accessToken: string | null }) {
  const [input, setInput] = useState("")
  const [submitted, setSubmitted] = useState("")

  // Debounce: when input stops changing for 250ms, submit.
  useEffect(() => {
    const trimmed = input.trim()
    if (trimmed.length < 2) {
      setSubmitted("")
      return
    }
    const handle = window.setTimeout(() => {
      setSubmitted(trimmed)
    }, 250)
    return () => window.clearTimeout(handle)
  }, [input])

  const searchQuery = useQuery({
    queryKey: webWorkflowQueryKeys.adminRecordsCourseSearch(submitted),
    enabled: Boolean(props.accessToken && submitted),
    queryFn: () =>
      bootstrap.authClient.searchAdminRecordsCourses(props.accessToken ?? "", {
        q: submitted,
        limit: 8,
      }),
  })

  const isShowing = Boolean(submitted)
  const hits = searchQuery.data?.hits ?? []

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 480 }}>
      <input
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Search course code or title (e.g. CS101, Maths)"
        aria-label="Search courses by code or title"
        style={styles.input}
      />
      {isShowing ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 30,
            background: webTheme.colors.surfaceRaised,
            border: `1px solid ${webTheme.colors.border}`,
            borderRadius: webTheme.radius.button,
            boxShadow: webTheme.shadow.card,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {searchQuery.isPending ? (
            <div style={{ padding: 12, fontSize: 13, color: webTheme.colors.textMuted }}>
              Searching…
            </div>
          ) : searchQuery.isError ? (
            <div style={{ padding: 12, fontSize: 13, color: webTheme.colors.danger }}>
              Failed to load matches.
            </div>
          ) : hits.length === 0 ? (
            <div style={{ padding: 12, fontSize: 13, color: webTheme.colors.textMuted }}>
              No matching courses.
            </div>
          ) : (
            hits.map((hit) => (
              <Link
                key={hit.courseOfferingId}
                href={adminWorkflowRoutes.recordsCourse(
                  hit.department ?? "Unassigned",
                  hit.primaryTeacherId,
                  hit.courseOfferingId,
                )}
                style={{
                  display: "grid",
                  gap: 4,
                  padding: "10px 12px",
                  textDecoration: "none",
                  color: webTheme.colors.text,
                  borderTop: `1px solid ${webTheme.colors.surfaceMuted}`,
                }}
                onClick={() => {
                  setInput("")
                  setSubmitted("")
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ fontSize: 14 }}>{hit.code}</strong>
                  <span style={{ fontSize: 12, color: webTheme.colors.textMuted }}>
                    {hit.status === "ARCHIVED" ? "ARCHIVED" : ""}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: webTheme.colors.textMuted }}>
                  {hit.displayTitle}
                </div>
                <div style={{ fontSize: 12, color: webTheme.colors.textSubtle }}>
                  {hit.primaryTeacherName} · {hit.department ?? "Unassigned"}
                </div>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

export function PercentBadge(props: { value: number | null }) {
  const value = props.value
  if (value === null) {
    return <span style={{ color: webTheme.colors.textMuted, fontSize: 13 }}>—</span>
  }
  const tone =
    value >= 75
      ? webTheme.colors.success
      : value >= 60
        ? webTheme.colors.warning
        : webTheme.colors.danger
  return <span style={{ color: tone, fontWeight: 700 }}>{value.toFixed(1)}%</span>
}

export function ArchivedPill() {
  return (
    <span
      style={{
        ...styles.pill,
        background: webTheme.colors.surfaceMuted,
        borderColor: webTheme.colors.border,
        color: webTheme.colors.textMuted,
        padding: "4px 10px",
        fontSize: 11,
      }}
    >
      Archived
    </span>
  )
}
