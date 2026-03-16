# AttendEase Phase Promptioing

This folder contains implementation prompt playbooks for each architecture area. The idea is simple:

- one architecture area = one fresh chat window
- each file contains a sequence of prompts to paste in order
- the prompts assume the repo state keeps progressing between chats
- the prompts are designed to make the coding agent actually implement, verify, and summarize, not just brainstorm
- after the architecture phases are done, a dedicated release-readiness playbook is also available for final verification

## How To Use

1. Open the relevant prompt file.
2. Read [`../context.md`](../context.md) to understand the latest repo state and exact pickup point.
3. Start a fresh chat for that architecture area.
4. Paste `Prompt 1`.
5. After that work is complete in the same chat, paste `Prompt 2`.
6. Finish with `Prompt 3`.

## Prompt Pattern

- `Prompt 1` is for reading the docs, inspecting the current repo, and implementing the foundation for that phase.
- `Prompt 2` is for finishing the main workflows, wiring the feature end-to-end, and syncing the docs with what was actually built.
- `Prompt 3` is for hardening, deep testing, final documentation sync, and a clean completion summary.

## Global Rules For Every Prompt

- Do not re-decide the stack.
- Follow [`final-tech-stack-and-implementation.md`](../final-tech-stack-and-implementation.md).
- Read and maintain [`../context.md`](../context.md).
- Follow [`../testing-strategy.md`](../testing-strategy.md) when deciding where tests belong and which layers to add.
- Follow the matching requirement and architecture documents.
- Inspect the current repo first and work with what already exists.
- Implement code, write robust and relevant tests for the architecture area, run relevant checks, and fix issues before stopping.
- If a dependency from an earlier phase is missing, create the minimal needed version without redesigning the whole system.
- A phase is not complete if core risky behavior is left untested.
- Prefer layered coverage for each phase: unit tests for pure logic, helpers, and policy rules; integration tests for API, database, transactions, workers, and queues; and E2E or UI-flow tests for critical journeys when that surface exists.
- If a test cannot be executed in the current environment, still add it where practical and clearly report what could not be run.
- Update the matching requirement files, architecture files, and any other relevant docs when implementation changes or clarifies them.
- Update `Structure/context.md` after meaningful progress so the next chat can resume without losing context.
- Every phase summary must report what was implemented, which tests were added or updated, which commands were run, and what still needs manual or device-level verification.

## Entry Checklist

- Confirm that all earlier phases in the order below are already merged into the repo.
- Read `Structure/context.md`.
- Read `Structure/final-tech-stack-and-implementation.md`.
- Read `Structure/testing-strategy.md`.
- Read the matching requirement document and matching architecture document for the phase.
- Inspect the current repo before making implementation decisions.
- Decide the test layers that phase should add before writing code.

## Exit Checklist

- The phase produces real code, not just TODOs or placeholders.
- The phase includes robust and relevant automated tests for risky behavior.
- The relevant checks have been run for that phase, such as lint, typecheck, unit tests, integration tests, mobile tests, web tests, or build checks.
- Failures are fixed before stopping, or clearly reported if they are environment-blocked.
- The matching requirement docs, architecture docs, and relevant support docs are updated to match the implementation.
- `Structure/context.md` is updated with progress, tests, blockers, and the next pickup point.
- The completion summary names the files changed, tests added, commands run, and remaining manual verification items.

## Required Execution Order

1. `01-system-overview-prompt.md`
   Reason: scaffold the monorepo, app shells, shared packages, tooling, local infra, and the testing baseline.
2. `11-data-rules-audit-prompt.md`
   Reason: lock the core data model, constraints, audit model, and outbox/event foundations before feature code spreads.
3. `02-auth-roles-enrollment-prompt.md`
   Reason: establish login, Google sign-in, roles, policies, assignments, and enrollment rules used everywhere else.
4. `15-device-trust-and-admin-controls-prompt.md`
   Reason: enforce the trusted-device and admin-recovery model early so attendance-sensitive flows do not need redesign later.
5. `13-academic-management-and-scheduling-prompt.md`
   Reason: create semesters, classrooms, schedules, and lectures before classroom operations and attendance sessions depend on them.
6. `14-classroom-communications-and-roster-prompt.md`
   Reason: complete join codes, roster flows, imports, memberships, and announcements before teacher and student feature flows are fully wired.
7. `03-student-mobile-app-prompt.md`
   Reason: build the student mobile shell and data boundaries before QR and Bluetooth attendance UX is layered on top.
8. `04-teacher-mobile-app-prompt.md`
   Reason: build the teacher mobile shell before Bluetooth attendance, roster operations, and mobile history/edit flows are added.
9. `05-teacher-web-app-prompt.md`
   Reason: build the teacher/admin web shell before QR projector sessions, admin support pages, and analytics surfaces are added.
10. `06-qr-gps-attendance-prompt.md`
    Reason: implement the primary attendance engine once auth, classroom data, and teacher/student shells exist.
11. `07-bluetooth-attendance-prompt.md`
    Reason: implement the secondary attendance engine after the mobile shells and device-trust rules are already in place.
12. `08-session-history-manual-edits-prompt.md`
    Reason: implement the shared session truth, detail screens, and 24-hour edit window after both attendance modes can create real session data.
13. `09-reports-exports-prompt.md`
    Reason: reports and exports should consume the final attendance truth after session capture and manual editing behavior are settled.
14. `10-analytics-email-automation-prompt.md`
    Reason: analytics and low-attendance automation build on stable report data, exports, and finalized attendance truth.
15. `12-non-functional-requirements-prompt.md`
    Reason: finish with hardening, operational protections, observability, CI/CD, and system-level safeguards after the major flows exist.

## Post-Architecture Closeout

After the full architecture sequence is complete, use:

16. `16-dockerization-prompt.md`
    Reason: containerize the useful runtime pieces first so API, worker, web, and infra can be validated in a reproducible deployment-style environment.
17. `17-release-readiness-prompt.md`
    Reason: perform final end-to-end validation, real runtime verification, release evidence capture, and go/no-go reporting against `Structure/release-readiness-checklist.md`.
18. `18-mobile-report-blockers-prompt.md`
    Reason: remediate the known post-release-readiness mobile reporting blockers by replacing fallback lecture-coverage logic with the final student and teacher report APIs, then rerun the affected release evidence.
19. `19-android-emulator-validation-prompt.md`
    Reason: use the Android emulator and Android Studio for deeper deterministic mobile validation, lifecycle forcing, permission-state checks, log capture, and native debug-build confidence that sits between basic manual checks and real-device sign-off.

## Optional Product Reset Track

20. `20-product-reset-micro-prompts.md`
    Reason: use this when the existing repo needs a full product and UX reset rather than another incremental phase. This track starts by creating a detailed issue audit, then walks through 40 dependency-first micro prompts covering auth separation, registration, device binding, classroom and roster CRUD, teacher mobile Bluetooth attendance, teacher web QR + GPS attendance, student attendance UX, admin recovery and governance, full doc sync, test coverage, and tiered Android validation.

## Coverage Verification

- Repository and platform foundation: `01-system-overview-prompt.md`
- Database schema, constraints, audit trail, outbox events, and shared rules: `11-data-rules-audit-prompt.md`
- Login, Google login, JWT/refresh flow, RBAC, teacher assignments, and enrollments: `02-auth-roles-enrollment-prompt.md`
- Same-phone anti-account-switch enforcement, trusted-device binding, admin device delink, and recovery: `15-device-trust-and-admin-controls-prompt.md`
- Semesters, teacher course/classroom creation, course CRUD, lecture planning, and schedule management: `13-academic-management-and-scheduling-prompt.md`
- Student enrollment, join codes, roster CRUD, imports, announcements, and classroom stream: `14-classroom-communications-and-roster-prompt.md`
- Student mobile app, profile, history, reports, and attendance-entry controllers: `03-student-mobile-app-prompt.md`
- Teacher mobile app, classroom operations, session actions, and export entry points: `04-teacher-mobile-app-prompt.md`
- Teacher/admin web portal, projector route, classroom admin, and support/admin surfaces: `05-teacher-web-app-prompt.md`
- Rolling QR generation, timestamp-based expiry, GPS validation, live counter, and QR attendance marking: `06-qr-gps-attendance-prompt.md`
- BLE beacon-style broadcasting, rotating BLE identifiers, scanner flows, and Bluetooth attendance marking: `07-bluetooth-attendance-prompt.md`
- Session history, session detail, manual attendance edits, and edit locking rules: `08-session-history-manual-edits-prompt.md`
- Teacher and student report views, session PDF/CSV, percentage CSV, and comprehensive export jobs: `09-reports-exports-prompt.md`
- Attendance analytics, attendance-mode analysis, low-attendance email automation, and email logs: `10-analytics-email-automation-prompt.md`
- Security hardening, observability, rate limits, CI/CD, config safety, and deployment protections: `12-non-functional-requirements-prompt.md`

## File Mapping

- `01-system-overview-prompt.md` -> `architecture/01-system-overview.md`
- `02-auth-roles-enrollment-prompt.md` -> `architecture/02-auth-roles-enrollment.md`
- `03-student-mobile-app-prompt.md` -> `architecture/03-student-mobile-app.md`
- `04-teacher-mobile-app-prompt.md` -> `architecture/04-teacher-mobile-app.md`
- `05-teacher-web-app-prompt.md` -> `architecture/05-teacher-web-app.md`
- `06-qr-gps-attendance-prompt.md` -> `architecture/06-qr-gps-attendance.md`
- `07-bluetooth-attendance-prompt.md` -> `architecture/07-bluetooth-attendance.md`
- `08-session-history-manual-edits-prompt.md` -> `architecture/08-session-history-manual-edits.md`
- `09-reports-exports-prompt.md` -> `architecture/09-reports-exports.md`
- `10-analytics-email-automation-prompt.md` -> `architecture/10-analytics-email-automation.md`
- `11-data-rules-audit-prompt.md` -> `architecture/11-data-rules-audit.md`
- `12-non-functional-requirements-prompt.md` -> `architecture/12-non-functional-requirements.md`
- `13-academic-management-and-scheduling-prompt.md` -> `architecture/13-academic-management-and-scheduling.md`
- `14-classroom-communications-and-roster-prompt.md` -> `architecture/14-classroom-communications-and-roster.md`
- `15-device-trust-and-admin-controls-prompt.md` -> `architecture/15-device-trust-and-admin-controls.md`
- `16-dockerization-prompt.md` -> `dockerization-plan.md`
- `17-release-readiness-prompt.md` -> `release-readiness-checklist.md`
- `18-mobile-report-blockers-prompt.md` -> `release-readiness-report.md` plus `requirements/03-student-mobile-app.md`, `requirements/04-teacher-mobile-app.md`, and `requirements/09-reports-exports.md`
- `19-android-emulator-validation-prompt.md` -> `android-emulator-validation-plan.md` plus `release-readiness-report.md`, `guide.md`, and the mobile requirement/architecture docs
- `20-product-reset-micro-prompts.md` -> `ux-redesign-audit.md` plus the matching requirement, architecture, testing, README, guide, and context docs touched by each micro prompt
