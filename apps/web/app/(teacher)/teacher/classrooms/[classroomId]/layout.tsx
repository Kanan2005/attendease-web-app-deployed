"use client"

import { webTheme } from "@attendease/ui-web"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { type ReactNode, useMemo, useRef } from "react"

import { createWebAuthBootstrap } from "../../../../../src/auth"
import { webWorkflowQueryKeys } from "../../../../../src/web-workflows"

const layoutBootstrap = createWebAuthBootstrap(process.env as Record<string, string | undefined>)

const tabs = [
  { href: "/lectures", label: "Sessions", icon: "📋" },
  { href: "/roster", label: "Students", icon: "👥" },
  { href: "/stream", label: "Announcements", icon: "📢" },
  { href: "/reports", label: "Reports", icon: "📊" },
] as const

/**
 * Remembers the last visited URL under each tab so that switching tabs and
 * coming back restores the previous sub-page (e.g. a lecture detail page).
 */
function useTabMemory(basePath: string, pathname: string) {
  const memory = useRef<Record<string, string>>({})

  // On every render, record the current pathname under its owning tab prefix.
  for (const tab of tabs) {
    const prefix = basePath + tab.href
    if (pathname.startsWith(prefix)) {
      memory.current[tab.href] = pathname
      break
    }
  }

  return (tabHref: string): string => memory.current[tabHref] ?? basePath + tabHref
}

export default function ClassroomDetailLayout(props: {
  children: ReactNode
  params: Promise<{ classroomId: string }>
}) {
  const pathname = usePathname() ?? ""
  const basePath = pathname.replace(/\/(lectures|roster|reports|settings|schedule|imports|stream)(\/.*)?$/, "")
  const resolveTabHref = useTabMemory(basePath, pathname)

  const classroomId = useMemo(() => {
    const segments = basePath.split("/")
    return segments[segments.length - 1] ?? ""
  }, [basePath])

  const classroomsQuery = useQuery({
    queryKey: webWorkflowQueryKeys.classrooms({}),
    queryFn: () => layoutBootstrap.authClient.listClassrooms("", {}),
    enabled: false,
    staleTime: Number.POSITIVE_INFINITY,
  })

  const classroom = useMemo(
    () => classroomsQuery.data?.find((c) => c.id === classroomId) ?? null,
    [classroomsQuery.data, classroomId],
  )

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Link
        href="/teacher/classrooms"
        className="ui-back-link"
        style={{
          fontSize: 13,
          color: webTheme.colors.textMuted,
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: -12,
        }}
      >
        <span aria-hidden>←</span> Back to classrooms
      </Link>

      {classroom ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
            padding: "20px 24px",
            borderRadius: webTheme.radius.card,
            background: webTheme.colors.surfaceRaised,
            border: `1px solid ${webTheme.colors.border}`,
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <span
              style={{
                color: webTheme.colors.accent,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {classroom.courseCode ?? classroom.code}
            </span>
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: webTheme.colors.text,
                letterSpacing: "-0.02em",
              }}
            >
              {classroom.classroomTitle ?? classroom.displayTitle}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: webTheme.colors.textMuted,
              }}
            >
              {[classroom.semesterTitle, classroom.classTitle, classroom.subjectTitle]
                .filter(Boolean)
                .join(" · ") || classroom.semesterLabel || ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            {classroom.activeJoinCode?.code ? (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: webTheme.colors.textMuted,
                  background: webTheme.colors.surfaceMuted,
                  border: `1px solid ${webTheme.colors.border}`,
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontFamily: "monospace",
                }}
                title="Join code"
              >
                {classroom.activeJoinCode.code}
              </span>
            ) : null}
            <Link
              href="/teacher/sessions/start"
              className="ui-primary-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                background: webTheme.gradients.accentButton,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Start Session
            </Link>
          </div>
        </div>
      ) : null}

      <nav
        role="tablist"
        className="ae-tab-bar"
        style={{
          display: "flex",
          gap: 2,
          borderBottom: `1px solid ${webTheme.colors.border}`,
          background: webTheme.colors.surfaceRaised,
          borderRadius: "12px 12px 0 0",
          padding: "0 8px",
        }}
      >
        {tabs.map((tab) => {
          const tabPrefix = basePath + tab.href
          const isActive = pathname.startsWith(tabPrefix)
          const href = isActive ? pathname : resolveTabHref(tab.href)

          return (
            <Link
              key={tab.href}
              href={href}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              className="ui-tab-link"
              style={{
                position: "relative",
                padding: "14px 24px",
                textDecoration: "none",
                color: isActive ? webTheme.colors.text : webTheme.colors.textSubtle,
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                letterSpacing: "-0.01em",
                transition: `color ${webTheme.animation.fast}`,
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span style={{ fontSize: 13 }}>{tab.icon}</span>
              {tab.label}
              {isActive ? (
                <motion.div
                  layoutId="tab-indicator"
                  style={{
                    position: "absolute",
                    bottom: -1,
                    left: 8,
                    right: 8,
                    height: 2,
                    background: webTheme.gradients.accentButton,
                    borderRadius: 999,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div>{props.children}</div>
    </div>
  )
}
