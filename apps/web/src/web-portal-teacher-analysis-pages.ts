import {
  buildAction,
  buildChartShell,
  buildMetric,
  buildSpotlightCard,
  buildSpotlightSection,
  buildTableShell,
} from "./web-portal-helpers"
import type { WebPortalPageModel } from "./web-portal-types"

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
