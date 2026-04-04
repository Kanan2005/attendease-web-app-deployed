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
  { href: "/schedule", label: "Schedule", icon: "📅" },
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
  const basePath = pathname.replace(
    /\/(lectures|roster|reports|settings|schedule|imports|stream)(\/.*)?$/,
    "",
  )
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
    <div style={{ display: "grid", gap: 20 }}>
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
          marginBottom: -8,
        }}
      >
        <span aria-hidden>←</span> Back to classrooms
      </Link>

      {/* Header + tab bar merged into one visual block */}
      <div
        style={{
          borderRadius: 16,
          border: "1px solid var(--ae-card-border)",
          background: "var(--ae-card-surface)",
          boxShadow: "var(--ae-card-shadow)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: webTheme.gradients.accentButton,
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--ae-card-glow)",
            pointerEvents: "none",
          }}
        />

        {classroom ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 12,
              padding: "20px 24px 16px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ display: "grid", gap: 2 }}>
              <span
                style={{
                  color: webTheme.colors.accent,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  opacity: 0.8,
                }}
              >
                {classroom.courseCode ?? classroom.code}
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 700,
                  color: webTheme.colors.text,
                  letterSpacing: "-0.02em",
                }}
              >
                {classroom.classroomTitle ?? classroom.displayTitle}
              </h2>
              {[classroom.semesterTitle, classroom.classTitle, classroom.subjectTitle]
                .filter(Boolean)
                .join(" · ") || classroom.semesterLabel ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: webTheme.colors.textMuted,
                    marginTop: 2,
                  }}
                >
                  {[classroom.semesterTitle, classroom.classTitle, classroom.subjectTitle]
                    .filter(Boolean)
                    .join(" · ") ||
                    classroom.semesterLabel ||
                    ""}
                </p>
              ) : null}
            </div>
            {classroom.activeJoinCode?.code ? (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: webTheme.colors.textMuted,
                  background: "rgba(167, 139, 250, 0.08)",
                  border: "1px solid rgba(167, 139, 250, 0.15)",
                  borderRadius: 999,
                  padding: "4px 12px",
                  fontFamily: "monospace",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  position: "relative",
                  zIndex: 1,
                }}
                title="Join code"
              >
                {classroom.activeJoinCode.code}
              </span>
            ) : null}
          </div>
        ) : null}

        <nav
          role="tablist"
          className="ae-tab-bar"
          style={{
            display: "flex",
            gap: 0,
            borderTop: "1px solid var(--ae-card-border)",
            padding: "0 12px",
            position: "relative",
            zIndex: 1,
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
                  padding: "12px 20px",
                  textDecoration: "none",
                  color: isActive ? webTheme.colors.text : webTheme.colors.textSubtle,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: "-0.01em",
                  transition: `color ${webTheme.animation.fast}, background-color 0.2s ease`,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  zIndex: 1,
                }}
              >
                {tab.label}
                {isActive ? (
                  <motion.div
                    layoutId="tab-indicator"
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 12,
                      right: 12,
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
      </div>

      <div style={{ paddingBottom: 48 }}>{props.children}</div>
    </div>
  )
}
