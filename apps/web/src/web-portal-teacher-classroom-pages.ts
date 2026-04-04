import {
  buildAction,
  buildChartShell,
  buildMetric,
  buildSpotlightCard,
  buildSpotlightSection,
  buildTableShell,
} from "./web-portal-helpers"
import type { WebPortalPageModel } from "./web-portal-types"

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
        `/teacher/classrooms/${classroomId}/lectures`,
        "Open Lectures",
        "View lecture sessions, add a new lecture, and start attendance from within the classroom.",
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
