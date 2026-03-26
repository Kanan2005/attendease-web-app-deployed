# Phase Prompt: Release Readiness And Go-Live Validation

Use this playbook after all architecture phases are complete.

Execution order: Post-architecture closeout, after Phase 12.
Assume all earlier phases listed in `Structure/phase_prompting/README.md` are already implemented.

Purpose:

- validate the completed system end to end
- fix safe release-blocking issues discovered during verification
- capture clear pass/fail evidence
- produce a real go/no-go summary instead of a vague “almost done” state

Use [`../release-readiness-checklist.md`](../release-readiness-checklist.md) as the main source of truth.

## Prompt 1
```text
You are executing the AttendEase release-readiness plan.

Read these files first:
- Structure/context.md
- Structure/release-readiness-checklist.md
- Structure/final-tech-stack-and-implementation.md
- Structure/operations-runbook.md
- Structure/testing-strategy.md
- README.md

Inspect the current repo and local setup before making assumptions.

Your task for this step is to establish the release-readiness baseline:
- create or update a working verification report file at `Structure/release-readiness-report.md`
- organize that report with clear sections for:
  - environment/setup status
  - infrastructure health
  - teacher web checks
  - student mobile checks
  - teacher mobile checks
  - QR real-device checks
  - Bluetooth real-device checks
  - security/abuse checks
  - backup/recovery checks
  - performance/stability checks
  - pass/fail/blocker summary
- verify local prerequisites and environment assumptions from the checklist
- verify infra availability for PostgreSQL, Redis, MinIO, and Mailpit where possible
- verify or run the key workspace checks that make sense before feature validation
- verify health surfaces such as `/health`, `/health/ready`, `/health/queues`, and worker health where possible
- fix any safe configuration, startup, or health-check issues you find
- record concrete pass/fail/evidence notes in `Structure/release-readiness-report.md`
- update relevant docs if the real behavior differs from the current docs
- update `Structure/context.md` with current progress, checks run, blockers, and the exact next pickup point

Important constraints:
- do not redesign completed features
- do not invent fake verification results
- if something cannot be run in the current environment, mark it clearly as blocked or manual-required
- treat this as implementation plus verification, not just documentation

Run the relevant checks you can run locally, fix issues before stopping, and leave the repo/report in a trustworthy state.
```

## Prompt 2
```text
Continue the AttendEase release-readiness work from the current repo state.

Read these files first:
- Structure/context.md
- Structure/release-readiness-checklist.md
- Structure/release-readiness-report.md
- Structure/requirements/05-teacher-web-app.md
- Structure/architecture/05-teacher-web-app.md
- Structure/requirements/09-reports-exports.md
- Structure/requirements/10-analytics-email-automation.md

Now execute the teacher/admin web and backend critical-flow validation:
- verify login routing and protected route behavior
- verify teacher dashboard and admin dashboard loading behavior
- verify classroom CRUD, semester management, roster import/status, schedule editing, and classroom stream flows
- verify session history and manual edit flows from the shared API-backed web surfaces
- verify teacher reports, exports, analytics, and email automation flows
- verify QR session creation, active-session control, and projector route behavior
- verify admin device-support flows
- add or extend robust automated tests only where a real high-risk verification gap is discovered
- fix safe issues found during this pass
- record pass/fail/evidence in `Structure/release-readiness-report.md`
- sync any requirement, architecture, setup, or workflow docs that need correction
- update `Structure/context.md` with progress, tests added, blockers, and the exact next pickup point

Important constraints:
- prefer real API-backed verification over shallow static inspection
- do not mark a flow as passed unless you actually verified it
- if browser-only manual work is still needed, record exactly what remains

Run the relevant tests and checks you can run locally, fix issues before stopping, and leave a clear web-validation status in the report.
```

## Prompt 3
```text
Continue the AttendEase release-readiness work from the current repo state.

Read these files first:
- Structure/context.md
- Structure/release-readiness-checklist.md
- Structure/release-readiness-report.md
- Structure/requirements/03-student-mobile-app.md
- Structure/requirements/04-teacher-mobile-app.md
- Structure/requirements/06-qr-gps-attendance.md
- Structure/requirements/07-bluetooth-attendance.md
- Structure/architecture/03-student-mobile-app.md
- Structure/architecture/04-teacher-mobile-app.md
- Structure/architecture/06-qr-gps-attendance.md
- Structure/architecture/07-bluetooth-attendance.md

Now execute the mobile and attendance-mode validation:
- verify student mobile critical flows:
  - login
  - trusted-device state handling
  - dashboard
  - join classroom
  - classroom detail/stream/schedule
  - reports
  - device-status and blocked-attendance messaging
- verify teacher mobile critical flows:
  - login
  - teacher dashboard
  - classroom navigation
  - roster entrypoints
  - schedule save flow
  - announcement flow
  - session history/manual edit flow
  - report/export flow
- verify QR attendance flow as far as the current environment allows
- verify Bluetooth attendance flow as far as the current environment allows
- if real device execution is not possible here, produce exact manual test steps and mark those items as manual-required instead of pretending they passed
- add or extend automated tests only where a meaningful risky gap is discovered and can be covered safely
- fix safe mobile/runtime issues found during this pass
- record pass/fail/evidence/blockers in `Structure/release-readiness-report.md`
- sync any mobile or attendance docs that need correction
- update `Structure/context.md` with progress, tests added, blockers, and the exact next pickup point

Important constraints:
- do not replace real-device requirements with fake simulator-only confidence
- keep the current route/controller structure intact; do not redesign the flows during validation
- call out clearly which checks are host-only, emulator-only, or real-device-only

Run the relevant tests and checks you can run locally, fix issues before stopping, and leave the report with an honest mobile/attendance validation status.
```

## Prompt 4
```text
Continue the AttendEase release-readiness work from the current repo state.

Read these files first:
- Structure/context.md
- Structure/release-readiness-checklist.md
- Structure/release-readiness-report.md
- Structure/requirements/12-non-functional-requirements.md
- Structure/architecture/12-non-functional-requirements.md
- Structure/operations-runbook.md
- Structure/dockerization-plan.md

Now execute the operational, security, and rollout validation:
- verify abuse and access-control checks from the release checklist, especially:
  - same-phone multi-account prevention
  - second-device blocking
  - revoked-device blocking
  - teacher/admin route isolation
  - report/export/analytics scope correctness
- verify rollout flag behavior for Bluetooth, email automation, and strict device-binding mode
- verify rate-limit behavior where practical
- verify queue-health and stale-work recovery behavior where practical
- review backup/recovery readiness and document what is code-backed versus operations-only
- review observability readiness: request IDs, structured logs, Sentry/tracing config expectations
- review signed-download and retention behavior for export files
- review performance/stability risks for exports, imports, and worker cycles
- add or extend automated tests if a high-risk verification gap is found and can be covered safely
- fix safe issues found during this pass
- update `Structure/release-readiness-report.md` with pass/fail/evidence/blockers and operational caveats
- sync any requirement, architecture, README, or operations docs that need correction
- update `Structure/context.md` with progress, tests added, blockers, and the exact next pickup point

Important constraints:
- do not mark operational items complete unless there is real evidence
- clearly separate:
  - verified in code/tests
  - verified manually
  - still blocked by environment or external credentials
- use the Dockerization plan only as guidance here; do not automatically implement Docker unless the verification work truly requires it

Run the relevant tests and checks you can run locally, fix issues before stopping, and leave the report with a trustworthy operational-readiness status.
```

## Prompt 5
```text
Finish the AttendEase release-readiness effort with a final go/no-go review.

Read these files first:
- Structure/context.md
- Structure/release-readiness-checklist.md
- Structure/release-readiness-report.md
- Structure/operations-runbook.md
- README.md

Now do all of the following:
- review the full report and make sure every major checklist area is marked as:
  - passed
  - failed
  - blocked
  - manual-required
- verify the final report clearly distinguishes:
  - fully verified items
  - environment-blocked items
  - production-only setup items
  - accepted caveats
- add any final missing tests for critical release-blocking behavior if a safe high-value gap still exists
- do a final documentation sync for any docs touched during release-readiness work
- update `Structure/context.md` with completed scope, remaining gaps, and the exact next recommended action
- produce a final go/no-go summary in `Structure/release-readiness-report.md` that includes:
  - overall recommendation
  - launch blockers
  - accepted caveats
  - required production-only setup
  - exact remaining manual verification items
  - commands run
  - test files added or updated

Important constraints:
- do not give a “go” recommendation if release-blocking items are still unverified
- do not hide uncertainty; be explicit about blocked or manual-only areas
- keep the final recommendation evidence-based

Fix any safe issues and missing critical coverage before stopping, then leave the repo with a clean final readiness report and context handoff.
```
