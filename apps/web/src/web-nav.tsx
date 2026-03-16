"use client"

import { webTheme } from "@attendease/ui-web"
import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useEffect, useRef, useState } from "react"

import type { WebPortalSession } from "./web-portal"

function formatRoleLabel(value: string): string {
  switch (value) {
    case "ADMIN":
      return "Admin"
    case "TEACHER":
      return "Teacher"
    case "STUDENT":
      return "Student"
    default:
      return value
  }
}

export function WebProfileDropdown(props: {
  session: WebPortalSession | null
  scopeLabel: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close()
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick)
      return () => document.removeEventListener("mousedown", handleClick)
    }
  }, [open, close])

  const displayName =
    props.session?.displayName?.trim() || props.session?.email?.trim() || "Account"
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: `1px solid ${webTheme.colors.borderStrong}`,
          background: webTheme.colors.surfaceTint,
          color: webTheme.colors.accent,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: `all ${webTheme.animation.fast}`,
        }}
      >
        {initials}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute",
              top: 48,
              right: 0,
              minWidth: 240,
              borderRadius: webTheme.radius.card,
              background: "rgba(30, 30, 30, 0.95)",
              backdropFilter: webTheme.blur.glass,
              WebkitBackdropFilter: webTheme.blur.glass,
              border: `1px solid ${webTheme.colors.borderStrong}`,
              boxShadow: webTheme.shadow.hero,
              padding: 8,
              zIndex: 200,
            }}
          >
            <div style={{ padding: "12px 14px", borderBottom: `1px solid ${webTheme.colors.border}` }}>
              <p style={{ margin: 0, fontWeight: 600, color: webTheme.colors.text, fontSize: 14 }}>
                {displayName}
              </p>
              {props.session?.email ? (
                <p style={{ margin: "4px 0 0", color: webTheme.colors.textMuted, fontSize: 13 }}>
                  {props.session.email}
                </p>
              ) : null}
              {props.session?.activeRole ? (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 8,
                    padding: "3px 10px",
                    borderRadius: webTheme.radius.pill,
                    background: webTheme.colors.accentSoft,
                    color: webTheme.colors.accent,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  {formatRoleLabel(props.session.activeRole)}
                </span>
              ) : null}
            </div>

            <div style={{ padding: "4px 0" }}>
              <a
                href={`/${props.scopeLabel.toLowerCase()}/dashboard`}
                onClick={close}
                style={dropdownItemStyle}
              >
                Dashboard
              </a>
              <a
                href={props.scopeLabel === "Admin" ? "/admin/login" : "/login"}
                onClick={close}
                style={{ ...dropdownItemStyle, color: webTheme.colors.danger }}
              >
                Sign out
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

const dropdownItemStyle: React.CSSProperties = {
  display: "block",
  padding: "10px 14px",
  borderRadius: 10,
  color: webTheme.colors.textMuted,
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  transition: `background ${webTheme.animation.fast}`,
}

export function WebPortalNav(props: { navItems: Array<{ href: string; label: string; description: string }> }) {
  return null
}
