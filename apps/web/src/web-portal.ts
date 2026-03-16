import type { AppRole } from "@attendease/contracts"

export type WebPortalScope = "teacher" | "admin"
export type WebPortalMetricTone = "primary" | "success" | "warning" | "danger"

export interface WebPortalSession {
  accessToken: string
  activeRole: AppRole
  availableRoles: AppRole[]
  displayName: string | null
  email: string | null
}

export interface WebPortalNavItem {
  href: string
  label: string
  description: string
}

export interface WebPortalMetric {
  label: string
  value: string
  tone: WebPortalMetricTone
}

export interface WebPortalQuickAction {
  href: string
  label: string
  description: string
}

export interface WebPortalSpotlightCard {
  href: string
  eyebrow: string
  title: string
  description: string
  ctaLabel: string
  tone: WebPortalMetricTone
}

export interface WebPortalSpotlightSection {
  title: string
  description: string
  cards: WebPortalSpotlightCard[]
}

export interface WebPortalTableShell {
  title: string
  description: string
  columns: string[]
  emptyMessage: string
}

export interface WebPortalChartShell {
  title: string
  description: string
  seriesLabels: string[]
}

export interface WebPortalPageModel {
  eyebrow: string
  title: string
  description: string
  metrics: WebPortalMetric[]
  actions: WebPortalQuickAction[]
  spotlightSections?: WebPortalSpotlightSection[]
  tables: WebPortalTableShell[]
  charts: WebPortalChartShell[]
  notes: string[]
}

export interface WebPortalAccessState {
  allowed: boolean
  title: string
  message: string
  loginHref: string
  loginLabel: string
}

export const webSessionCookieNames = {
  accessToken: "attendease_web_access_token",
  activeRole: "attendease_web_active_role",
  availableRoles: "attendease_web_available_roles",
  displayName: "attendease_web_display_name",
  email: "attendease_web_email",
} as const

const appRoleValues = ["ADMIN", "TEACHER", "STUDENT"] as const

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

export function readWebPortalSession(input: {
  get(name: string): { value: string } | undefined
}): WebPortalSession | null {
  const accessToken = input.get(webSessionCookieNames.accessToken)?.value?.trim() ?? ""
  const activeRoleValue = input.get(webSessionCookieNames.activeRole)?.value?.trim() ?? ""
  const activeRole = normalizeAppRole(activeRoleValue)

  if (!accessToken || !activeRole) {
    return null
  }

  const availableRoles = parseAvailableRoles(
    input.get(webSessionCookieNames.availableRoles)?.value ?? activeRole,
  )

  return {
    accessToken,
    activeRole,
    availableRoles: availableRoles.length > 0 ? availableRoles : [activeRole],
    displayName: input.get(webSessionCookieNames.displayName)?.value ?? null,
    email: input.get(webSessionCookieNames.email)?.value ?? null,
  }
}

export function evaluateWebPortalAccess(
  session: WebPortalSession | null,
  scope: WebPortalScope,
): WebPortalAccessState {
  if (!session) {
    return {
      allowed: false,
      title: scope === "admin" ? "Admin sign in required" : "Sign in required",
      message:
        scope === "admin"
          ? "Use an admin account to open student support, device recovery, imports, and semester controls."
          : "Sign in to open this workspace.",
      loginHref:
        scope === "admin" ? "/admin/login?next=/admin/dashboard" : "/login?next=/teacher/dashboard",
      loginLabel: scope === "admin" ? "Open admin sign in" : "Open teacher sign in",
    }
  }

  if (scope === "teacher") {
    const teacherAllowed =
      session.activeRole === "TEACHER" ||
      session.activeRole === "ADMIN" ||
      session.availableRoles.includes("TEACHER") ||
      session.availableRoles.includes("ADMIN")

    if (teacherAllowed) {
      return {
        allowed: true,
        title: "Teacher access granted",
        message: "This account can open teacher workspaces.",
        loginHref: "/login?next=/teacher/dashboard",
        loginLabel: "Open teacher sign in",
      }
    }

    return {
      allowed: false,
      title: "Teacher access required",
      message: "This account does not have teacher access.",
      loginHref: "/login?next=/teacher/dashboard",
      loginLabel: "Open teacher sign in",
    }
  }

  if (session.activeRole === "ADMIN" || session.availableRoles.includes("ADMIN")) {
    return {
      allowed: true,
      title: "Admin access granted",
      message: "This account can open admin support and governance workspaces.",
      loginHref: "/admin/login?next=/admin/dashboard",
      loginLabel: "Open admin sign in",
    }
  }

  return {
    allowed: false,
    title: "Admin account required",
    message: "This signed-in account cannot open admin support or governance pages.",
    loginHref: "/admin/login?next=/admin/dashboard",
    loginLabel: "Open admin sign in",
  }
}

export function buildTeacherDashboardPageModel(): WebPortalPageModel {
  return {
    eyebrow: "Teacher dashboard",
    title: "Keep classes moving",
    description:
      "Open classrooms, launch QR attendance, review recent sessions, and jump into reports without hunting through the portal.",
    metrics: [
      buildMetric("Classrooms", "Manage course setup", "primary"),
      buildMetric("QR Attendance", "Launch on web", "success"),
      buildMetric("Session History", "Review and correct", "warning"),
      buildMetric("Reports", "Spot follow-up", "primary"),
    ],
    actions: [
      buildAction(
        "/teacher/classrooms",
        "Open classrooms",
        "Manage rosters, schedules, join codes, and course details.",
      ),
      buildAction(
        "/teacher/sessions/start",
        "Start QR attendance",
        "Choose a classroom, confirm your location, and open the live control page.",
      ),
      buildAction(
        "/teacher/sessions/history",
        "Open session history",
        "Resume a live QR session or correct a recent one.",
      ),
      buildAction("/teacher/reports", "Open reports", "Check subject and student attendance."),
    ],
    spotlightSections: [
      buildSpotlightSection(
        "Start attendance work",
        "Choose the classroom, confirm browser location, and move into the live QR control page without extra setup clutter.",
        [
          buildSpotlightCard(
            "/teacher/classrooms",
            "Classrooms",
            "Choose the right classroom",
            "Open a classroom to manage course setup, roster, and daily attendance work from one place.",
            "Open classrooms",
            "primary",
          ),
          buildSpotlightCard(
            "/teacher/sessions/start",
            "QR attendance",
            "Launch a live QR session",
            "Set duration, allowed distance, and browser location, then move straight into the live control page.",
            "Open QR setup",
            "success",
          ),
          buildSpotlightCard(
            "/teacher/sessions/history",
            "Session history",
            "Resume or review a session",
            "Use attendance sessions to reopen a live session, confirm marked students, or fix a recent mistake.",
            "Open sessions",
            "warning",
          ),
        ],
      ),
      buildSpotlightSection(
        "Review and follow up",
        "Keep reports, exports, and follow-up tools close to the launch tools so the portal supports the full teaching loop.",
        [
          buildSpotlightCard(
            "/teacher/reports",
            "Reports",
            "Check attendance clearly",
            "Review day-wise, subject-wise, and student attendance without leaving the teacher portal.",
            "Open reports",
            "primary",
          ),
          buildSpotlightCard(
            "/teacher/exports",
            "Exports",
            "Download attendance files",
            "Prepare attendance files after reviewing the latest classroom and session truth.",
            "Open exports",
            "success",
          ),
          buildSpotlightCard(
            "/teacher/analytics",
            "Analytics",
            "Spot patterns before follow-up",
            "Move into deeper trends when the report view shows a classroom or student needs attention.",
            "Open analytics",
            "warning",
          ),
        ],
      ),
    ],
    tables: [],
    charts: [],
    notes: [
      "Teacher web is the home for classroom operations, QR attendance, session review, reports, analytics, and follow-up.",
    ],
  }
}

export function buildTeacherSessionStartPageModel(): WebPortalPageModel {
  return {
    eyebrow: "QR + GPS attendance",
    title: "Start a live QR session",
    description:
      "Choose the classroom, set time and distance, confirm browser location, and open the live teacher controls.",
    metrics: [
      buildMetric("Classroom", "Choose", "primary"),
      buildMetric("Location", "Confirm", "success"),
      buildMetric("Distance", "Set", "warning"),
      buildMetric("Live Control", "Open", "primary"),
    ],
    actions: [
      buildAction(
        "/teacher/classrooms",
        "Open Classrooms",
        "Check course setup, join codes, and QR-ready classrooms before you start.",
      ),
      buildAction(
        "/teacher/sessions/history",
        "Open Session History",
        "Resume a live session or review a recent one instead of starting a new session.",
      ),
      buildAction(
        "/teacher/reports",
        "Open Reports",
        "Review attendance after the live session ends.",
      ),
    ],
    tables: [
      buildTableShell(
        "QR setup",
        "Keep classroom choice, duration, allowed distance, and teacher location in one short setup flow.",
        ["Step", "What You Confirm", "Result"],
        "No QR setup steps to show yet.",
      ),
    ],
    charts: [],
    notes: [
      "Teacher web owns QR + GPS session launch, while teacher mobile stays focused on Bluetooth attendance.",
    ],
  }
}

export function buildAdminDashboardPageModel(): WebPortalPageModel {
  return {
    eyebrow: "Admin dashboard",
    title: "Control support and governance",
    description:
      "Keep student support, device recovery, import oversight, and academic governance separated but easy to reach from one audited admin workspace.",
    metrics: [
      buildMetric("Student Support", "Review cases", "primary"),
      buildMetric("Device Recovery", "Protect access", "danger"),
      buildMetric("Imports", "Resolve escalations", "warning"),
      buildMetric("Academic Governance", "Control timing", "success"),
    ],
    actions: [
      buildAction(
        "/admin/devices?view=support",
        "Student Support",
        "Open the support desk to review account state, classroom context, device state, and recent risk events.",
      ),
      buildAction(
        "/admin/devices",
        "Device Recovery",
        "Open guarded recovery actions for revoke, clear, and replacement-phone approval.",
      ),
      buildAction(
        "/admin/imports",
        "Imports",
        "Review classroom-upload health and step into cross-classroom escalations.",
      ),
      buildAction(
        "/admin/semesters",
        "Academic Governance",
        "Open semester controls plus classroom archive review from one audited admin workspace.",
      ),
    ],
    spotlightSections: [
      buildSpotlightSection(
        "Student support",
        "Start with the student case before you move into any high-risk device or governance change.",
        [
          buildSpotlightCard(
            "/admin/devices?view=support",
            "Student support",
            "Review support cases first",
            "Search for a student, inspect account state, classroom context, and attendance-phone state, then confirm whether the case needs recovery.",
            "Open support desk",
            "primary",
          ),
        ],
      ),
      buildSpotlightSection(
        "Device trust",
        "Keep recovery actions separate so revoke, clear, and replacement approvals feel deliberate.",
        [
          buildSpotlightCard(
            "/admin/devices",
            "Device recovery",
            "Run guarded recovery actions",
            "Use the recovery desk only after a support case is verified and a reason is ready for the audit trail.",
            "Open recovery desk",
            "danger",
          ),
        ],
      ),
      buildSpotlightSection(
        "Academic governance",
        "Imports and academic timing remain separate from student-device work even though they share the same admin portal.",
        [
          buildSpotlightCard(
            "/admin/imports",
            "Imports",
            "Monitor import health",
            "Keep uploaded files, review-required rows, and failures in one oversight queue.",
            "Open imports",
            "warning",
          ),
          buildSpotlightCard(
            "/admin/semesters",
            "Academic governance",
            "Review semesters and classrooms",
            "Create or archive semesters, inspect classroom history impact, and archive classrooms without deleting saved attendance truth.",
            "Open academic governance",
            "success",
          ),
        ],
      ),
    ],
    tables: [],
    charts: [],
    notes: [
      "Admin work stays separate from teacher day-to-day classroom operations.",
      "High-risk device actions should happen only after a verified student support review and a recorded reason.",
      "Delete actions stay archive-safe so classroom history and attendance truth remain available.",
    ],
  }
}

export function buildTeacherClassroomPageModel(): WebPortalPageModel {
  return {
    eyebrow: "Teacher classrooms",
    title: "Manage classrooms",
    description:
      "Use one classroom workspace for course setup, join codes, QR launch, and the main classroom tools.",
    metrics: [
      buildMetric("Course Info", "Update", "primary"),
      buildMetric("Join Codes", "Rotate", "success"),
      buildMetric("QR Launch", "Ready", "warning"),
      buildMetric("Classrooms", "Review", "primary"),
    ],
    actions: [
      buildAction(
        "/teacher/classrooms/new",
        "Create Classroom",
        "Create a new classroom inside your teaching scope with course code and attendance defaults.",
      ),
      buildAction(
        "/teacher/classrooms",
        "Open Classroom List",
        "Review course setup, join codes, and QR-ready classrooms.",
      ),
      buildAction(
        "/teacher/sessions/history",
        "Attendance Sessions",
        "Review recent session activity before opening a classroom.",
      ),
      buildAction("/teacher/reports", "Open Reports", "Review attendance across classrooms."),
    ],
    tables: [
      buildTableShell(
        "Classroom management",
        "Keep course code, teaching scope, attendance mode, join code, and actions together.",
        ["Classroom", "Course Code", "Teaching Scope", "Attendance Mode", "Actions"],
        "No classrooms to show yet.",
      ),
    ],
    charts: [],
    notes: [
      "Classroom detail should stay the main place for course settings, roster, schedule, updates, and QR launch.",
    ],
  }
}

export function buildTeacherSemesterPageModel(): WebPortalPageModel {
  return {
    eyebrow: "Teacher planning",
    title: "Semester context",
    description: "Review term status before updating classrooms, schedules, or attendance plans.",
    metrics: [
      buildMetric("Status", "Review", "primary"),
      buildMetric("Schedules", "Plan", "success"),
      buildMetric("Lectures", "Check", "warning"),
      buildMetric("Publishing", "Confirm", "primary"),
    ],
    actions: [
      buildAction("/teacher/classrooms", "Open Classrooms", "Return to classroom planning."),
      buildAction(
        "/teacher/sessions/history",
        "Attendance Sessions",
        "Check recent attendance activity.",
      ),
    ],
    tables: [
      buildTableShell(
        "Semester overview",
        "Make sure teachers understand when classroom changes are still allowed.",
        ["Semester", "Status", "Classrooms", "Read / Write", "Notes"],
        "No semester details to show yet.",
      ),
    ],
    charts: [],
    notes: ["Admins own semester changes; teachers use this view to plan safely."],
  }
}

export function buildTeacherSessionHistoryPageModel(): WebPortalPageModel {
  return {
    eyebrow: "Attendance sessions",
    title: "Review attendance sessions",
    description:
      "Filter sessions, compare present and absent lists, and save corrections before the edit window closes.",
    metrics: [
      buildMetric("Filters", "Refine", "primary"),
      buildMetric("Present / Absent", "Review", "success"),
      buildMetric("Edit Window", "Watch", "warning"),
      buildMetric("Reports", "Compare", "primary"),
    ],
    actions: [
      buildAction(
        "/teacher/sessions/start",
        "Start QR Attendance",
        "Open the teacher web launch flow when you need a new live session.",
      ),
      buildAction(
        "/teacher/reports",
        "Open Reports",
        "Compare classroom trends after session review.",
      ),
      buildAction(
        "/teacher/exports",
        "Open Exports",
        "Download files from the same attendance data.",
      ),
    ],
    tables: [
      buildTableShell(
        "Sessions In View",
        "Review the saved result first, then open the present and absent lists when a correction is needed.",
        ["Session", "Course Context", "Mode", "Present / Absent", "Correction State"],
        "No sessions matched the current filters.",
      ),
    ],
    charts: [],
    notes: [
      "Manual changes must keep history, reports, and exports aligned to the same final attendance truth.",
    ],
  }
}

export function buildTeacherReportsPageModel(): WebPortalPageModel {
  return {
    eyebrow: "Reports",
    title: "Reports",
    description:
      "Review course rollups, day-wise attendance, and student follow-up from one shared filter scope.",
    metrics: [
      buildMetric("Course Rollups", "Review", "primary"),
      buildMetric("Student Follow-up", "Review", "success"),
      buildMetric("Day-wise Trend", "Check", "warning"),
      buildMetric("Analytics", "Investigate", "primary"),
    ],
    actions: [
      buildAction(
        "/teacher/sessions/history",
        "Open Session Review",
        "Jump back into saved attendance corrections when a report row looks off.",
      ),
      buildAction(
        "/teacher/exports",
        "Open Exports",
        "Download files from the current report scope.",
      ),
      buildAction("/teacher/analytics", "Open Analytics", "Move into deeper trend analysis."),
    ],
    tables: [
      buildTableShell(
        "Attendance results",
        "Review the rows that matter before exporting, correcting, or following up.",
        ["Course / Student", "Scope", "Attendance", "Follow-up"],
        "No report rows to show yet.",
      ),
    ],
    charts: [
      buildChartShell(
        "Attendance distribution",
        "Use the chart preview to spot students who need attention.",
        ["90%+", "75-90%", "<75%"],
      ),
    ],
    notes: [
      "Keep reports concise and action-focused so exports and analytics feel like next steps.",
    ],
  }
}

export function buildTeacherExportsPageModel(): WebPortalPageModel {
  return {
    eyebrow: "Exports",
    title: "Exports",
    description: "Request files, track status, and download completed attendance exports.",
    metrics: [
      buildMetric("Queue", "Track", "warning"),
      buildMetric("Formats", "Choose", "primary"),
      buildMetric("Delivery", "Download", "success"),
      buildMetric("Retry", "Repeat", "primary"),
    ],
    actions: [
      buildAction(
        "/teacher/reports",
        "Back To Reports",
        "Use report filters to define what you download.",
      ),
      buildAction(
        "/teacher/sessions/history",
        "Attendance Sessions",
        "Review the source sessions before exporting.",
      ),
    ],
    tables: [
      buildTableShell(
        "Export Jobs",
        "Track request, processing, completion, and retry states in one place.",
        ["Job", "Format", "Range", "Status", "Download"],
        "No export jobs to show yet.",
      ),
    ],
    charts: [],
    notes: [
      "Exports should feel like a direct extension of reports, not a separate workflow to learn.",
    ],
  }
}

export function buildTeacherAnalyticsPageModel(): WebPortalPageModel {
  return {
    eyebrow: "Analytics",
    title: "Analytics",
    description:
      "Explore trends, comparisons, mode usage, and drill-down views before you follow up.",
    metrics: [
      buildMetric("Trend Charts", "Explore", "primary"),
      buildMetric("Comparisons", "Compare", "success"),
      buildMetric("Attendance Modes", "Monitor", "warning"),
      buildMetric("Drill-down", "Inspect", "primary"),
    ],
    actions: [
      buildAction(
        "/teacher/reports",
        "Open Reports",
        "Use the same filter scope for quick checks.",
      ),
      buildAction(
        "/teacher/email-automation",
        "Email Automation",
        "Act on low-attendance analysis.",
      ),
    ],
    tables: [
      buildTableShell(
        "Drill-down Targets",
        "Open the right classroom, student, or session view from one analysis workspace.",
        ["Target", "Type", "Filter Scope", "Trend"],
        "No drill-down rows to show yet.",
      ),
    ],
    charts: [
      buildChartShell("Attendance Trend", "Compare weekly and monthly movement at a glance.", [
        "Weekly %",
        "Monthly %",
      ]),
      buildChartShell(
        "Attendance Distribution",
        "Spot strong, steady, and at-risk attendance bands.",
        ["90%+", "75-90%", "<75%"],
      ),
    ],
    notes: [
      "Analytics should help teachers decide what to do next, not explain how the charts are built.",
    ],
  }
}

export function buildTeacherEmailAutomationPageModel(): WebPortalPageModel {
  return {
    eyebrow: "Email automation",
    title: "Email Automation",
    description:
      "Preview reminders, schedule follow-up, and review delivery history for low-attendance outreach.",
    metrics: [
      buildMetric("Low Attendance", "Focus", "warning"),
      buildMetric("Templates", "Preview", "primary"),
      buildMetric("Logs", "Review", "success"),
      buildMetric("Daily Runs", "Schedule", "primary"),
    ],
    actions: [
      buildAction(
        "/teacher/analytics",
        "Use Analytics",
        "Review low-attendance cohorts before sending.",
      ),
      buildAction(
        "/teacher/reports",
        "Open Reports",
        "Cross-check report filters before automation.",
      ),
    ],
    tables: [
      buildTableShell(
        "Automation Rules",
        "Keep manual sends, schedules, and delivery history together.",
        ["Classroom", "Threshold", "Schedule", "Template", "Last Run"],
        "No automation rules to show yet.",
      ),
    ],
    charts: [],
    notes: [
      "Email follow-up should stay connected to reports and analytics rather than becoming a separate workflow.",
    ],
  }
}

export function buildTeacherImportsPageModel(): WebPortalPageModel {
  return {
    eyebrow: "Roster imports",
    title: "Roster Imports",
    description:
      "Review spreadsheet results, check row outcomes, and apply approved roster updates.",
    metrics: [
      buildMetric("Upload", "Collect", "warning"),
      buildMetric("Validation", "Review", "success"),
      buildMetric("Rows", "Check", "primary"),
      buildMetric("Apply", "Confirm", "primary"),
    ],
    actions: [
      buildAction(
        "/teacher/classrooms",
        "Open Classrooms",
        "Return to the classroom import entrypoint.",
      ),
      buildAction("/admin/imports", "Admin Imports", "Escalate cross-classroom import issues."),
    ],
    tables: [
      buildTableShell(
        "Import Jobs",
        "Track reviewed, applied, invalid, and duplicate rows in one view.",
        ["Source File", "Classroom", "Status", "Rows", "Review Needed"],
        "No import jobs to show yet.",
      ),
    ],
    charts: [],
    notes: [
      "Imports should stay connected to classrooms and support follow-up rather than feeling like a separate tool.",
    ],
  }
}

export function buildAdminSemesterPageModel(): WebPortalPageModel {
  return {
    eyebrow: "Academic governance",
    title: "Govern semesters and classrooms",
    description:
      "Create or archive semesters, review classroom history impact, and archive classrooms safely without deleting saved attendance truth.",
    metrics: [
      buildMetric("Semesters", "Control timing", "primary"),
      buildMetric("Classrooms", "Archive safely", "warning"),
      buildMetric("History", "Preserve", "success"),
      buildMetric("Audit", "Record reasons", "primary"),
    ],
    actions: [
      buildAction("/admin/dashboard", "Back To Dashboard", "Return to admin overview."),
      buildAction(
        "/teacher/semesters",
        "Teacher View",
        "Cross-check the teacher-facing semester view.",
      ),
    ],
    tables: [
      buildTableShell(
        "Academic governance",
        "Review term timing first, then inspect classroom archive impact before you save a destructive change.",
        ["Record", "Status", "History Impact", "Action"],
        "No academic governance records to show yet.",
      ),
    ],
    charts: [],
    notes: [
      "Semester changes remain admin-only even when teachers can view term status.",
      "Classroom delete stays archive-safe so join codes close while attendance history and audits stay available.",
      "Live attendance sessions should be ended before an admin archives a classroom.",
    ],
  }
}

export function buildAdminDevicesPageModel(
  view: "support" | "recovery" = "recovery",
): WebPortalPageModel {
  if (view === "support") {
    return {
      eyebrow: "Student support",
      title: "Review support cases",
      description:
        "Start with the student account, classroom context, attendance-phone state, and recent risk events before you move into recovery.",
      metrics: [
        buildMetric("Search", "Find a student", "primary"),
        buildMetric("Account State", "Review clearly", "success"),
        buildMetric("Classroom Context", "Inspect impact", "warning"),
        buildMetric("Next Step", "Escalate if needed", "primary"),
      ],
      actions: [
        buildAction("/admin/dashboard", "Back To Dashboard", "Return to the admin overview."),
        buildAction(
          "/admin/devices",
          "Open Device Recovery",
          "Move into guarded recovery actions.",
        ),
        buildAction(
          "/admin/imports",
          "Open Imports",
          "Review import-side cases that need admin help.",
        ),
      ],
      tables: [],
      charts: [],
      notes: [
        "Student support stays separate from high-risk recovery so admins can verify a case before they change device access.",
      ],
    }
  }

  return {
    eyebrow: "Device recovery",
    title: "Recover an attendance phone safely",
    description:
      "Use confirmed support cases to deregister the current phone, approve a pending or verified replacement, and keep the one-device policy visible while you work.",
    metrics: [
      buildMetric("Verify", "Confirm the case", "warning"),
      buildMetric("Deregister", "Protect access", "danger"),
      buildMetric("Replacement", "Approve safely", "success"),
      buildMetric("Audit", "Keep the trail", "primary"),
    ],
    actions: [
      buildAction("/admin/dashboard", "Back To Dashboard", "Return to the admin overview."),
      buildAction(
        "/admin/devices?view=support",
        "Open Student Support",
        "Review the support case before you run any recovery action.",
      ),
      buildAction(
        "/admin/imports",
        "Open Imports",
        "Review import-side cases that need admin help.",
      ),
    ],
    tables: [],
    charts: [],
    notes: [
      "Recovery actions change who can mark attendance and should run only after the student request is verified.",
      "Deregistering the current phone never auto-trusts a pending replacement; support still has to approve that phone.",
      "Recovery actions preserve device and audit history instead of deleting records.",
    ],
  }
}

export function buildAdminImportsPageModel(): WebPortalPageModel {
  return {
    eyebrow: "Import governance",
    title: "Oversee roster imports",
    description:
      "Monitor classroom import health across the system and step in when a queue needs admin attention.",
    metrics: [
      buildMetric("Import Jobs", "Monitor", "success"),
      buildMetric("Review Required", "Check", "warning"),
      buildMetric("Failures", "Escalate", "danger"),
      buildMetric("Apply State", "Track", "primary"),
    ],
    actions: [
      buildAction("/teacher/imports", "Teacher Imports", "Switch to the teacher import workspace."),
      buildAction(
        "/admin/devices",
        "Device Recovery",
        "Handle support issues that surfaced during onboarding.",
      ),
    ],
    tables: [
      buildTableShell(
        "System Import Queue",
        "Use one queue to review import progress and escalation paths.",
        ["Source", "Owner", "Status", "Rows", "Escalation"],
        "No import records to show yet.",
      ),
    ],
    charts: [
      buildChartShell(
        "Import Throughput",
        "Watch volume, review-required work, and failures over time.",
        ["Processed", "Review Required", "Failed"],
      ),
    ],
    notes: [
      "Teacher and admin imports should keep one shared source of truth for job status.",
      "Import oversight belongs in admin governance, not in the student-support or device-recovery flow.",
    ],
  }
}

export function buildTeacherClassroomDetailPageModel(classroomId: string): WebPortalPageModel {
  return {
    eyebrow: "Classroom detail",
    title: `Classroom ${classroomId}`,
    description:
      "Bring course settings, join code, QR launch, students, schedule, and updates into one classroom view.",
    metrics: [
      buildMetric("Course Info", "Manage", "primary"),
      buildMetric("Join Code", "Rotate", "success"),
      buildMetric("Class Sessions", "Review", "primary"),
      buildMetric("Attendance", "Start", "warning"),
    ],
    actions: [
      buildAction("/teacher/classrooms", "Back To Classrooms", "Return to the classroom hub list."),
      buildAction(
        `/teacher/sessions/start?classroomId=${classroomId}`,
        "Start QR Attendance",
        "Open the short QR + GPS setup flow with this classroom preselected.",
      ),
      buildAction(
        `/teacher/classrooms/${classroomId}/roster`,
        "Open Roster",
        "Move into the classroom membership table and roster actions.",
      ),
      buildAction(
        `/teacher/classrooms/${classroomId}/schedule`,
        "Open Schedule",
        "Edit recurring slots, exceptions, and Save & Notify drafts.",
      ),
    ],
    tables: [
      buildTableShell(
        "Course management",
        "Keep course settings, join code, QR launch, and classroom routes together.",
        ["Area", "What You Manage", "Route"],
        "No classroom overview items to show yet.",
      ),
    ],
    charts: [],
    notes: [
      "Classroom detail should stay the main teacher workspace for course settings, roster, schedule, updates, and QR handoff.",
    ],
  }
}

export function buildTeacherClassroomRosterPageModel(classroomId: string): WebPortalPageModel {
  return {
    eyebrow: "Classroom roster",
    title: `Roster ${classroomId}`,
    description:
      "Keep student lookup, membership state, and course context together so roster work stays quick.",
    metrics: [
      buildMetric("Students", "Review", "primary"),
      buildMetric("Pending", "Follow Up", "warning"),
      buildMetric("Membership", "Update", "success"),
      buildMetric("Imports", "Monitor", "primary"),
    ],
    actions: [
      buildAction(
        `/teacher/classrooms/${classroomId}`,
        "Back To Course",
        "Return to the course settings and QR tools.",
      ),
      buildAction(
        `/teacher/classrooms/${classroomId}/schedule`,
        "Open Schedule",
        "Move into class-session planning from the same classroom context.",
      ),
      buildAction(
        `/teacher/classrooms/${classroomId}/stream`,
        "Open Updates",
        "Review announcements and student-visible classroom posts.",
      ),
      buildAction(
        `/teacher/classrooms/${classroomId}/imports`,
        "Open Imports",
        "Review bulk roster import jobs and row outcomes.",
      ),
    ],
    tables: [
      buildTableShell(
        "Roster management",
        "Keep student identity, membership state, and classroom actions on one roster page.",
        ["Student", "Identifier", "Membership", "Joined", "Actions"],
        "No roster items to show yet.",
      ),
    ],
    charts: [],
    notes: [
      "Roster management should stay aligned with teacher mobile by keeping add, edit, and remove work on one classroom-scoped page.",
    ],
  }
}

function buildMetric(label: string, value: string, tone: WebPortalMetricTone): WebPortalMetric {
  return {
    label,
    value,
    tone,
  }
}

function buildAction(href: string, label: string, description: string): WebPortalQuickAction {
  return {
    href,
    label,
    description,
  }
}

function buildSpotlightCard(
  href: string,
  eyebrow: string,
  title: string,
  description: string,
  ctaLabel: string,
  tone: WebPortalMetricTone,
): WebPortalSpotlightCard {
  return {
    href,
    eyebrow,
    title,
    description,
    ctaLabel,
    tone,
  }
}

function buildSpotlightSection(
  title: string,
  description: string,
  cards: WebPortalSpotlightCard[],
): WebPortalSpotlightSection {
  return {
    title,
    description,
    cards,
  }
}

function buildTableShell(
  title: string,
  description: string,
  columns: string[],
  emptyMessage: string,
): WebPortalTableShell {
  return {
    title,
    description,
    columns,
    emptyMessage,
  }
}

function buildChartShell(
  title: string,
  description: string,
  seriesLabels: string[],
): WebPortalChartShell {
  return {
    title,
    description,
    seriesLabels,
  }
}

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

function parseAvailableRoles(value: string): AppRole[] {
  return value
    .split(",")
    .map((segment) => normalizeAppRole(segment.trim()))
    .filter((role): role is AppRole => Boolean(role))
}

function normalizeAppRole(value: string): AppRole | null {
  return appRoleValues.includes(value as AppRole) ? (value as AppRole) : null
}
