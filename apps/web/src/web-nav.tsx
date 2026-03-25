"use client"

import { webTheme } from "@attendease/ui-web"
import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import { useTheme } from "./theme-context"
import { isPortalNavItemActive } from "./web-portal"
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
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close()
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close()
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKeyDown)
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
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: `1px solid ${webTheme.colors.borderStrong}`,
          background: webTheme.colors.accentSoft,
          color: webTheme.colors.accent,
          fontSize: 12,
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
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute",
              top: 44,
              right: 0,
              minWidth: 220,
              borderRadius: 14,
              background: webTheme.colors.surfaceRaised,
              backdropFilter: webTheme.blur.glass,
              WebkitBackdropFilter: webTheme.blur.glass,
              border: `1px solid ${webTheme.colors.borderStrong}`,
              boxShadow: webTheme.shadow.hero,
              padding: 6,
              zIndex: 200,
            }}
          >
            <div
              style={{ padding: "12px 14px", borderBottom: `1px solid ${webTheme.colors.border}` }}
            >
              <p style={{ margin: 0, fontWeight: 600, color: webTheme.colors.text, fontSize: 14 }}>
                {displayName}
              </p>
              {props.session?.email ? (
                <p style={{ margin: "2px 0 0", color: webTheme.colors.textMuted, fontSize: 13 }}>
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
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {formatRoleLabel(props.session.activeRole)}
                </span>
              ) : null}
            </div>

            <div role="menu" style={{ padding: "4px 0" }}>
              <a
                href={`/${props.scopeLabel.toLowerCase()}/dashboard`}
                onClick={close}
                role="menuitem"
                className="dropdown-item"
                style={dropdownItemStyle}
              >
                Dashboard
              </a>
              {props.scopeLabel === "Teacher" ? (
                <a
                  href="/teacher/profile"
                  onClick={close}
                  role="menuitem"
                  className="dropdown-item"
                  style={dropdownItemStyle}
                >
                  My Profile
                </a>
              ) : null}
              <div style={{ height: 1, background: webTheme.colors.border, margin: "4px 0" }} />
              <a
                href="/logout"
                onClick={close}
                role="menuitem"
                className="dropdown-item"
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
  padding: "9px 14px",
  borderRadius: 8,
  color: webTheme.colors.textMuted,
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  transition: `background ${webTheme.animation.fast}`,
}

export function WebNavLinks(props: {
  items: Array<{ href: string; label: string; description: string }>
}) {
  const pathname = usePathname() ?? ""

  return (
    <div className="ae-nav-links" style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {props.items.map((item) => {
        const active = isPortalNavItemActive(pathname, item.href)
        return (
          <a
            key={item.href}
            href={item.href}
            className="nav-link-item"
            title={item.description}
            aria-current={active ? "page" : undefined}
            style={{
              textDecoration: "none",
              color: active ? webTheme.colors.text : webTheme.colors.textSubtle,
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              padding: "6px 10px",
              borderRadius: 8,
              transition: `all ${webTheme.animation.fast}`,
              whiteSpace: "nowrap" as const,
              background: active ? webTheme.colors.accentSoft : "transparent",
            }}
          >
            {item.label}
          </a>
        )
      })}
    </div>
  )
}

export function WebThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <motion.button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      whileTap={{ scale: 0.88 }}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "dark" ? (
          <motion.span
            key="sun"
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.25 }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ☀️
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.25 }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            🌙
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
