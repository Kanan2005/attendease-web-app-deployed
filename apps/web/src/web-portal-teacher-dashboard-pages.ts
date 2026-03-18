import {
  buildAction,
  buildChartShell,
  buildMetric,
  buildSpotlightCard,
  buildSpotlightSection,
  buildTableShell,
} from "./web-portal-helpers"
import type { WebPortalPageModel } from "./web-portal-types"

export function buildTeacherDashboardPageModel(): WebPortalPageModel {
  return {
    eyebrow: "Teacher dashboard",
    title: "Welcome to AttendEase",
    description:
      "Open a classroom to manage lecture sessions, take attendance via QR + GPS, and review reports.",
    metrics: [
      buildMetric("Classrooms", "Manage courses", "primary"),
      buildMetric("Sessions", "Take attendance", "success"),
      buildMetric("Reports", "Track & export", "warning"),
    ],
    actions: [
      buildAction(
        "/teacher/classrooms",
        "Open classrooms",
        "View your courses, create lecture sessions, and start attendance.",
      ),
      buildAction(
        "/teacher/sessions/start",
        "Start QR attendance",
        "Launch a new QR + GPS session from any active classroom.",
      ),
    ],
    spotlightSections: [
      buildSpotlightSection(
        "How it works",
        "Open a classroom, navigate to a lecture session, and start QR + GPS attendance in seconds.",
        [
          buildSpotlightCard(
            "/teacher/classrooms",
            "Classrooms",
            "Open a classroom",
            "View lecture sessions, start attendance, and review reports — all from within the classroom.",
            "Open classrooms",
            "primary",
          ),
          buildSpotlightCard(
            "/teacher/sessions/start",
            "Start Session",
            "Launch QR + GPS attendance",
            "Choose a classroom, confirm browser location, and open the live QR controls.",
            "Start session",
            "success",
          ),
          buildSpotlightCard(
            "/teacher/sessions/history",
            "Session History",
            "Review past sessions",
            "Filter sessions, compare present and absent lists, and save corrections.",
            "Open history",
            "warning",
          ),
        ],
      ),
      buildSpotlightSection(
        "Deeper tools",
        "Reports, exports, and analytics help you track attendance trends over time.",
        [
          buildSpotlightCard(
            "/teacher/reports",
            "Reports",
            "Track attendance",
            "Review course rollups, day-wise attendance, and student follow-up.",
            "Open reports",
            "primary",
          ),
          buildSpotlightCard(
            "/teacher/exports",
            "Exports",
            "Download data",
            "Request files and download completed attendance exports.",
            "Open exports",
            "warning",
          ),
          buildSpotlightCard(
            "/teacher/analytics",
            "Analytics",
            "Investigate trends",
            "Move into deeper trend analysis across classrooms and semesters.",
            "Open analytics",
            "success",
          ),
        ],
      ),
    ],
    tables: [],
    charts: [],
    notes: [
      "All attendance, session, and report features are accessible from within each classroom.",
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
