# AttendEase Codebase Structure

## Purpose

This document explains the current project layout after the large screen and workspace refactor.
Use it as the source of truth for where a feature should live before adding another file.

## Top-Level Layout

- `apps/api`
  - NestJS API modules, guards, policies, integrations, and health surfaces.
- `apps/mobile`
  - Expo app routes plus role-specific mobile screen foundations.
- `apps/web`
  - Next.js teacher/admin portal routes, layouts, and client workspaces.
- `apps/worker`
  - BullMQ job processors and queue-backed automation.
- `packages/auth`
  - shared API client and auth-session helpers used by mobile and web.
- `packages/config`
  - environment loaders and runtime config helpers.
- `packages/contracts`
  - shared request/response schemas and API wire types.
- `packages/db`
  - Prisma schema, migrations, seeds, fixtures, and DB helpers.
- `packages/domain`
  - product rules that should stay UI-free and backend-free.
- `packages/ui-mobile`
  - shared mobile design tokens and content guardrails.
- `packages/ui-web`
  - shared web design tokens and content guardrails.
- `scripts`
  - workspace validation, targeted test helpers, and screenshot audit tooling.
- `Structure`
  - product requirements, architecture, testing strategy, context handoff, and audit docs.

## Structure Rules

- Route-facing barrels stay stable.
  - `apps/mobile/src/student-foundation.tsx`
  - `apps/mobile/src/teacher-foundation.tsx`
  - `apps/web/src/teacher-workflows-client.tsx`
  - `apps/web/src/admin-workflows-client.tsx`
- Screen and workspace implementation now lives in smaller sibling files under feature folders.
- Shared layout primitives, status cards, formatters, and query hooks stay in role-local support files instead of being duplicated per screen.
- When a file grows past roughly `300-400` lines, prefer splitting by screen, workspace, or support concern instead of adding another export to the same file.

## Mobile Route Ownership

- `apps/mobile/app/index.tsx`
  - neutral role-entry landing screen.
- `apps/mobile/app/(entry)`
  - student and teacher sign-in/register routes.
- `apps/mobile/app/(student)`
  - student-only protected routes.
- `apps/mobile/app/(teacher)`
  - teacher-only protected routes.

## Student Mobile Structure

- `apps/mobile/src/student-foundation.tsx`
  - public barrel for student screens and invalidation helpers.
- `apps/mobile/src/student-foundation/index.ts`
  - role-local export map for student screens.
- `apps/mobile/src/student-foundation/queries.ts`
  - student query hooks and shared data fetch composition.
- `apps/mobile/src/student-foundation/shared-ui.tsx`
  - student screen frame, cards, banners, empty/loading/error states, and formatters.
- `apps/mobile/src/student-foundation/student-dashboard-screen.tsx`
  - student home/dashboard.
- `apps/mobile/src/student-foundation/student-join-classroom-screen.tsx`
  - classroom join flow.
- `apps/mobile/src/student-foundation/student-classrooms-screen.tsx`
  - enrolled classroom list.
- `apps/mobile/src/student-foundation/student-classroom-detail-screen.tsx`
  - classroom detail summary.
- `apps/mobile/src/student-foundation/student-classroom-stream-screen.tsx`
  - classroom stream and announcement view.
- `apps/mobile/src/student-foundation/student-classroom-schedule-screen.tsx`
  - classroom schedule and lecture timing view.
- `apps/mobile/src/student-foundation/student-history-screen.tsx`
  - attendance history list and summary.
- `apps/mobile/src/student-foundation/student-reports-screen.tsx`
  - student report overview.
- `apps/mobile/src/student-foundation/student-subject-report-screen.tsx`
  - subject-level attendance report.
- `apps/mobile/src/student-foundation/student-profile-screen.tsx`
  - personal profile and self-edit flow.
- `apps/mobile/src/student-foundation/student-device-status-screen.tsx`
  - attendance-device readiness and trust state.
- `apps/mobile/src/student-foundation/student-attendance-hub-screen.tsx`
  - attendance mode selection and live session preview.
- `apps/mobile/src/student-foundation/student-qr-attendance-screen.tsx`
  - QR + GPS attendance flow.
- `apps/mobile/src/student-foundation/student-bluetooth-attendance-screen.tsx`
  - Bluetooth attendance flow.
- `apps/mobile/src/student-workflow-models.ts`
  - student-facing dashboard, classroom, report, profile, and history view models.
- `apps/mobile/src/student-view-state.ts`
  - student loading, empty, blocked, and refresh state copy models.
- `apps/mobile/src/student-query.ts`
  - shared student query keys and invalidation helpers.

## Teacher Mobile Structure

- `apps/mobile/src/teacher-foundation.tsx`
  - public barrel for teacher screens plus the shared login/invalidation helpers expected by routes and tests.
- `apps/mobile/src/teacher-foundation/index.ts`
  - role-local export map for teacher screens.
- `apps/mobile/src/teacher-foundation/queries.ts`
  - teacher query hooks and composed classroom/session/report data reads.
- `apps/mobile/src/teacher-foundation/shared-ui.tsx`
  - teacher screen frame, cards, banners, CTA wrappers, and formatting helpers.
- `apps/mobile/src/teacher-foundation/teacher-dashboard-screen.tsx`
  - teacher home/dashboard.
- `apps/mobile/src/teacher-foundation/teacher-classrooms-screen.tsx`
  - classroom list, creation entry, and classroom summary actions.
- `apps/mobile/src/teacher-foundation/teacher-classroom-detail-screen.tsx`
  - classroom settings, join-code actions, and course info editing.
- `apps/mobile/src/teacher-foundation/teacher-classroom-roster-screen.tsx`
  - roster review and student membership management.
- `apps/mobile/src/teacher-foundation/teacher-classroom-schedule-screen.tsx`
  - classroom schedule management.
- `apps/mobile/src/teacher-foundation/teacher-classroom-announcements-screen.tsx`
  - announcements and stream publishing.
- `apps/mobile/src/teacher-foundation/teacher-classroom-lectures-screen.tsx`
  - lecture and class-session management.
- `apps/mobile/src/teacher-foundation/teacher-bluetooth-session-create-screen.tsx`
  - Bluetooth attendance session setup.
- `apps/mobile/src/teacher-foundation/teacher-bluetooth-active-session-screen.tsx`
  - active Bluetooth session control and live roster.
- `apps/mobile/src/teacher-foundation/session-review-screens.tsx`
  - session history and session-detail review surfaces plus the shared student-section block used by Bluetooth live review.
- `apps/mobile/src/teacher-foundation/teacher-reports-screen.tsx`
  - teacher mobile reports.
- `apps/mobile/src/teacher-foundation/teacher-exports-screen.tsx`
  - teacher mobile export entry.
- `apps/mobile/src/teacher-operational.ts`
  - teacher operational view models for Bluetooth, session review, reports, and exports.
- `apps/mobile/src/teacher-models.ts`
  - teacher dashboard, summary, and generic UI models.
- `apps/mobile/src/teacher-view-state.ts`
  - teacher loading, ready, error, and empty-state copy models.
- `apps/mobile/src/teacher-query.ts`
  - shared teacher query keys and invalidation helpers.

## Teacher Web Structure

- `apps/web/src/teacher-workflows-client.tsx`
  - public barrel for teacher workspaces.
- `apps/web/src/teacher-workflows-client/index.ts`
  - export map for teacher web workspaces.
- `apps/web/src/teacher-workflows-client/shared.tsx`
  - shared workflow cards, fields, banners, tone pills, and bootstrap wiring.
- `apps/web/src/teacher-workflows-client/teacher-classroom-list-workspace.tsx`
  - classroom list workspace.
- `apps/web/src/teacher-workflows-client/teacher-classroom-create-workspace.tsx`
  - classroom creation workspace.
- `apps/web/src/teacher-workflows-client/teacher-classroom-detail-workspace.tsx`
  - classroom detail and course-edit workspace.
- `apps/web/src/teacher-workflows-client/teacher-roster-workspace.tsx`
  - teacher roster management workspace.
- `apps/web/src/teacher-workflows-client/teacher-import-status-workspace.tsx`
  - classroom import status workspace.
- `apps/web/src/teacher-workflows-client/teacher-schedule-workspace.tsx`
  - schedule editing workspace.
- `apps/web/src/teacher-workflows-client/teacher-stream-workspace.tsx`
  - stream and announcement workspace.
- `apps/web/src/teacher-workflows-client/session-start.tsx`
  - QR + GPS session setup workspace.
- `apps/web/src/teacher-workflows-client/teacher-session-history-workspace.tsx`
  - session history and manual correction workspace.
- `apps/web/src/teacher-workflows-client/teacher-reports-workspace.tsx`
  - teacher reports workspace.
- `apps/web/src/teacher-workflows-client/teacher-exports-workspace.tsx`
  - exports workspace.
- `apps/web/src/teacher-workflows-client/teacher-semester-visibility-workspace.tsx`
  - semester visibility workspace.
- `apps/web/src/web-portal.ts`
  - teacher/admin page models, nav models, and protected-route access logic.
- `apps/web/src/web-workflows.ts`
  - route helpers, date/label formatters, and query-key helpers used across workspaces.
- `apps/web/src/teacher-review-workflows.ts`
  - shared teacher report/history/manual-correction view models.

## Admin Web Structure

- `apps/web/src/admin-workflows-client.tsx`
  - public barrel for admin workspaces.
- `apps/web/src/admin-workflows-client/index.ts`
  - export map for admin workspaces.
- `apps/web/src/admin-workflows-client/shared.tsx`
  - admin shared form, field, banner, and summary helpers.
- `apps/web/src/admin-workflows-client/student-management.tsx`
  - student search, student detail, and safe status-governance workspace.
- `apps/web/src/admin-workflows-client/classroom-governance.tsx`
  - classroom governance and archive workspace.
- `apps/web/src/admin-workflows-client/semester-imports.tsx`
  - semester management plus import monitoring workspaces.
- `apps/web/src/admin-device-support-console.tsx`
  - high-risk recovery desk for device deregistration and replacement approval.
- `apps/web/src/admin-device-support.ts`
  - admin device recovery view-model logic.
- `apps/web/src/admin-student-management.ts`
  - admin student-governance view-model logic.
- `apps/web/src/admin-classroom-governance.ts`
  - admin classroom-governance view-model logic.

## API And Shared Package Boundaries

- `apps/api/src/modules/auth`
  - authentication, registration, login, refresh, and role/session protection.
- `apps/api/src/modules/devices`
  - device-trust policy and attendance-readiness enforcement.
- `apps/api/src/modules/academic`
  - semesters, classrooms, roster, schedule, lectures, announcements, and imports.
- `apps/api/src/modules/attendance`
  - QR, Bluetooth, history, manual correction, and live session truth.
- `apps/api/src/modules/reports`
  - teacher/student reporting APIs.
- `apps/api/src/modules/admin`
  - student governance, device recovery, and classroom/semester governance.
- `packages/contracts/src`
  - API schema source of truth.
- `packages/domain/src`
  - correction rules, language helpers, and cross-client behavior models.
- `packages/db/src`
  - fixtures, seed data, audit helpers, and DB integration coverage.

## Remaining Large-File Candidates

The current refactor focused on the route-facing UI and workspace layer first. The next structural candidates, if you want another pass, are the large single-purpose modules that now stand out:

- `apps/api/src/modules/admin/admin-device-support.service.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/academic/scheduling.service.ts`
- `apps/api/src/modules/attendance/qr-attendance.service.ts`
- `apps/mobile/src/teacher-operational.ts`
- `apps/mobile/src/student-workflow-models.ts`
- `apps/mobile/src/teacher-foundation/shared-ui.tsx`
- `apps/mobile/src/student-foundation/shared-ui.tsx`
- `packages/db/src/seed.ts`
- the largest integration and client test files under `packages/auth`, `packages/db`, and `apps/api`

Those files already have clearer neighbors now, so the next pass can split them by policy, service boundary, or scenario group instead of by screen/workspace.
