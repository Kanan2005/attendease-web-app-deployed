import type { WebPortalNavItem } from "./web-portal-types"

export const teacherPortalNavigation: WebPortalNavItem[] = [
  {
    href: "/teacher/dashboard",
    label: "Dashboard",
    description: "See classrooms, attendance work, and follow-up paths at a glance.",
  },
  {
    href: "/teacher/classrooms",
    label: "Classrooms",
    description: "Manage course setup, students, schedules, and QR launch entrypoints.",
  },
  {
    href: "/teacher/sessions/history",
    label: "Attendance Sessions",
    description: "Start QR attendance, review live sessions, and correct recent marks.",
  },
  {
    href: "/teacher/reports",
    label: "Reports",
    description: "Track attendance by day, subject, and student.",
  },
  {
    href: "/teacher/exports",
    label: "Exports",
    description: "Prepare and download attendance files.",
  },
  {
    href: "/teacher/analytics",
    label: "Analytics",
    description: "Explore patterns before you follow up.",
  },
  {
    href: "/teacher/email-automation",
    label: "Email Automation",
    description: "Review low-attendance reminders and delivery activity.",
  },
]

export const adminPortalNavigation: WebPortalNavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    description: "See support, recovery, imports, and academic governance in one controlled view.",
  },
  {
    href: "/admin/devices?view=support",
    label: "Student Support",
    description:
      "Review account state, classroom context, device state, and recent risk before recovery.",
  },
  {
    href: "/admin/devices",
    label: "Device Recovery",
    description:
      "Run verified revoke, clear, and replacement-phone actions with audit-safe reasons.",
  },
  {
    href: "/admin/imports",
    label: "Imports",
    description: "Watch classroom import health and resolve review-required escalations.",
  },
  {
    href: "/admin/semesters",
    label: "Semesters",
    description: "Control semester timing and classroom archive decisions from one audited lane.",
  },
]
export function isPortalNavItemActive(currentPath: string, href: string): boolean {
  const currentLocation = normalizePortalLocation(currentPath)
  const hrefLocation = normalizePortalLocation(href)

  if (currentLocation.path === hrefLocation.path) {
    if (hrefLocation.search.size === 0) {
      return true
    }

    return [...hrefLocation.search.entries()].every(
      ([key, value]) => currentLocation.search.get(key) === value,
    )
  }

  return hrefLocation.search.size === 0 && currentLocation.path.startsWith(`${hrefLocation.path}/`)
}
function normalizePortalLocation(value: string): {
  path: string
  search: URLSearchParams
} {
  const [pathOnly, searchOnly] = value.split("?")

  if (!pathOnly) {
    return {
      path: "/",
      search: new URLSearchParams(searchOnly ?? ""),
    }
  }

  return {
    path: pathOnly.endsWith("/") && pathOnly !== "/" ? pathOnly.slice(0, -1) : pathOnly,
    search: new URLSearchParams(searchOnly ?? ""),
  }
}
