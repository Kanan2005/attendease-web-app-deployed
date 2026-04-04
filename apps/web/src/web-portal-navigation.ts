import type { WebPortalNavItem } from "./web-portal-types"

export const teacherPortalNavigation: WebPortalNavItem[] = [
  {
    href: "/teacher/classrooms",
    label: "Classrooms",
    description: "Manage course setup, sessions, and attendance reports.",
  },
]

export const adminPortalNavigation: WebPortalNavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    description: "Overview of students, teachers, classrooms, and pending actions.",
  },
  {
    href: "/admin/students",
    label: "Students",
    description: "Search, view, and manage student accounts and statuses.",
  },
  {
    href: "/admin/teachers",
    label: "Teachers",
    description: "View teacher records, departments, and classroom assignments.",
  },
  {
    href: "/admin/devices",
    label: "Devices",
    description: "Review pending device requests and manage device bindings.",
  },
  {
    href: "/admin/classrooms",
    label: "Classrooms",
    description: "Browse classrooms and manage archive operations.",
  },
  {
    href: "/admin/semesters",
    label: "Semesters",
    description: "Create, activate, and archive academic semesters.",
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
