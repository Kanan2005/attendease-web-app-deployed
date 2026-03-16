import { findWebContentIssues } from "@attendease/ui-web"
import { describe, expect, it } from "vitest"

import {
  type WebPortalSession,
  adminPortalNavigation,
  buildAdminDashboardPageModel,
  buildAdminDevicesPageModel,
  buildAdminImportsPageModel,
  buildAdminSemesterPageModel,
  buildTeacherAnalyticsPageModel,
  buildTeacherClassroomDetailPageModel,
  buildTeacherClassroomPageModel,
  buildTeacherClassroomRosterPageModel,
  buildTeacherDashboardPageModel,
  buildTeacherReportsPageModel,
  buildTeacherSessionHistoryPageModel,
  buildTeacherSessionStartPageModel,
  evaluateWebPortalAccess,
  isPortalNavItemActive,
  readWebPortalSession,
  teacherPortalNavigation,
  webSessionCookieNames,
} from "./web-portal.js"

describe("web portal models", () => {
  it("reads a protected web session from cookies", () => {
    const cookieStore = new Map<string, string>([
      [webSessionCookieNames.accessToken, "teacher-access-token"],
      [webSessionCookieNames.activeRole, "TEACHER"],
      [webSessionCookieNames.availableRoles, "TEACHER,ADMIN"],
      [webSessionCookieNames.displayName, "Teacher One"],
      [webSessionCookieNames.email, "teacher.one@attendease.dev"],
    ])

    const session = readWebPortalSession({
      get(name: string) {
        const value = cookieStore.get(name)

        return value ? { value } : undefined
      },
    })

    expect(session).toMatchObject({
      accessToken: "teacher-access-token",
      activeRole: "TEACHER",
      availableRoles: ["TEACHER", "ADMIN"],
      displayName: "Teacher One",
    })
  })

  it("protects teacher and admin route groups by role", () => {
    const teacherSession: WebPortalSession = {
      accessToken: "teacher-token",
      activeRole: "TEACHER" as const,
      availableRoles: ["TEACHER"],
      displayName: "Teacher One",
      email: "teacher.one@attendease.dev",
    }

    expect(evaluateWebPortalAccess(teacherSession, "teacher")).toMatchObject({
      allowed: true,
    })
    expect(evaluateWebPortalAccess(teacherSession, "admin")).toMatchObject({
      allowed: false,
      title: "Admin account required",
      loginHref: "/admin/login?next=/admin/dashboard",
      loginLabel: "Open admin sign in",
    })
    expect(evaluateWebPortalAccess(null, "teacher")).toMatchObject({
      allowed: false,
      title: "Sign in required",
      loginHref: "/login?next=/teacher/dashboard",
      loginLabel: "Open teacher sign in",
    })

    const adminSession: WebPortalSession = {
      accessToken: "admin-token",
      activeRole: "ADMIN" as const,
      availableRoles: ["ADMIN", "TEACHER"],
      displayName: "Admin One",
      email: "admin.one@attendease.dev",
    }

    expect(evaluateWebPortalAccess(adminSession, "teacher")).toMatchObject({
      allowed: true,
      title: "Teacher access granted",
    })
    expect(evaluateWebPortalAccess(adminSession, "admin")).toMatchObject({
      allowed: true,
      title: "Admin access granted",
      loginHref: "/admin/login?next=/admin/dashboard",
      loginLabel: "Open admin sign in",
    })
  })

  it("keeps teacher and admin navigation coverage aligned with the planned route tree", () => {
    expect(teacherPortalNavigation.map((item) => item.href)).toEqual([
      "/teacher/dashboard",
      "/teacher/classrooms",
      "/teacher/sessions/history",
      "/teacher/reports",
      "/teacher/exports",
      "/teacher/analytics",
      "/teacher/email-automation",
    ])

    expect(adminPortalNavigation.map((item) => item.href)).toEqual([
      "/admin/dashboard",
      "/admin/devices?view=support",
      "/admin/devices",
      "/admin/imports",
      "/admin/semesters",
    ])
  })

  it("keeps dashboard routing obvious in the teacher portal model", () => {
    const teacherDashboard = buildTeacherDashboardPageModel()
    const adminDashboard = buildAdminDashboardPageModel()
    const adminSupport = buildAdminDevicesPageModel("support")
    const analytics = buildTeacherAnalyticsPageModel()

    expect(teacherDashboard.actions[0]).toMatchObject({
      href: "/teacher/classrooms",
    })
    expect(teacherDashboard.actions[1]).toMatchObject({
      href: "/teacher/sessions/start",
      label: "Start QR attendance",
    })
    expect(teacherDashboard.spotlightSections).toHaveLength(2)
    expect(
      teacherDashboard.spotlightSections?.flatMap((section) =>
        section.cards.map((card) => card.href),
      ),
    ).toEqual([
      "/teacher/classrooms",
      "/teacher/sessions/start",
      "/teacher/sessions/history",
      "/teacher/reports",
      "/teacher/exports",
      "/teacher/analytics",
    ])
    expect(teacherDashboard.tables).toEqual([])
    expect(teacherDashboard.charts).toEqual([])
    expect(teacherDashboard.actions.every((action) => action.href.startsWith("/teacher/"))).toBe(
      true,
    )
    expect(adminDashboard.actions[1]).toMatchObject({
      href: "/admin/devices",
    })
    expect(adminDashboard.actions[3]).toMatchObject({
      href: "/admin/semesters",
      label: "Academic Governance",
    })
    expect(adminDashboard.spotlightSections).toHaveLength(3)
    expect(adminDashboard.actions.every((action) => action.href.startsWith("/admin/"))).toBe(true)
    expect(adminSupport.description).toContain("account")
    expect(adminSupport.metrics.map((metric) => metric.label)).toEqual([
      "Search",
      "Account State",
      "Classroom Context",
      "Next Step",
    ])
    expect(analytics.charts).toHaveLength(2)
  })

  it("marks active teacher navigation items for dashboard and classroom subroutes", () => {
    expect(isPortalNavItemActive("/teacher/dashboard", "/teacher/dashboard")).toBe(true)
    expect(
      isPortalNavItemActive("/teacher/classrooms/classroom_math_1", "/teacher/classrooms"),
    ).toBe(true)
    expect(isPortalNavItemActive("/teacher/reports", "/teacher/classrooms")).toBe(false)
    expect(
      isPortalNavItemActive("/admin/devices?view=support", "/admin/devices?view=support"),
    ).toBe(true)
    expect(isPortalNavItemActive("/admin/devices?view=support", "/admin/devices")).toBe(true)
    expect(isPortalNavItemActive("/admin/devices", "/admin/devices?view=support")).toBe(false)
  })

  it("builds classroom list and detail route shells that later classroom pages can reuse", () => {
    const classroomHub = buildTeacherClassroomPageModel()
    const detail = buildTeacherClassroomDetailPageModel("classroom_math_1")
    const roster = buildTeacherClassroomRosterPageModel("classroom_math_1")
    const sessionStart = buildTeacherSessionStartPageModel()

    expect(classroomHub.actions[0]).toMatchObject({
      href: "/teacher/classrooms/new",
      label: "Create Classroom",
    })
    expect(classroomHub.actions[1]).toMatchObject({
      href: "/teacher/classrooms",
      label: "Open Classroom List",
    })
    expect(classroomHub.actions[2]).toMatchObject({
      href: "/teacher/sessions/history",
      label: "Attendance Sessions",
    })
    expect(classroomHub.actions.some((action) => action.href === "/teacher/reports")).toBe(true)
    expect(classroomHub.tables[0]?.columns).toEqual([
      "Classroom",
      "Course Code",
      "Teaching Scope",
      "Attendance Mode",
      "Actions",
    ])
    expect(classroomHub.notes[0]).toContain("course settings")
    expect(detail).toMatchObject({
      title: "Classroom classroom_math_1",
    })
    expect(detail.actions[0]).toMatchObject({
      href: "/teacher/classrooms",
    })
    expect(detail.actions.slice(1).map((action) => action.href)).toEqual([
      "/teacher/sessions/start?classroomId=classroom_math_1",
      "/teacher/classrooms/classroom_math_1/roster",
      "/teacher/classrooms/classroom_math_1/schedule",
    ])
    expect(detail.metrics.map((metric) => metric.label)).toEqual([
      "Course Info",
      "Join Code",
      "Class Sessions",
      "Attendance",
    ])
    expect(detail.tables[0]?.columns).toEqual(["Area", "What You Manage", "Route"])
    expect(roster.actions.map((action) => action.href)).toEqual([
      "/teacher/classrooms/classroom_math_1",
      "/teacher/classrooms/classroom_math_1/schedule",
      "/teacher/classrooms/classroom_math_1/stream",
      "/teacher/classrooms/classroom_math_1/imports",
    ])
    expect(roster.tables[0]?.columns).toEqual([
      "Student",
      "Identifier",
      "Membership",
      "Joined",
      "Actions",
    ])
    expect(sessionStart.actions.map((action) => action.href)).toEqual([
      "/teacher/classrooms",
      "/teacher/sessions/history",
      "/teacher/reports",
    ])
    expect(sessionStart.tables[0]?.columns).toEqual(["Step", "What You Confirm", "Result"])
  })

  it("keeps teacher history and admin support pages segregated by route group", () => {
    const sessionHistory = buildTeacherSessionHistoryPageModel()
    const reports = buildTeacherReportsPageModel()
    const adminSemesters = buildAdminSemesterPageModel()
    const adminDevices = buildAdminDevicesPageModel()
    const adminSupport = buildAdminDevicesPageModel("support")
    const adminImports = buildAdminImportsPageModel()

    expect(sessionHistory.actions[0]).toMatchObject({
      href: "/teacher/sessions/start",
      label: "Start QR Attendance",
    })
    expect(reports.actions[0]).toMatchObject({
      href: "/teacher/sessions/history",
      label: "Open Session Review",
    })
    expect(sessionHistory.actions.every((action) => action.href.startsWith("/teacher/"))).toBe(true)
    expect(reports.tables[0]?.columns).toEqual([
      "Course / Student",
      "Scope",
      "Attendance",
      "Follow-up",
    ])
    expect(
      adminSemesters.actions.every(
        (action) => action.href.startsWith("/admin/") || action.href.startsWith("/teacher/"),
      ),
    ).toBe(true)
    expect(adminSemesters.title).toBe("Govern semesters and classrooms")
    expect(adminSemesters.notes[1]).toContain("archive-safe")
    expect(adminDevices.notes[0]).toContain("Recovery actions change who can mark attendance")
    expect(adminDevices.notes[1]).toContain("never auto-trusts a pending replacement")
    expect(adminSupport.actions[1]).toMatchObject({
      href: "/admin/devices",
      label: "Open Device Recovery",
    })
    expect(adminImports.charts[0]?.seriesLabels).toEqual(["Processed", "Review Required", "Failed"])
  })

  it("keeps shared portal copy free of developer-facing placeholder language", () => {
    const models = [
      buildTeacherDashboardPageModel(),
      buildAdminDashboardPageModel(),
      buildTeacherClassroomPageModel(),
      buildTeacherClassroomDetailPageModel("classroom_math_1"),
      buildTeacherClassroomRosterPageModel("classroom_math_1"),
      buildTeacherSessionStartPageModel(),
      buildTeacherSessionHistoryPageModel(),
      buildTeacherAnalyticsPageModel(),
      buildAdminSemesterPageModel(),
      buildAdminDevicesPageModel(),
      buildAdminImportsPageModel(),
    ]

    const copySamples = [
      ...teacherPortalNavigation.flatMap((item) => [item.label, item.description]),
      ...adminPortalNavigation.flatMap((item) => [item.label, item.description]),
      ...models.flatMap((model) => [
        model.eyebrow,
        model.title,
        model.description,
        ...model.metrics.flatMap((metric) => [metric.label, metric.value]),
        ...model.actions.flatMap((action) => [action.label, action.description]),
        ...(model.spotlightSections ?? []).flatMap((section) => [
          section.title,
          section.description,
          ...section.cards.flatMap((card) => [
            card.eyebrow,
            card.title,
            card.description,
            card.ctaLabel,
          ]),
        ]),
        ...model.tables.flatMap((table) => [table.title, table.description, table.emptyMessage]),
        ...model.charts.flatMap((chart) => [chart.title, chart.description]),
        ...model.notes,
      ]),
      evaluateWebPortalAccess(null, "teacher").message,
      evaluateWebPortalAccess(null, "admin").message,
    ]

    expect(copySamples.flatMap((copy) => findWebContentIssues(copy))).toEqual([])
  })
})
