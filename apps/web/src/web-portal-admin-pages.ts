import {
  buildAction,
  buildChartShell,
  buildMetric,
  buildSpotlightCard,
  buildSpotlightSection,
  buildTableShell,
} from "./web-portal-helpers"
import type { WebPortalPageModel } from "./web-portal-types"

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
