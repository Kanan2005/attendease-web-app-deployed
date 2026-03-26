# AttendEase Testing Strategy

## Purpose

This document defines the testing baseline for the current reset-track repo and the test layering plan that keeps later prompts dependable.

## Current Baseline

The system-overview phase intentionally establishes a lightweight but real automated baseline:

- Vitest is the current test runner for shared packages and shell-level app helpers.
- Pure logic is tested close to the implementation using `*.test.ts` files inside `src/`.
- Health payloads, config loaders, contract schemas, and shared helper packages are covered first because later phases will build on them.
- `pnpm check` is the default quality gate and currently runs:
  - workspace validation
  - lint
  - typecheck
  - tests
- `pnpm test` now also runs the root targeted-command wrapper test before delegating workspace package tests, so the reset-era focused validation commands stay protected by automation
- workspace validation now also protects reset-track baseline documents and required reset markers that later prompts depend on, including `Structure/ux-redesign-audit.md`, `Structure/context.md`, the reset-baseline sections inside the system-overview requirement and architecture docs, and the role-entry / IA marker sections inside the auth, student-mobile, teacher-mobile, and teacher-web docs
- workspace validation now also protects the Prompt 4 reset-contract marker sections inside the auth requirement, auth architecture, and context handoff docs so later reset prompts cannot silently drift from the locked contract foundation
- the DB package now also owns a dedicated integration suite that applies the real migration SQL to PostgreSQL and validates structural constraints
- the DB package also now covers shared client helpers, transaction helpers, audit/outbox helpers, deterministic seeds, and initial report-view behavior
- the DB package now also exports reset-ready fixture builders plus seeded lifecycle scenarios for registration candidates, trusted-device recovery history, roster membership states, and classroom/session metadata so later prompts can reuse one shared baseline instead of recreating test data ad hoc
- the DB package now also covers reset-era destructive-action audit helpers and enum extensions for archive/remove semantics
- the DB package now also verifies roster snapshot truth, manual edit audit persistence, export-file uniqueness, analytics bounds, and outbox attempt-count integrity
- the API package now also owns auth, academic-scope, and device-trust coverage for password login, Google exchange behavior, refresh/logout flows, role guards, assignment scope, enrollment scope, device registration, attendance-readiness guard behavior, admin recovery flows, and login-time trusted-device enforcement
- the API package now also proves that non-admin sessions cannot use admin recovery routes, that non-student sessions cannot use the student-only attendance-readiness route, and that conflicting admin replacement attempts still emit the same anti-abuse security events
- the API package now also proves the dedicated admin student-governance routes for student search/detail, audited deactivate/reactivate/archive actions, session revocation, and continued separation between student support and device recovery
- the API package now also owns academic-management coverage for semester lifecycle endpoints, classroom CRUD scope enforcement, lecture creation/list flows, and the new outbox-backed academic change events
- the API package now also owns scheduling coverage for recurring slot overlap rules, one-off/cancelled/rescheduled exception flows, save-and-notify outbox behavior, lecture linkage for future attendance-session attachment, and lifecycle-state rejection for closed semesters and completed classrooms
- the API package now also owns classroom roster coverage for join-code rotation and expiry, student self-join, roster membership transitions, lifecycle-state rejection, and roster-management outbox behavior
- the API package now also owns reset-era destructive-action coverage for semester archive, classroom archive, and classroom-student removal audit semantics
- the API package now also owns classroom communications coverage for stream visibility, notify-event creation, roster-import lifecycle rules, and apply-time safety checks
- the API package now also proves duplicate, blocked, and dropped self-join rejection, teacher-only versus student-visible stream filtering, and reviewed import apply behavior for valid and duplicate rows
- the API package now also owns QR + GPS attendance coverage for rolling token issuance and expiry, future-slice rejection, GPS anchor resolution, GPS distance and accuracy validation, session creation with roster snapshotting, successful QR marking, duplicate blocking, suspicious GPS failure security-event logging, realtime seam calls, and active-session end/auto-expiry behavior
- the API package now also owns Bluetooth attendance coverage for rotating BLE token issuance and validation, Bluetooth session creation with roster snapshotting, successful Bluetooth marking, duplicate blocking, invalid or expired BLE rejection, Bluetooth security-event logging, unknown-session mismatch logging, and live counter seam updates
- the API package now also owns session-history coverage for teacher history list filters, expanded session-detail read models, session-student list reads, editability derivation, and overdue-session auto-expiry through the shared detail route
- the API package now also owns manual-edit coverage for transactional `PATCH /sessions/:id/attendance` saves, edit-window locking, manual add or remove flows, audit-log persistence, refreshed session counters, final-summary refresh behavior, and suspicious-summary separation from final attendance truth
- the API package now also owns reporting coverage for teacher day-wise and subject-wise rollups, per-student percentage tables, student self-report overview or subject breakdowns, and teacher or student or admin report-access boundaries
- the API package now also owns export coverage for export-job create/list/detail behavior, lifecycle filters, retention-aware signed download URL shaping, and teacher/student access-control boundaries
- the API package now also owns analytics coverage for trends, distribution, comparisons, mode usage, student timeline drill-down, session drill-down, and teacher/admin analytics access boundaries
- the API package now also owns low-attendance email automation coverage for rule create/update/list scope checks, preview rendering, manual-send dispatch creation, run/log visibility, and teacher/admin route-access boundaries
- the API package now also owns non-functional coverage for request-ID propagation, consistent API error envelopes, auth rate limiting, and attendance-mark rate limiting
- the API package now also owns readiness and queue-health coverage, including real database-backed queue-state assertions, queue stale-threshold behavior, rollout-disabled route behavior, and logger redaction/context assertions
- the worker package now also owns roster import processor and announcement fan-out coverage, including receipt persistence
- the worker package now also owns export processor coverage for session PDF, session CSV, student-percentage CSV, comprehensive CSV, failure handling, and file-upload metadata
- the worker package now also owns analytics refresh coverage for seeded refresh events, ended-session refresh, and manual-edit refresh
- the worker package now also owns email automation coverage for due-rule scheduling, duplicate local-day scheduling prevention, recipient selection, send success/failure handling, and dispatch/log persistence
- the worker package now also proves stale-processing dispatch-run recovery so interrupted worker cycles do not leave email automation permanently stuck
- the worker package now also proves stale-processing recovery for exports, roster imports, announcement fan-out, and analytics refresh events
- the worker package now also proves structured worker logging output for monitoring-friendly operational events
- the web and mobile shells now also cover their auth bootstrap helpers, and `packages/auth` now covers the shared auth API client
- `packages/ui-mobile` and `packages/ui-web` now also cover shared reset-era design tokens, tone helpers, and user-facing copy guardrails so reusable presentation changes stay test-backed
- the repo now also owns a deterministic screenshot-audit layer through:
  - `scripts/full-product-audit-lib.mjs`
  - `scripts/generate-full-product-audit.mjs`
  - `scripts/prepare-mobile-audit-screenshots.mjs`
  - `scripts/capture-web-audit.mjs`
  - `scripts/mobile-emulator-lib.mjs`
- the screenshot-audit layer now protects:
  - full route inventory coverage for student mobile, teacher mobile, teacher web, and admin web
  - deterministic screenshot file naming under `Structure/artifacts/full-product-audit`
  - an emulator-safe Android launch path that uses localhost API routing plus `adb reverse` instead of relying only on the LAN IP in `apps/mobile/.env.local`
- the web and mobile shells now also cover classroom communication bootstrap helpers for the first teacher/student stream surfaces
- the web shell now also covers teacher/admin portal cookie parsing, route protection rules, grouped navigation coverage, and page-shell bootstrapping for the teacher/admin route tree
- the web shell now also covers workflow route helpers, schedule-draft save shaping, roster-import text parsing, teacher/admin import-monitor aggregation, and QR-session shell boundary models for the operational teacher/admin web routes
- the web shell now also covers analytics filter shaping, email-rule form shaping, live analytics workspace state, and low-attendance email workspace state for the teacher web portal
- the web shell now also proves protected login handoff routing, teacher versus admin dashboard segregation, classroom CRUD page-model actions, QR setup precondition modeling, QR create-payload shaping, polling cadence, and projector-shell readiness for the QR phase
- the web shell now also proves admin student-support summary copy, safe student-status action gating, and page-model separation between student support and device recovery
- the mobile shell now also covers student query invalidation helpers, student workflow models, report shaping, schedule shaping, and attendance candidate/controller preparation logic
- the mobile shell now also covers centralized student route helpers, dashboard/join/history/report UX-state builders, attendance permission/result banner contracts, QR location-capture banners, and QR API-error mapping used by the QR and Bluetooth entry screens
- the mobile shell now also covers teacher session bootstrap, teacher route naming, teacher query-key invalidation helpers, teacher home/dashboard shaping, teacher loading-state copy, and the first teacher classroom-management route foundations
- the mobile shell now also covers teacher Bluetooth shell candidates, setup-status models, active-session status models, advertiser-state helpers, advertiser-recovery models, advertiser failure normalization, session-end retry models, classroom-context navigation, teacher schedule draft diffing, teacher roster-import parsing, teacher roster filters and row actions, join-code action state, and final teacher report/export workflow models for the operational teacher-mobile routes
- the mobile shell now also covers native Bluetooth wrapper boundary behavior so teacher advertiser and student scanner flows share one tested TypeScript bridge contract
- the mobile shell now also protects the route-facing student/teacher foundation barrels with `apps/mobile/src/foundation-exports.test.ts`, so we can keep splitting large role screens into smaller files without breaking app imports silently
- the web shell now also protects the route-facing teacher/admin workspace barrels with `apps/web/src/workspace-exports.test.ts`, so page routes can keep importing stable entry modules while the underlying workspaces keep getting smaller

## Reset Documentation Validation Baseline

Prompt 39 now treats documentation as a validated artifact, not just a hand-written summary.

Workspace validation should keep checking that:

- the reset audit includes the locked decisions plus the implemented reset-state summary
- `Structure/context.md` includes the current reset-track handoff and the latest prompt summary
- reset-touched requirement docs include an explicit implementation-status section
- reset-touched architecture docs include an explicit implementation-snapshot section
- `README.md`, `guide.md`, and this testing strategy still describe the reset-era command and validation story instead of older scaffold framing
- the root command surface still includes:
  - `manual:mobile:emulator`
  - `audit:matrix`
  - `audit:screenshots:mobile`
  - `audit:screenshots:web`
- `Structure/full-product-screenshot-audit.md` still exists as the generated audit handoff
- `Structure/codebase-structure.md` stays aligned with the refactored screen/workspace folders that later implementation prompts will keep extending

## Screenshot Audit Validation Layer

Treat the full screenshot audit as a validation aid, not a substitute for functional or hardware proof.

Use:

- `pnpm audit:matrix` to regenerate the route-by-route functionality matrix
- `pnpm audit:screenshots:mobile` to refresh deterministic mobile audit artifacts
- `pnpm audit:screenshots:web` to refresh deterministic teacher/admin web audit artifacts
- `pnpm manual:mobile:emulator -- --device emulator-5554 --port 8101` when the Android emulator should use localhost API routing instead of the current LAN IP

Do not treat emulator/browser screenshots as final proof for QR camera scan success, GPS accuracy/range enforcement, or BLE advertiser/scanner proximity truth.

Detailed audit-output and interpretation notes now live in
[`./testing-strategy-validation-inventory.md`](./testing-strategy-validation-inventory.md).

## Current Test Placement

Shared packages use `packages/*/src/*.test.ts`, app shell tests stay under each app `src/`
directory, and integration tests use `*.integration.test.ts` where the runtime boundary matters.

Detailed test inventories and prompt-by-prompt coverage references now live in
[`./testing-strategy-validation-inventory.md`](./testing-strategy-validation-inventory.md).

### E2E And Device-Level Tests

Add E2E coverage only when the relevant user journey exists.

Expected tools:

- Playwright for web flows
- Detox for mobile flows

Suggested placement:

- `apps/web/e2e/*.spec.ts`
- `apps/mobile/e2e/*.test.ts`

Good E2E candidates:

- teacher login and dashboard access
- student join-classroom flow
- teacher QR session start to student successful mark
- teacher Bluetooth session start to student successful mark
- report filtering and export initiation

## Command Strategy

Current commands:

- `pnpm workspace:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm check`
- `pnpm build`
- `pnpm --filter @attendease/db prisma:validate`
- `pnpm --filter @attendease/db test:integration`
- `pnpm --filter @attendease/db seed:dev`
- `pnpm --filter @attendease/db seed:dev:test-url`
- `pnpm --filter @attendease/api typecheck`
- `pnpm --filter @attendease/api test`
- `pnpm --filter @attendease/auth test`
- `pnpm --filter @attendease/web test`
- `pnpm --filter @attendease/mobile test`
- `pnpm test:api:targeted -- <files...>`
- `pnpm test:api:integration -- [integration-files...]`
- `pnpm test:mobile:targeted -- <files...>`
- `pnpm test:web:targeted -- <files...>`
- `pnpm android:validate:help`
- `pnpm android:validate -- --device <device> --port <port> [--no-install]`

Stability note:

- `apps/api/package.json` and `apps/worker/package.json` now run Vitest with `--maxWorkers=1 --minWorkers=1`
- this is intentional for the current repo because those suites create real temporary PostgreSQL databases and Prisma clients; serial file execution prevents flaky `too many clients already` failures and worker teardown timeouts during full monorepo runs

## Reset Track Targeted Validation Baseline

The reset prompts now depend on a small set of focused commands that are safe to run after each micro-phase.

Recommended per-prompt commands:

- targeted API integration:
  - `POSTGRES_PORT=55432 pnpm test:api:integration -- src/modules/auth/auth.integration.test.ts`
- targeted API unit/helper check:
  - `pnpm test:api:targeted -- src/test/integration-helpers.test.ts`
- targeted mobile shell checks:
  - `pnpm test:mobile:targeted -- src/student-foundation.test.ts src/student-query.test.ts`
- targeted web shell checks:
  - `pnpm test:web:targeted -- src/web-portal.test.ts`
- native Android command discovery:
  - `pnpm android:validate:help`
- native Android debug validation:
  - `pnpm android:validate -- -d emulator-5554 --port 8083 --no-install`

Important reset-era behavior:

- the targeted command wrappers now strip pnpm's forwarded `--` separator before passing file filters to Vitest or Expo commands
- `apps/api/src/test/integration-helpers.ts` now resolves database candidates from:
  - `TEST_DATABASE_URL`
  - `DATABASE_URL`
  - `TEST_DATABASE_PORT`
  - `POSTGRES_PORT`
- this keeps targeted API integration tests usable when local Docker runtime uses a non-default PostgreSQL host port such as `55432`

Current meaning:

- `pnpm test` is the automated baseline for unit and shell-level tests already in the repo.
- `pnpm --filter @attendease/db test:integration` is the first real migration/integrity suite and expects a reachable PostgreSQL instance through `DATABASE_URL`.
- the DB integration suite now proves high-risk uniqueness, raw SQL checks, transaction rollback behavior, audit/outbox persistence, seed idempotency, and initial report-view correctness.
- `pnpm --filter @attendease/db seed:dev` provides deterministic local baseline data for backend and reporting work.
- `pnpm --filter @attendease/api test` now proves the most important auth/session/role-scope/device-trust behavior with real Nest request flows and temporary PostgreSQL databases, including cross-scope denial and student-session gating on trusted-device state.
- `pnpm --filter @attendease/api test` now runs serially across test files so the temporary-database integration suites stay stable under the root `pnpm test` command.
- `pnpm --filter @attendease/api test` now also proves device registration behavior, attendance-readiness trusted-device guard behavior, admin revoke/delink/approve-new-device flows, and security-event persistence for blocked device misuse patterns.
- `pnpm --filter @attendease/api test` now also proves role-denial on admin recovery routes, non-student denial on attendance-readiness checks, and conflicting replacement-device rejection without weakening the same-phone anti-rotation guarantees.
- `pnpm --filter @attendease/api test` now also proves admin semester lifecycle behavior, teacher/admin classroom CRUD within assignment rules, lecture creation/list behavior, and classroom/lecture outbox event creation.
- `pnpm --filter @attendease/api test` now also proves recurring weekly slot rules, schedule exception flows, save-and-notify batch behavior, and lecture linkage resolution for schedule-backed classroom occurrences.
- `pnpm --filter @attendease/api test` now also proves join-code rotation and expiry, student self-join, teacher classroom-student add/search/update/remove/reactivate flows, and lifecycle rejection for roster mutations and classroom join attempts.
- `pnpm --filter @attendease/api test` now also proves classroom stream visibility, notify-event creation for student-visible posts, roster import creation, and apply rejection before worker review completes.
- `pnpm --filter @attendease/api test` now also proves duplicate, blocked, and dropped join rejection plus reviewed import apply outcomes and teacher-only versus student-visible stream filtering.
- `pnpm --filter @attendease/api test` now also proves export-job request lifecycle, report truth consistency between teacher and student views, foreign-teacher denial, student denial, status/job-type export filters, and retention-aware signed export detail shaping.
- `pnpm --filter @attendease/api test` now also proves analytics trend, distribution, comparison, mode-usage, student-timeline, and session-drilldown endpoints plus assignment-aware access denial for out-of-scope teachers and non-teacher roles.
- `pnpm --filter @attendease/api test` now also proves low-attendance email rule lifecycle, preview rendering, manual-send queueing, dispatch-run visibility, email-log visibility, and cross-scope denial for student or foreign-teacher access.
- `pnpm --filter @attendease/api test` now also proves request-ID propagation, consistent error envelopes, and named rate-limit policy enforcement without leaking cross-test state into unrelated integration suites.
- `pnpm --filter @attendease/worker test` now also proves worker-side export generation, failure handling, file metadata persistence, and file-output structure checks for all four current export formats.
- `pnpm --filter @attendease/worker test` now runs serially across test files so temp-database teardown stays reliable during monorepo validation.
- `pnpm --filter @attendease/worker test` now also proves analytics aggregate refresh behavior from seeded refresh events, ended-session events, and manual-edit events.
- `pnpm --filter @attendease/worker test` now also proves due-rule scheduling, duplicate per-day scheduling prevention, low-attendance recipient selection, successful email dispatch completion, duplicate rerun suppression, and failed-delivery handling for the email automation worker.
- `pnpm --filter @attendease/worker test` now also proves stale `PROCESSING` dispatch-run recovery after the timeout window.
- `pnpm --filter @attendease/worker test` now also proves structured worker logging and error serialization behavior for operational observability.
- `pnpm --filter @attendease/api test` now also proves QR time-slice validation, HMAC tamper rejection, GPS radius and accuracy enforcement, teacher polling via `GET /sessions/:id`, QR session creation/end flows, roster snapshot creation, successful QR attendance marks, duplicate mark rejection, and attendance outbox/realtime side effects.
- `pnpm --filter @attendease/api test` now also proves Bluetooth rotating identifier validation, Bluetooth session creation, successful Bluetooth attendance marking, duplicate mark rejection, invalid or expired BLE rejection, unknown-session mismatch logging, Bluetooth security-event persistence, and attendance outbox/realtime side effects.
- `pnpm --filter @attendease/api test` now also proves teacher session-history list responses, expanded session-detail responses, final roster student-list reads, locked versus open editability behavior, overdue-session expiry through the shared `GET /sessions/:id` route, manual add or remove consistency, and suspicious-summary separation from final attendance truth.
- `pnpm --filter @attendease/api test` now also proves teacher report filters, student self-report reads, manual-edit consistency inside report outputs, and teacher or student or admin report-access boundaries.
- `pnpm --filter @attendease/auth test` now proves the shared auth client behavior and token/policy helpers.
- `pnpm --filter @attendease/auth test` now also proves semester CRUD route shaping and classroom archive route shaping for the shared web/mobile auth client.
- `pnpm --filter @attendease/mobile test` now proves student query invalidation targets, route naming, dashboard/join/history/report UX-state shaping, attendance permission/result banner behavior, QR location-capture state, QR request shaping, QR API-error mapping, classroom schedule shaping, subject-report shaping, attendance candidate selection, and safe local profile-draft behavior in addition to the earlier bootstrap helpers.
- `pnpm --filter @attendease/mobile test` now also proves teacher dev-session bootstrap behavior, teacher route boundaries, teacher cache invalidation targets, and teacher dashboard/classroom activity shaping for the dedicated teacher route group.
- `pnpm --filter @attendease/mobile test` now also proves teacher Bluetooth shell candidate generation, setup-status guidance, active-session advertiser-state handling, advertiser failure normalization, advertiser recovery, session-end retry handling, local schedule save-diff construction, teacher roster filter and action shaping, teacher roster-import text parsing, join-code action models, classroom-context navigation, and final report/export view-model behavior for the new operational teacher-mobile routes.
- `pnpm --filter @attendease/mobile test` now also proves Bluetooth availability-to-permission mapping, advertiser/scanner runtime-state mapping, BLE detection de-duplication, detected-session selection, and native wrapper boundary behavior for the native Bluetooth service boundary.
- `Structure/bluetooth-device-test-checklist.md` now captures the remaining Android and iOS real-device BLE validation that automated tests cannot fully replace.
- `pnpm --filter @attendease/web test` now also proves teacher/admin portal workflow route helpers, schedule-draft payload generation, roster-import normalization behavior, teacher/admin import-monitor shaping, and QR-session shell boundary modeling for the operational web pages.
- `pnpm --filter @attendease/web test` now also proves protected login routing, teacher/admin dashboard access shaping, classroom CRUD page-model actions, key classroom-context route boundaries, QR create-payload shaping, live-session polling models, and projector-shell readiness for the QR phase.
- `pnpm --filter @attendease/web test` now also proves teacher analytics filter shaping, low-attendance email form shaping, and query-key behavior for analytics and automation workspaces.
- `pnpm --filter @attendease/worker test` now proves roster import row validation, duplicate detection, classroom announcement fan-out, and receipt persistence.
- later phases should follow this pattern instead of adding empty placeholder integration commands.

## CI Expectations

The phase-1 CI skeleton should enforce:

- workspace validation
- lint
- typecheck
- tests
- build

This keeps the scaffold honest while still leaving room for later jobs such as Playwright, Detox, migration checks, and deployment pipelines.

## Rules For Later Phases

- Do not leave risky business rules untested.
- Prefer unit coverage first for pure rules, then add integration coverage around boundaries.
- Add E2E coverage only for stable critical journeys to avoid flaky early suites.
- When device-specific behavior cannot be fully automated, add the best available automated coverage and document the remaining manual verification clearly in `Structure/context.md`.
- When a migration introduces raw SQL constraints, add at least one automated integration test that proves the DB rejects invalid writes.
