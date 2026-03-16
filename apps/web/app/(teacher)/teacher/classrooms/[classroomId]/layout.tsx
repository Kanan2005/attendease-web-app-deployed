"use client"

import { webTheme } from "@attendease/ui-web"
import { motion } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

const tabs = [
  { href: "", label: "Overview" },
  { href: "/lectures", label: "Lectures" },
  { href: "/roster", label: "Students" },
  { href: "/stream", label: "Announcements" },
  { href: "/schedule", label: "Schedule" },
] as const

export default function ClassroomDetailLayout(props: {
  children: ReactNode
  params: { classroomId: string }
}) {
  const pathname = usePathname() ?? ""
  const basePath = pathname.replace(/\/(lectures|roster|stream|schedule|imports)$/, "")

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <nav
        style={{
          display: "flex",
          gap: 4,
          borderBottom: `1px solid ${webTheme.colors.border}`,
          paddingBottom: 0,
        }}
      >
        {tabs.map((tab) => {
          const tabPath = basePath + tab.href
          const isActive = tab.href === ""
            ? pathname === basePath || pathname === `${basePath}/`
            : pathname.startsWith(tabPath)

          return (
            <Link
              key={tab.href}
              href={tabPath}
              style={{
                position: "relative",
                padding: "10px 20px",
                textDecoration: "none",
                color: isActive ? webTheme.colors.text : webTheme.colors.textSubtle,
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                transition: `color ${webTheme.animation.fast}`,
              }}
            >
              {tab.label}
              {isActive ? (
                <motion.div
                  layoutId="tab-indicator"
                  style={{
                    position: "absolute",
                    bottom: -1,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: webTheme.colors.accent,
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
