# AttendEase Release Readiness Report

Last updated: 2026-03-16
Updated by: Codex

## Environment/Setup Status

Status: BLOCKED

- PASS: local toolchain prerequisites are present.
  - `node -v` -> `v22.12.0`
  - `pnpm -v` -> `9.12.3`
  - `docker version --format '{{.Server.Version}}'` -> `29.2.1`
  - `docker compose version` -> `Docker Compose version v5.1.0`
- PASS: committed example env files are present for root, API, web, mobile, and worker.
  - `rg --files -g '.env*'` -> `.env.example`, `apps/api/.env.example`, `apps/web/.env.example`, `apps/mobile/.env.example`, `apps/worker/.env.example`
- PASS: workspace baseline validation succeeded.
  - `pnpm workspace:validate` -> `Workspace validation passed.`
- PASS: full workspace validation succeeded.
  - `pnpm check` -> exited `0`
- MANUAL REQUIRED: real runtime secrets are not configured in this local baseline.
  - Google OIDC, SES, Sentry, and OTEL still require real env injection outside committed config.
- BLOCKER (local-only): host port `5432` is already owned by another local container on this machine.
  - first `pnpm runtime:up` failed with `Bind for 0.0.0.0:5432 failed: port is already allocated`
  - working local workaround: `POSTGRES_PORT=55432 pnpm runtime:up`

## Infrastructure Health

Status: PASS

- PASS: full containerized runtime boots successfully with the documented host-port override.
  - `POSTGRES_PORT=55432 pnpm runtime:up` -> exited `0`
  - `POSTGRES_PORT=55432 pnpm runtime:down` -> exited `0` after verification
- PASS: runtime compose stack is coherent and healthy.
  - `POSTGRES_PORT=55432 docker compose -f docker-compose.yml -f docker-compose.runtime.yml ps -a`
  - healthy running services: `postgres`, `redis`, `minio`, `mailpit`, `api`, `worker`, `web`
  - successful one-shot jobs: `migrate`, `bucket-init`
- PASS: migration sequencing worked.
  - `docker compose ... logs --no-color migrate` -> `No pending migrations to apply.`
- PASS: MinIO bucket initialization worked.
  - `docker compose ... logs --no-color bucket-init` -> `Bucket created successfully 'local/attendease-local'.`
- PASS: PostgreSQL is accepting connections in the runtime stack.
  - `docker compose ... exec -T postgres pg_isready -U attendease -d attendease` -> `/var/run/postgresql:5432 - accepting connections`
- PASS: Redis is responding in the runtime stack.
  - `docker compose ... exec -T redis redis-cli ping` -> `PONG`
- PASS: MinIO liveness endpoint responded successfully.
  - `curl -sf http://localhost:9000/minio/health/live` -> exited `0`
- PASS: Mailpit API responded successfully.
  - `curl -sf http://localhost:8025/api/v1/info` -> returned runtime info with `Messages: 0`

## Teacher Web Checks

Status: MANUAL REQUIRED

- PASS: teacher/admin route protection and login handoff behavior were verified against the running Docker runtime.
  - unauthenticated requests to `/teacher/dashboard` and `/admin/dashboard` return the protected-route card with `/login?next=...` handoff
  - teacher-cookie requests can load teacher routes and are denied from admin routes
  - admin-cookie requests can load admin routes and can still enter teacher routes
- PASS: teacher dashboard and admin dashboard shells load through the protected layouts.
  - verified routes: `/teacher/dashboard`, `/admin/dashboard`
- PASS: classroom, semester, roster-import, schedule-editing, and stream flows were verified through the shared API-backed web surfaces.
  - semester create -> update -> archive succeeded
  - semester activation guard correctly rejected activating a conflicting term when another semester was already active
  - classroom duplicate-scope guard correctly rejected a duplicate teacher-scope create
  - existing classroom update, join-code reset, schedule exception create, announcement post, roster import create/review/apply all succeeded
- PASS: session history, detail, and manual edit flows were verified from the shared API used by the web history surface.
  - a fresh QR session was created, ended, manually edited, and reverted successfully
  - history, detail, and session-student reads stayed consistent after the edit round-trip
- PASS: teacher reports, exports, analytics, and email automation flows were verified through the live backend.
  - teacher reports returned daywise, subjectwise, and student-percentage data
  - export request/list/detail succeeded and the signed file download returned HTTP `200`
  - analytics trend, distribution, comparison, mode usage, student-timeline, and session-drilldown calls all returned data
  - email preview, manual send, dispatch run, and email logs all succeeded
- PASS: QR session create/control/projector behavior was verified as far as the current local environment allows.
  - session create succeeded
  - active-session control and projector routes loaded against the live session ID
  - end-session control succeeded
- PASS: admin device-support flows were verified through the live backend.
  - revoke, approve replacement, delink, and approve replacement after delink all succeeded
- PASS: safe runtime issues found during this pass were fixed and re-verified.
  - empty-body POSTs in the shared auth client no longer send a forced JSON `content-type`, which unblocked live semester-archive/activate and session-end verification
  - export signed URLs now use `STORAGE_PUBLIC_ENDPOINT` for browser-facing downloads while uploads still use the internal MinIO endpoint
- PASS: targeted automated coverage for the highest-risk web/backend paths is still green after the fixes.
  - `pnpm --filter @attendease/web test -- src/web-portal.test.ts src/web-workflows.test.ts src/teacher-analytics-automation.test.ts` -> exited `0`
  - `pnpm --filter @attendease/api test -- src/modules/exports/exports.integration.test.ts src/modules/automation/automation.integration.test.ts src/modules/attendance/attendance-history.integration.test.ts` -> exited `0`
- PASS: local browser password login at `/login` now completes end to end on `http://localhost:3000` and issues usable teacher/admin session cookies.
  - fixed issue: web session cookies were being marked `Secure` on plain local HTTP, so the browser dropped them after login
  - re-verified with live local HTTP login and session-backed redirect into `/teacher/dashboard`
- MANUAL REQUIRED: a broader browser click-through pass is still needed for visual confidence across the teacher/admin route set.
  - local password sign-in is working, but the full production browser auth story still depends on real Google OIDC configuration and validation
- MANUAL REQUIRED: classroom create success-path was not live-verified in this seed set because all teacher-assigned scopes were already occupied.
  - duplicate rejection and existing-classroom management paths were verified instead

## Student Mobile Checks

Status: MANUAL REQUIRED

- PASS (host-only): student mobile controller and view-state coverage stayed green in the targeted mobile suite.
  - `pnpm --filter @attendease/mobile test -- src/student-session.test.ts src/student-foundation.test.ts src/student-attendance.test.ts src/student-query.test.ts src/student-view-state.test.ts src/device-trust.test.ts src/bluetooth-attendance.test.ts src/native/bluetooth/AttendEaseBluetooth.test.ts src/teacher-session.test.ts src/teacher-models.test.ts src/teacher-operational.test.ts src/teacher-query.test.ts src/teacher-schedule-draft.test.ts src/teacher-routes.test.ts src/student-routes.test.ts` -> exited `0`
- PASS (host-only): live student login, trusted-device readiness, dashboard data, classroom detail, classroom stream, classroom schedule, and blocked-attendance handling were verified against the running Docker runtime.
  - host-side runtime script logged in as `student.one@attendease.dev`
  - `GET /devices/trust/attendance-ready` with `seed-install-student-one` returned `ready: true`
  - the same call with a mismatched install ID returned `403` with `This device is not registered for attendance access.`
  - student dashboard built live counts for active classrooms, recent lectures, and trusted-device status
- PASS (host-only): classroom detail and schedule flows now work from the student role through the shared classroom endpoints.
  - safe fix applied in `apps/api/src/modules/academic/classrooms.controller.ts` and `apps/api/src/modules/academic/classrooms.service.ts`
  - students can now read their own classroom detail, schedule, and lectures while still receiving `403` for foreign classrooms
  - `activeJoinCode` is hidden from student detail responses
- PASS (host-only): student-visible announcement flow was verified against the live runtime.
  - a teacher-created student-visible stream post was returned in the student's classroom stream
- PASS (automated): join success and join rejection rules remain covered by API integration tests.
  - `pnpm --filter @attendease/api test -- src/modules/academic/classroom-roster.integration.test.ts` -> exited `0`
- MANUAL REQUIRED: the seeded runtime did not leave a joinable classroom for the validated student accounts, so the live host pass only confirmed the already-enrolled guard and membership visibility.
  - `student.two@attendease.dev` was already enrolled in both seeded classrooms during this pass
- PASS (automated): student mobile reports now use the final student report APIs instead of lecture-derived fallback coverage.
  - `pnpm --filter @attendease/mobile test -- src/student-query.test.ts src/student-view-state.test.ts src/student-workflow-models.test.ts src/student-foundation.test.ts` -> exited `0`
  - `pnpm --filter @attendease/api test -- src/modules/reports/reports.integration.test.ts` -> exited `0`
  - student report mapping now preserves backend attendance percentages and session totals instead of re-deriving from lecture counts
- PASS (host-only + automated): seeded student mobile report values now match the live backend student report APIs through the same mobile mapping helpers used by the report routes.
  - `ATTENDEASE_API_URL=http://127.0.0.1:4000 pnpm verify:mobile-reports` -> exited `0`
  - verified seeded student overview: `trackedClassroomCount: 2`, `totalSessions: 11`, `presentSessions: 6`, `absentSessions: 5`, `attendancePercentage: 54.55`
  - verified seeded subject summaries:
    - Mathematics -> `totalSessions: 9`, `attendancePercentage: 44.44`
    - Physics -> `totalSessions: 2`, `attendancePercentage: 100`
  - verified seeded math subject detail: `classroomCount: 1`, `totalSessions: 9`, `attendancePercentage: 44.44`
- PASS (emulator-native): the native Android debug-build path now compiles, installs, and launches on the emulator.
  - `pnpm --filter @attendease/mobile exec expo run:android -d Pixel_9_Pro_XL --port 8083 --no-install` -> `BUILD SUCCESSFUL`
  - resumed native activity: `com.anurag203.attendease/.MainActivity`
  - screenshot evidence shows the student dashboard rendering inside the native debug app package
- PASS (emulator-native, final reset acceptance): the reset-track native student flow was re-verified from the split role-entry screen through the current student shell.
  - verified in the native dev client by base launch plus in-app navigation:
    - split student/teacher mobile entry
    - student sign-in
    - student home
    - student reports
    - student attendance hub
    - student QR route
    - student Bluetooth route
  - artifact evidence:
    - `Structure/artifacts/android-prompt40-root-reset.png`
    - `Structure/artifacts/android-prompt40-student-home.png`
    - `Structure/artifacts/android-prompt40-student-reports.png`
    - `Structure/artifacts/android-prompt40-student-attendance.png`
    - `Structure/artifacts/android-prompt40-student-qr-route.png`
    - `Structure/artifacts/android-prompt40-student-bluetooth-route.png`
- MANUAL REQUIRED (real-device-only): Expo and device validation is still required for the actual mobile UX.
  - install a dev build, sign in as a seeded student account, and verify dashboard, device-status, classroom detail, stream, schedule, blocked-attendance messaging, and report screens on-device
  - verify a student can join a newly created classroom from a real phone once the runtime includes a joinable classroom for that test account
  - verify QR camera permission prompts and Bluetooth permission prompts on device instead of relying on host-side controller state only

## Teacher Mobile Checks

Status: MANUAL REQUIRED

- PASS (host-only): teacher mobile controller, role-gating, query-key, schedule-draft, and Bluetooth shell-state coverage stayed green in the targeted mobile suite.
  - `pnpm --filter @attendease/mobile typecheck` -> exited `0`
  - targeted mobile tests above -> exited `0`
- PASS (host-only): live teacher login, dashboard counts, classroom navigation inputs, roster entrypoints, schedule save flow, announcement flow, session history/manual edit flow, and export flow were verified against the running Docker runtime.
  - host-side runtime script logged in as `teacher@attendease.dev`
  - dashboard built live counts for classrooms, assignments, join codes, and recent sessions
  - classroom roster returned live members and announcement posting succeeded
  - schedule save-and-notify succeeded, then was reverted cleanly
  - session history edit round-trip changed counts once and returned them to the original final state after revert
  - export request completed and returned a ready signed download URL
- PASS (host-only): teacher mobile Bluetooth launch prerequisites were verified as far as the current host environment allows.
  - live Bluetooth attendance candidates were derived from current classroom and lecture data
  - backend Bluetooth create, duplicate protection, and end-session checks passed in the live runtime
- PASS (automated): teacher mobile reports now use the final teacher report APIs instead of lecture-derived fallback coverage.
  - `pnpm --filter @attendease/mobile test -- src/teacher-query.test.ts src/teacher-operational.test.ts` -> exited `0`
  - `pnpm --filter @attendease/mobile typecheck` -> exited `0`
  - `pnpm --filter @attendease/api test -- src/modules/reports/reports.integration.test.ts` -> exited `0`
  - the export route remains live and API-backed while the report route now reads day-wise, subject-wise, and student-percentage report rows
- PASS (host-only + automated): seeded teacher mobile report values now match the live backend teacher report APIs through the same mobile mapping helpers used by the report route.
  - `ATTENDEASE_API_URL=http://127.0.0.1:4000 pnpm verify:mobile-reports` -> exited `0`
  - verified teacher filter options: `classroomFilterCount: 2`, `subjectFilterCount: 2`
  - verified filtered math rows: `daywiseRowCount: 2`, `subjectwiseRowCount: 1`, `studentPercentageRowCount: 4`
  - verified teacher and student views stay aligned for seeded student one in mathematics: `totalSessions: 9`, `presentSessions: 4`, `absentSessions: 5`, `attendancePercentage: 44.44`
  - verified teacher mobile filter summary: `Classroom: Mathematics - Semester 6 A · Subject: Mathematics`
- PASS (emulator-native): the native debug app remains stable after install, but deterministic grouped-route deep links are still easier in Expo Go than in the native development client.
  - native package `com.anurag203.attendease` stayed launchable with no obvious startup crash after the BLE module fixes
  - direct grouped-route deep-link attempts in the native development client currently land on Expo Router `Unmatched Route`, so route-by-route sweeps still rely on Expo Go
- PASS (emulator-native, final reset acceptance): the reset-track native teacher flow was re-verified from the split role-entry screen through the current teacher review/operations surfaces.
  - verified in the native dev client by base launch plus in-app navigation:
    - teacher sign-in
    - teacher home
    - teacher reports
    - teacher session history
    - teacher session correction screen
    - teacher Bluetooth setup screen
  - artifact evidence:
    - `Structure/artifacts/android-prompt40-teacher-home.png`
    - `Structure/artifacts/android-prompt40-teacher-reports.png`
    - `Structure/artifacts/android-prompt40-teacher-session-history.png`
    - `Structure/artifacts/android-prompt40-teacher-session-detail.png`
    - `Structure/artifacts/android-prompt40-teacher-bluetooth-create.png`
- MANUAL REQUIRED (real-device-only): Expo and device validation is still required for the actual teacher phone UX.
  - run the teacher route group in a dev build
  - verify login, dashboard, classroom hub navigation, roster entrypoints, schedule draft save, announcement composer, session history/manual edit, report screen, export request screen, Bluetooth create screen, and active-session recovery states on device

## QR Real-Device Checks

Status: MANUAL REQUIRED

- PASS (host-only): the live QR backend path was verified end to end against the running Docker runtime.
  - teacher created a QR session successfully
  - student marked attendance successfully
  - duplicate mark was rejected with `409 Attendance has already been marked for this session.`
  - mark attempts after session end were rejected with `409 This attendance session is not active.`
- PASS (automated): QR token, GPS, duplicate protection, and error-mapping coverage remains green.
  - `pnpm --filter @attendease/api test -- src/modules/attendance/qr-attendance.integration.test.ts src/modules/attendance/bluetooth-attendance.integration.test.ts` -> exited `0`
  - targeted mobile tests include `src/student-attendance.test.ts` -> exited `0`
- PASS (emulator-native UX-only): the student QR route was re-verified in the native reset build for trusted-device messaging and clear empty/live-waiting state handling.
  - verified route copy:
    - `QR Attendance`
    - `No QR attendance session is open for your classrooms right now.`
  - artifact evidence:
    - `Structure/artifacts/android-prompt40-student-qr-route.png`
- MANUAL REQUIRED (real-device-only): real QR plus GPS verification still must be performed on actual hardware.
  - start a QR session from teacher web
  - open the active projector page in a real browser window
  - sign in on a real student phone, open QR attendance, grant camera and location permissions, scan the live projector code, and submit GPS
  - verify success banner, duplicate-mark banner, expired-or-ended-session banner, out-of-range GPS banner, and low-accuracy GPS banner on device
  - verify the teacher control page and projector page reflect the final marked count correctly

## Bluetooth Real-Device Checks

Status: MANUAL REQUIRED

- PASS (host-only): the live Bluetooth backend path was verified end to end against the running Docker runtime.
  - teacher created a Bluetooth session successfully
  - student marked attendance successfully
  - duplicate mark was rejected with `409 Attendance has already been marked for this session.`
  - mark attempts after session end were rejected with `409 This attendance session is not active.`
- PASS (automated): mocked BLE wrapper, teacher recovery models, scanner selection, and backend invalid or replay protection remain green.
  - targeted mobile tests include `src/bluetooth-attendance.test.ts`, `src/native/bluetooth/AttendEaseBluetooth.test.ts`, and `src/teacher-operational.test.ts`
  - targeted API tests include `src/modules/attendance/bluetooth-attendance.integration.test.ts`
- PASS (emulator-native UX-only): the student Bluetooth route and teacher Bluetooth setup route were re-verified in the native reset build for clean empty/live-waiting and setup-state UX.
  - verified route copy:
    - `Bluetooth Attendance`
    - `No Bluetooth attendance session is open for your classrooms right now.`
    - `Bluetooth Session`
  - artifact evidence:
    - `Structure/artifacts/android-prompt40-student-bluetooth-route.png`
    - `Structure/artifacts/android-prompt40-teacher-bluetooth-create.png`
- MANUAL REQUIRED (real-device-only): Android and iOS BLE validation still must be performed on actual hardware.
  - on teacher device, start a Bluetooth session and confirm advertiser start succeeds
  - verify Bluetooth-disabled and advertiser-start-failure messaging on teacher device
  - on student device, scan for sessions, choose the correct session when more than one is visible, and submit attendance
  - verify duplicate-mark handling, invalid or stale detection handling, and session-end rejection on the student device
  - verify teacher stop-session retry behavior on device
  - also follow `Structure/bluetooth-device-test-checklist.md`

## Security/Abuse Checks

Status: PASS

- PASS (host-only): the main student device-abuse protections were re-verified against the running Docker stack.
  - same-phone multi-account login attempt returned `403 Student authentication requires a trusted registered device.`
  - second-device registration returned `201` with binding state `BLOCKED` and reason `STUDENT_ALREADY_HAS_ANOTHER_DEVICE`
  - revoked-device attendance readiness returned `403 This device is not trusted for attendance access.`
- PASS (host-only): teacher/admin route isolation and report/export/analytics scope checks were re-verified live.
  - teacher and student access to `/admin/device-bindings` both returned `403`
  - admin access to `/admin/device-bindings?query=student.one` returned `200`
  - student access to `/reports/daywise`, `/exports`, and `/analytics/trends` returned `403`
  - teacher access to the same report/export/analytics routes returned `200`
- PASS (host-only): auth and attendance rate limiting were exercised against the live runtime.
  - repeated `/auth/login` attempts from one forwarded IP returned `429` on the 11th request with the current runtime limits
  - repeated `/attendance/qr/mark` attempts returned `429` on the 7th request after one success plus duplicate attempts with the current runtime limits
- PASS (automated): rollout-flag behavior is now covered for all three release-sensitive toggles.
  - `pnpm --filter @attendease/api test -- src/infrastructure/non-functional.integration.test.ts` -> exited `0`
  - verified `FEATURE_BLUETOOTH_ATTENDANCE_ENABLED=false` returns `503`
  - verified `FEATURE_EMAIL_AUTOMATION_ENABLED=false` returns `503`
  - verified `FEATURE_STRICT_DEVICE_BINDING_MODE=AUDIT` allows student login while surfacing `deviceTrust.state: MISSING_CONTEXT`
- PASS (host-only + automated): observability and request-correlation basics are now evidenced.
  - request validation failure returned the caller-supplied `x-request-id` in both the response header and response body
  - API runtime logs include structured JSON lines with `requestId`, `statusCode`, `method`, and `path`
  - `pnpm --filter @attendease/api test -- src/health/health.service.test.ts src/infrastructure/api-logger.service.test.ts src/infrastructure/request-context.middleware.test.ts src/infrastructure/api-exception.filter.test.ts src/infrastructure/feature-flags.service.test.ts` -> exited `0`
- PASS: queue-health and liveness endpoints are available in the runtime stack.
  - `/health`, `/health/ready`, `/health/queues`, and worker `pnpm health` all succeeded through runtime checks
- PASS (automated): suspicious attendance failures remain separated from attendance truth and are logged into security events.
  - `pnpm --filter @attendease/api test -- src/modules/attendance/qr-attendance.integration.test.ts src/modules/attendance/bluetooth-attendance.integration.test.ts src/modules/attendance/attendance-history.integration.test.ts` -> exited `0`
  - QR location failures and invalid BLE attempts remain covered without changing present or absent truth

## Backup/Recovery Checks

Status: MANUAL REQUIRED

- PASS: operational documentation exists for Docker runtime startup, health checks, queue triage, and backup/recovery guidance.
  - source: `Structure/operations-runbook.md`
- PASS (host-only): PostgreSQL backup and restore were exercised with a full dump and temp-database restore inside the running Docker stack.
  - `pg_dump -Fc -U attendease -d attendease -f /tmp/attendease_release_full.dump`
  - `pg_restore -U attendease -d attendease_restore_check /tmp/attendease_release_full.dump`
  - restore verification query returned `restored_sessions = 11`
- PASS (host-only): queue-health degradation and stale-work recovery were exercised live.
  - worker was stopped
  - a real export job was forced into stale `PROCESSING`
  - `/health/queues` returned `status: degraded` with `exports.status: stalled` and `staleCount: 1`
  - worker restart reclaimed the stale job, completed the export, and `/health/queues` returned to `healthy`
- MANUAL REQUIRED: object-storage backup and restore are still operations-only.
  - signed-download retention and public URL shaping are code-backed
  - bucket backup/versioning and actual object recovery were not exercised in this local pass

## Performance/Stability Checks

Status: MANUAL REQUIRED

- PASS: queue-health surface reports all queues healthy with zero backlog in the runtime stack.
  - `curl -sf http://localhost:4000/health/queues` -> `exports`, `roster-imports`, `announcement-fanout`, `analytics-refresh`, and `email-dispatch` all `healthy`
- PASS: worker health succeeded in-container.
  - `pnpm runtime:check` -> worker health `{"service":"worker","status":"ok","version":"0.1.0",...}`
- PASS: containerized smoke validation succeeded.
  - `pnpm runtime:check` -> API health, readiness, queue health, web health, and worker health all passed
- PASS (host-only): export retention behavior is enforced at the API response layer.
  - after forcing an export file `expiresAt` into the past, `GET /exports/:id` returned `readyFileCount: 0`, `latestReadyDownloadUrl: null`, file `status: EXPIRED`, and file `downloadUrl: null`
- PASS (code/test + host-only): stale-work recovery protections are aligned with the queue-health surface.
  - live runtime drill confirmed stale export-job recovery after worker restart
  - worker reclaim behavior remains covered in the queue and processor test suites
- MANUAL REQUIRED: no load test, soak test, large export/import timing test, or production-like concurrency run was executed in this baseline.

## Final Recommendation

Overall recommendation: NO-GO

Reason:

- release-blocking items remain unresolved or unverified
- QR and Bluetooth real-device validation are still manual-required
- production observability and production service credentials are still environment-blocked
- the current environment only had the Android emulator attached during the final reset pass, so physical-phone signoff could not be completed in this session

## Checklist Status Matrix

- Environment/setup: BLOCKED
- Infrastructure health: PASS
- Teacher web: MANUAL REQUIRED
- Student mobile: MANUAL REQUIRED
- Teacher mobile: MANUAL REQUIRED
- QR attendance real-device validation: MANUAL REQUIRED
- Bluetooth attendance real-device validation: MANUAL REQUIRED
- Security/abuse: PASS
- Backup/recovery: MANUAL REQUIRED
- Performance/stability: MANUAL REQUIRED

## Launch Blockers

- BLOCKER: production/staging environment configuration for Google OIDC, SES, Sentry, and OTEL has not been validated with real credentials.
- BLOCKER: QR and Bluetooth real-device validation has not been completed on actual phones.

## Resolved Mobile Report Blockers

- RESOLVED: student mobile report routes no longer use lecture-derived fallback coverage and now read the final student report APIs.
  - evidence: `pnpm verify:mobile-reports` plus the targeted student mobile and reports API test runs
- RESOLVED: teacher mobile report routes no longer use lecture-derived fallback coverage and now read the final teacher day-wise, subject-wise, and student-percentage report APIs.
  - evidence: `pnpm verify:mobile-reports` plus the targeted teacher mobile and reports API test runs
- NOT A CURRENT LAUNCH BLOCKER: student and teacher mobile reports still require emulator and real-phone visual validation, but that is now a manual verification task rather than a code-truth mismatch.

## Fully Verified Items

- PASS: local containerized runtime, migration sequencing, bucket init, health, readiness, queue health, and worker health.
- PASS: teacher/admin API-backed web workflows, including semester, classroom, roster import, schedule, stream, session history/manual edit, reports, exports, analytics, email automation, QR control/projector routes, and admin device recovery APIs.
- PASS: local browser password sign-in at `/login` now issues working teacher/admin session cookies on `http://localhost:3000` and redirects into the protected portal routes.
- PASS: core abuse protections, route isolation, scoped report/export/analytics access, rollout-flag fail-closed behavior, request-ID propagation, structured logs, and rate limiting.
- PASS: queue degradation and stale-work recovery for exports.
- PASS: export retention logic that suppresses signed URLs after expiry.
- PASS: PostgreSQL backup and restore viability in the Docker runtime.
- PASS: student and teacher mobile report routes now share the live backend report truth, with seeded host-side proof captured through `pnpm verify:mobile-reports`.

## Environment-Blocked Items

- BLOCKED: real Google OIDC client configuration and browser-based sign-in issuance outside the local password helper.
- BLOCKED: real SES delivery validation.
- BLOCKED: real Sentry DSN capture and OTEL trace export validation.
- BLOCKED: production object-storage recovery validation beyond signed-download shaping.

## Production-Only Setup Required

- configure real auth secrets and Google OIDC envs
- configure real storage bucket, public endpoint, and retention/versioning policy
- configure real SES credentials and sender settings if email automation launches enabled
- configure Sentry DSN and OTEL exporter endpoint
- choose launch rollout values for Bluetooth and email automation
- decide whether Bluetooth launches enabled or stays pilot/disabled until device validation is finished

## Accepted Caveats

- local host-port `5432` conflict is machine-specific and not a product blocker because `POSTGRES_PORT=55432` works
- realtime updates still rely on polling where already implemented; live push transport remains a future seam
- BullMQ-backed orchestration is still optional hardening and not required for current contracts
- SES bounce/complaint feedback is still deferred and should be accepted explicitly if email automation launches

## Remaining Manual Verification Items

- teacher/admin browser click-through with real cookie issuance after login UX completion
- student mobile dev-build verification for dashboard, join classroom, classroom detail, stream, schedule, reports, device status, and blocked-attendance messaging
- teacher mobile dev-build verification for dashboard, classroom hub, schedule save, announcements, history/manual edit, reports, exports, and Bluetooth session shells
- QR real-device flow with live camera scan, GPS permission denial, out-of-range, low-accuracy, duplicate mark, and post-end rejection
- Bluetooth real-device flow on Android and iOS for advertiser start, disabled-state handling, scan selection, duplicate mark, replay rejection, and stop retry
- object-storage backup and restore validation
- staging verification for Sentry and OTEL

## Pass/Fail/Blocker Summary

- PASS:
  - local toolchain prerequisites are present
  - full workspace validation succeeds (`pnpm check`)
  - containerized runtime works locally with `POSTGRES_PORT=55432`
  - infrastructure health is good for PostgreSQL, Redis, MinIO, Mailpit, API, worker, and web
  - migrations and MinIO bucket initialization complete successfully
  - API liveness, readiness, and queue-health surfaces work
  - worker health works
  - teacher/admin protected-route behavior, dashboard shells, semester management, classroom management, roster import, schedule editing, classroom stream, session history/manual edit, reports, exports, analytics, email automation, QR control/projector, and admin device-support flows were verified against the running Docker stack
  - student mobile host-side validation now confirms live login, trusted-device gating, classroom detail, classroom stream, classroom schedule, and announcement visibility against the running Docker stack
  - teacher mobile host-side validation now confirms live login, dashboard inputs, roster entrypoints, schedule save/revert, announcement posting, session history/manual edit, export request flow, and Bluetooth session prerequisites against the running Docker stack
  - live host-side QR and Bluetooth attendance checks now confirm successful mark, duplicate rejection, and post-end rejection against the running Docker stack
  - security/abuse validation now confirms same-phone multi-account prevention, second-device blocking, revoked-device blocking, teacher/admin route isolation, report/export/analytics scope correctness, live auth/attendance rate limiting, queue degradation/recovery, export retention enforcement, structured request-ID logging, and PostgreSQL restore viability
- MANUAL REQUIRED:
  - browser-based teacher/admin visual validation across the wider route set
  - real-device student and teacher mobile flows
  - QR camera + GPS real-device checks
  - Bluetooth advertiser/scanner real-device checks
  - object-storage backup/restore validation
  - production env setup validation for OIDC, SES, Sentry, and OTEL
- BLOCKERS:
  - production service credentials and observability wiring remain unvalidated in a real environment
  - QR and Bluetooth still require real-device signoff before launch unless Bluetooth is explicitly disabled for the first rollout

## Reset Track Final Acceptance

- PASS: the full reset-track targeted regression pass completed across backend, mobile, web, and integration suites on 2026-03-16.
- PASS: final typecheck/build/runtime validation completed for:
  - `@attendease/api`
  - `@attendease/mobile`
  - `@attendease/web`
  - Docker runtime health
  - workspace validation
- PASS: native Android acceptance completed for the reset-track student and teacher mobile shells using the current dev-client base-launch path plus in-app navigation.
- KNOWN CAVEAT: direct route deep links in the native Android development client can still land on Expo Router `Unmatched Route`; use base dev-client launch plus in-app navigation for deterministic acceptance checks.
- BLOCKED: this session did not have a physical phone attached through `adb`, so real-device QR camera, GPS, and BLE proximity validation still remain open.

## Test Files Added Or Updated During Release-Readiness

- [packages/auth/src/client.test.ts](/Users/anuagar2/Desktop/practice/Attendease/packages/auth/src/client.test.ts)
- [packages/export/src/index.test.ts](/Users/anuagar2/Desktop/practice/Attendease/packages/export/src/index.test.ts)
- [packages/config/src/index.test.ts](/Users/anuagar2/Desktop/practice/Attendease/packages/config/src/index.test.ts)
- [apps/web/src/web-portal.test.ts](/Users/anuagar2/Desktop/practice/Attendease/apps/web/src/web-portal.test.ts)
- [apps/web/src/web-auth-session.test.ts](/Users/anuagar2/Desktop/practice/Attendease/apps/web/src/web-auth-session.test.ts)
- [apps/web/src/web-workflows.test.ts](/Users/anuagar2/Desktop/practice/Attendease/apps/web/src/web-workflows.test.ts)
- [apps/web/src/teacher-analytics-automation.test.ts](/Users/anuagar2/Desktop/practice/Attendease/apps/web/src/teacher-analytics-automation.test.ts)
- [apps/api/src/modules/exports/exports.integration.test.ts](/Users/anuagar2/Desktop/practice/Attendease/apps/api/src/modules/exports/exports.integration.test.ts)
- [apps/api/src/modules/automation/automation.integration.test.ts](/Users/anuagar2/Desktop/practice/Attendease/apps/api/src/modules/automation/automation.integration.test.ts)
- [apps/api/src/modules/attendance/attendance-history.integration.test.ts](/Users/anuagar2/Desktop/practice/Attendease/apps/api/src/modules/attendance/attendance-history.integration.test.ts)
- [apps/api/src/modules/academic/classroom-roster.integration.test.ts](/Users/anuagar2/Desktop/practice/Attendease/apps/api/src/modules/academic/classroom-roster.integration.test.ts)
- [apps/api/src/infrastructure/non-functional.integration.test.ts](/Users/anuagar2/Desktop/practice/Attendease/apps/api/src/infrastructure/non-functional.integration.test.ts)
- [apps/mobile/src/student-foundation.test.ts](/Users/anuagar2/Desktop/practice/Attendease/apps/mobile/src/student-foundation.test.ts)
- [apps/mobile/src/student-workflow-models.test.ts](/Users/anuagar2/Desktop/practice/Attendease/apps/mobile/src/student-workflow-models.test.ts)
- [apps/mobile/src/teacher-models.test.ts](/Users/anuagar2/Desktop/practice/Attendease/apps/mobile/src/teacher-models.test.ts)
- [apps/mobile/src/teacher-operational.test.ts](/Users/anuagar2/Desktop/practice/Attendease/apps/mobile/src/teacher-operational.test.ts)

## Commands Run

```bash
node -v
pnpm -v
docker version --format '{{.Server.Version}}'
docker compose version
rg --files -g '.env*'
lsof -nP -iTCP -sTCP:LISTEN | rg ':(5432|6379|9000|9001|1025|8025|3000|4000)\b' || true
rg -n 'runtime:' package.json
pnpm workspace:validate
pnpm runtime:config
pnpm runtime:up
pnpm runtime:down
lsof -nP -iTCP:5432 -sTCP:LISTEN || true
docker ps --format 'table {{.Names}}\t{{.Ports}}'
POSTGRES_PORT=55432 pnpm runtime:up
POSTGRES_PORT=55432 pnpm runtime:down
pnpm runtime:check
curl -sf http://localhost:4000/health
curl -sf http://localhost:4000/health/ready
curl -sf http://localhost:4000/health/queues
curl -sf http://localhost:3000/health
docker compose -f docker-compose.yml -f docker-compose.runtime.yml exec -T postgres pg_isready -U attendease -d attendease
docker compose -f docker-compose.yml -f docker-compose.runtime.yml exec -T redis redis-cli ping
curl -sf http://localhost:9000/minio/health/live
curl -sf http://localhost:8025/api/v1/info
POSTGRES_PORT=55432 docker compose -f docker-compose.yml -f docker-compose.runtime.yml ps
POSTGRES_PORT=55432 docker compose -f docker-compose.yml -f docker-compose.runtime.yml ps -a
POSTGRES_PORT=55432 docker compose -f docker-compose.yml -f docker-compose.runtime.yml logs --no-color migrate bucket-init
pnpm check
POSTGRES_PORT=55432 docker compose -f docker-compose.yml -f docker-compose.runtime.yml exec -T api pnpm --filter @attendease/db seed:dev
pnpm --filter @attendease/auth test -- src/client.test.ts
pnpm --filter @attendease/export test -- src/index.test.ts
pnpm --filter @attendease/config test -- src/index.test.ts
pnpm --filter @attendease/web test -- src/web-portal.test.ts src/web-workflows.test.ts src/teacher-analytics-automation.test.ts
pnpm --filter @attendease/api test -- src/modules/exports/exports.integration.test.ts src/modules/automation/automation.integration.test.ts src/modules/attendance/attendance-history.integration.test.ts
pnpm --filter @attendease/web typecheck
POSTGRES_PORT=55432 pnpm runtime:check
POSTGRES_PORT=55432 pnpm runtime:build
POSTGRES_PORT=55432 pnpm runtime:up
pnpm --filter @attendease/mobile test -- src/student-session.test.ts src/student-foundation.test.ts src/student-attendance.test.ts src/student-query.test.ts src/student-view-state.test.ts src/device-trust.test.ts src/bluetooth-attendance.test.ts src/native/bluetooth/AttendEaseBluetooth.test.ts src/teacher-session.test.ts src/teacher-models.test.ts src/teacher-operational.test.ts src/teacher-query.test.ts src/teacher-schedule-draft.test.ts src/teacher-routes.test.ts src/student-routes.test.ts
pnpm --filter @attendease/mobile typecheck
pnpm exec biome check --write apps/api/src/modules/academic/classrooms.controller.ts apps/api/src/modules/academic/classrooms.service.ts apps/api/src/modules/academic/classroom-roster.integration.test.ts
pnpm --filter @attendease/api test -- src/modules/academic/classroom-roster.integration.test.ts
pnpm --filter @attendease/api test -- src/modules/attendance/qr-attendance.integration.test.ts src/modules/attendance/bluetooth-attendance.integration.test.ts
pnpm --filter @attendease/api typecheck
pnpm exec tsx  # ad-hoc host-side live mobile and attendance validation script against http://127.0.0.1:4000
POSTGRES_PORT=55432 docker compose -f docker-compose.yml -f docker-compose.runtime.yml logs --since=10m api | rg -n 'req_release_ops_1|http\\.request|requestId'
POSTGRES_PORT=55432 docker compose -f docker-compose.yml -f docker-compose.runtime.yml stop worker
node  # ad-hoc host-side live operational validation scripts against http://127.0.0.1:4000
POSTGRES_PORT=55432 docker compose -f docker-compose.yml -f docker-compose.runtime.yml exec -T postgres psql -U attendease -d attendease -c '\\d export_jobs'
POSTGRES_PORT=55432 docker compose -f docker-compose.yml -f docker-compose.runtime.yml exec -T postgres psql -U attendease -d attendease -c 'UPDATE export_jobs SET status=''PROCESSING'', \"startedAt\"=''2026-03-14 00:00:00'' WHERE id=''cmmr7ap1i004v10rl6q69108o'';'
curl -sf http://localhost:4000/health/queues
POSTGRES_PORT=55432 docker compose -f docker-compose.yml -f docker-compose.runtime.yml start worker
POSTGRES_PORT=55432 docker compose -f docker-compose.yml -f docker-compose.runtime.yml exec -T postgres psql -U attendease -d attendease -c 'UPDATE export_job_files SET \"expiresAt\"=''2026-03-14 00:00:00'' WHERE id=''cmmr7bc60000010myucmdgagl'';'
POSTGRES_PORT=55432 docker compose -f docker-compose.yml -f docker-compose.runtime.yml exec -T postgres sh -lc 'dropdb -U attendease --if-exists attendease_restore_check; createdb -U attendease attendease_restore_check; pg_dump -Fc -U attendease -d attendease -f /tmp/attendease_release_full.dump; pg_restore -U attendease -d attendease_restore_check /tmp/attendease_release_full.dump; psql -U attendease -d attendease_restore_check -c \"SELECT count(*) AS restored_sessions FROM attendance_sessions;\"; dropdb -U attendease attendease_restore_check'
pnpm --filter @attendease/api test -- src/infrastructure/non-functional.integration.test.ts
pnpm --filter @attendease/api test -- src/health/health.service.test.ts src/infrastructure/api-logger.service.test.ts src/infrastructure/request-context.middleware.test.ts src/infrastructure/api-exception.filter.test.ts src/infrastructure/feature-flags.service.test.ts
POSTGRES_PORT=55432 pnpm manual:prepare
ATTENDEASE_API_URL=http://127.0.0.1:4000 pnpm verify:mobile-reports
pnpm --filter @attendease/mobile test -- src/student-foundation.test.ts src/student-view-state.test.ts src/student-workflow-models.test.ts src/student-query.test.ts src/teacher-models.test.ts src/teacher-operational.test.ts src/teacher-query.test.ts
pnpm --filter @attendease/mobile typecheck
pnpm --filter @attendease/api test -- src/modules/reports/reports.integration.test.ts
```

## Exact Next Recommended Action

- complete the remaining physical-device validation using:
  - `guide.md`
  - `Structure/manual-check-quickstart.md`
  - `Structure/bluetooth-device-test-checklist.md`
- then:
  - validate production/staging Google OIDC, SES, Sentry, and OTEL setup with real credentials
  - update this report to either `GO` or `NO-GO` after those environment and hardware checks complete
