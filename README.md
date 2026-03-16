# AttendEase

AttendEase is a smart attendance platform with:

- one shared mobile app for students and teachers
- one teacher/admin web app
- one backend API
- one background worker

This repository now contains the reset-track product implementation through Prompt 39, using the approved final stack:

- `pnpm` workspaces + `Turborepo`
- React Native with Expo prebuild and Expo Router
- Next.js App Router
- NestJS with Fastify
- PostgreSQL, Redis, BullMQ, S3-compatible storage, and SES-compatible email adapters

For the current local runtime, the wired services are PostgreSQL, Redis, MinIO, and Mailpit. Production adapters such as SES-backed email and full BullMQ rollout remain environment-validation work rather than missing reset-track UX work.

## Current Reset Product State

The repo now implements:

- separate student and teacher entry inside one shared mobile app
- student self-registration with one-device binding
- teacher self-registration on mobile and web
- teacher mobile classroom, roster, Bluetooth attendance, history, reports, and export entry flows
- teacher web classroom, QR + GPS attendance, history, reports, exports, analytics, and email automation flows
- admin web student support, device recovery, imports, and semester/classroom governance flows
- shared final attendance truth across history, reports, exports, and manual corrections

What still remains outside the reset implementation story:

- real-device QR, GPS, and Bluetooth signoff
- production validation for Google OIDC, SES, Sentry, and OTEL

## Workspace Layout

```text
apps/
  api/
  mobile/
  web/
  worker/
packages/
  auth/
  config/
  contracts/
  db/
  domain/
  email/
  export/
  notifications/
  realtime/
  ui-mobile/
  ui-web/
  utils/
Structure/
  requirements/
  architecture/
  codebase-structure.md
  phase_promptioing/
  context.md
```

## Code Organization

The route-facing barrels remain stable while the large screen/workspace implementations now live in
smaller feature folders.

Use [Structure/codebase-structure.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/codebase-structure.md)
before adding new files or expanding an existing screen, especially in:

- `apps/mobile/src/student-foundation`
- `apps/mobile/src/teacher-foundation`
- `apps/web/src/teacher-workflows-client`
- `apps/web/src/admin-workflows-client`

## Quick Start

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` and the relevant app-level `.env.example` files into the environment files you need.
   - If `localhost:5432` is already occupied on your machine, point `DATABASE_URL` or `TEST_DATABASE_URL` to another reachable PostgreSQL instance before running DB integration checks.
   - For auth work, set the JWT and Google OIDC values if you want to test against a real Google client instead of the local defaults.
   - Server auth envs: `AUTH_ISSUER`, `AUTH_AUDIENCE`, `AUTH_ACCESS_TOKEN_SECRET`, `AUTH_ACCESS_TOKEN_TTL_MINUTES`, `AUTH_REFRESH_TOKEN_TTL_DAYS`, `GOOGLE_OIDC_CLIENT_ID`, `GOOGLE_OIDC_CLIENT_SECRET`, `GOOGLE_OIDC_REDIRECT_URI`, `GOOGLE_TEACHER_ALLOWED_DOMAINS`, `GOOGLE_STUDENT_ALLOWED_DOMAINS`
   - QR + GPS envs: `ATTENDANCE_QR_ALLOWED_CLOCK_SKEW_SLICES`, `ATTENDANCE_GPS_MAX_ACCURACY_METERS`
   - Bluetooth envs: `ATTENDANCE_BLUETOOTH_ALLOWED_CLOCK_SKEW_SLICES`, `ATTENDANCE_BLUETOOTH_PROTOCOL_VERSION`, `ATTENDANCE_BLUETOOTH_SERVICE_UUID`, `EXPO_PUBLIC_ATTENDANCE_BLUETOOTH_SERVICE_UUID`
   - export storage envs: `STORAGE_ENDPOINT`, `STORAGE_PUBLIC_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_FORCE_PATH_STYLE`, `STORAGE_SIGNED_URL_TTL_SECONDS`, `EXPORT_FILE_TTL_HOURS`
   - email automation envs: `EMAIL_PROVIDER_MODE`, `EMAIL_FROM_ADDRESS`, `EMAIL_REPLY_TO_ADDRESS`, `AWS_SES_REGION`, `AWS_SES_ACCESS_KEY_ID`, `AWS_SES_SECRET_ACCESS_KEY`, `AWS_SES_ENDPOINT`, `AWS_SES_CONFIGURATION_SET`
   - observability envs: `REQUEST_ID_HEADER`, `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `TRACING_ENABLED`, `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`
   - rate-limit envs: `RATE_LIMIT_ENABLED`, `RATE_LIMIT_STORE_MODE`, `AUTH_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_SECONDS`, `ATTENDANCE_MARK_RATE_LIMIT_MAX`, `ATTENDANCE_MARK_RATE_LIMIT_WINDOW_SECONDS`
   - rollout envs: `FEATURE_BLUETOOTH_ATTENDANCE_ENABLED`, `FEATURE_EMAIL_AUTOMATION_ENABLED`, `FEATURE_STRICT_DEVICE_BINDING_MODE`, `NEXT_PUBLIC_FEATURE_BLUETOOTH_ATTENDANCE_ENABLED`, `NEXT_PUBLIC_FEATURE_EMAIL_AUTOMATION_ENABLED`, `EXPO_PUBLIC_FEATURE_BLUETOOTH_ATTENDANCE_ENABLED`, `EXPO_PUBLIC_FEATURE_EMAIL_AUTOMATION_ENABLED`
   - worker reliability envs: `WORKER_CYCLE_INTERVAL_MS`, `ROSTER_IMPORT_BATCH_SIZE`, `ANNOUNCEMENT_FANOUT_BATCH_SIZE`, `ANALYTICS_REFRESH_BATCH_SIZE`, `EXPORT_JOB_BATCH_SIZE`, `EMAIL_AUTOMATION_SCHEDULE_BATCH_SIZE`, `EMAIL_AUTOMATION_PROCESS_BATCH_SIZE`, `ROSTER_IMPORT_STUCK_TIMEOUT_MS`, `OUTBOX_STUCK_TIMEOUT_MS`, `EXPORT_JOB_STUCK_TIMEOUT_MS`, `EMAIL_AUTOMATION_STUCK_DISPATCH_TIMEOUT_MS`, `QUEUE_HEALTH_STALE_AFTER_MS`
   - Device attestation placeholder envs: `DEVICE_ATTESTATION_ANDROID_MODE`, `DEVICE_ATTESTATION_APPLE_MODE`, `EXPO_PUBLIC_DEVICE_ATTESTATION_ANDROID_MODE`, `EXPO_PUBLIC_DEVICE_ATTESTATION_APPLE_MODE`
   - Client bootstrap envs: `NEXT_PUBLIC_GOOGLE_OIDC_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_OIDC_CLIENT_ID`
   - Optional mobile dev-login envs: `EXPO_PUBLIC_STUDENT_DEV_EMAIL`, `EXPO_PUBLIC_STUDENT_DEV_PASSWORD`, `EXPO_PUBLIC_TEACHER_DEV_EMAIL`, `EXPO_PUBLIC_TEACHER_DEV_PASSWORD`
3. Start local services with `pnpm infra:up`.
4. Run the apps you need:
   - `pnpm dev:web`
   - `pnpm dev:api`
   - `pnpm dev:worker`
   - `pnpm dev:mobile`
   - or boot all runtime apps together with `pnpm dev`
5. Prepare the database package when working on backend phases:
   - `pnpm --filter @attendease/db prisma:generate`
   - `pnpm --filter @attendease/db migrate:deploy`
   - `pnpm --filter @attendease/db seed:dev`
   - `pnpm --filter @attendease/db test:integration`
6. Verify the workspace with `pnpm workspace:validate`, `pnpm check`, and `pnpm build`.

For reset-track micro-prompts, prefer the focused validation commands instead of rerunning every suite:

- `POSTGRES_PORT=55432 pnpm test:api:integration -- src/modules/auth/auth.integration.test.ts`
- `pnpm test:api:targeted -- src/test/integration-helpers.test.ts`
- `pnpm test:mobile:targeted -- src/student-foundation.test.ts src/student-query.test.ts`
- `pnpm test:web:targeted -- src/web-portal.test.ts`
- `pnpm android:validate:help`
- `pnpm android:validate -- -d emulator-5554 --port 8083 --no-install`

## Core Scripts

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm workspace:validate`
- `pnpm check`
- `pnpm build`
- `pnpm test:api:targeted -- <files...>`
- `pnpm test:api:integration -- [integration-files...]`
- `pnpm test:mobile:targeted -- <files...>`
- `pnpm test:web:targeted -- <files...>`
- `pnpm infra:up`
- `pnpm infra:down`
- `pnpm runtime:config`
- `pnpm runtime:build`
- `pnpm runtime:up`
- `pnpm runtime:smoke`
- `pnpm runtime:check`
- `pnpm runtime:down`
- `pnpm manual:info`
- `pnpm manual:prepare`
- `pnpm manual:mobile`
- `pnpm manual:mobile:emulator -- --device <emulator-serial> --port <port> [--api-port <port>]`
- `pnpm verify:mobile-reports`
- `pnpm audit:matrix`
- `pnpm audit:screenshots:mobile`
- `pnpm audit:screenshots:web`
- `pnpm android:validate:help`
- `pnpm android:validate -- --device <device> --port <port> [--no-install]`
- `pnpm --filter @attendease/db prisma:validate`
- `pnpm --filter @attendease/db prisma:generate`
- `pnpm --filter @attendease/db migrate:deploy`
- `pnpm --filter @attendease/db seed:dev`
- `pnpm --filter @attendease/db seed:dev:test-url`
- `pnpm --filter @attendease/db test:integration`
- `pnpm --filter @attendease/api test`
- `pnpm --filter @attendease/api typecheck`

## Reset Prompt Validation Shortcuts

The reset-track prompts are expected to use focused validation instead of full-suite reruns after every micro-phase.

Use:

- `pnpm test:api:targeted -- <files...>` for focused API unit/helper coverage
- `pnpm test:api:integration -- [integration-files...]` for focused API integration runs
- `pnpm test:mobile:targeted -- <files...>` for focused mobile shell checks
- `pnpm test:web:targeted -- <files...>` for focused web shell checks
- `pnpm android:validate:help` to confirm native Android command availability
- `pnpm android:validate -- -d <device> --port <port> [--no-install]` for native Android debug-build prompts
- `pnpm manual:mobile` for real-phone LAN checks
- `pnpm manual:mobile:emulator -- --device emulator-5554 --port 8101` for emulator-safe localhost checks with `adb reverse`
- `pnpm audit:matrix` to regenerate the full product screenshot audit at `Structure/full-product-screenshot-audit.md`
- `pnpm audit:screenshots:mobile` to refresh deterministic mobile audit artifacts under `Structure/artifacts/full-product-audit/mobile`
- `pnpm audit:screenshots:web` to refresh deterministic teacher/admin web audit artifacts under `Structure/artifacts/full-product-audit/web`

Targeted API integration note:

- the API integration helper now resolves PostgreSQL from `TEST_DATABASE_URL`, `DATABASE_URL`, `TEST_DATABASE_PORT`, or `POSTGRES_PORT`
- if your local Docker runtime publishes PostgreSQL on `55432`, run targeted API integration checks with `POSTGRES_PORT=55432`

Mobile verification note:

- `pnpm manual:mobile` remains the right path for real phones on the same Wi-Fi network
- `pnpm manual:mobile:emulator` is the stable emulator path on this machine because it forces `EXPO_PUBLIC_API_URL=http://127.0.0.1:<api-port>` and applies `adb reverse` for Metro and API traffic, so emulator checks do not depend on a stale LAN IP in `apps/mobile/.env.local`

## Health Surfaces

- Web: `GET http://localhost:3000/health`
- API: `GET http://localhost:4000/health`
- API readiness: `GET http://localhost:4000/health/ready`
- API queue health: `GET http://localhost:4000/health/queues`
- Worker: `pnpm --filter @attendease/worker health`

## Local Services

`docker-compose.yml` starts:

- PostgreSQL on `localhost:5432` by default
- Redis on `localhost:6379` by default
- MinIO on `localhost:9000` with console on `localhost:9001` by default
- Mailpit SMTP on `localhost:1025` with UI on `localhost:8025` by default

If any of those ports are already in use, override them through compose env variables such as `POSTGRES_PORT`, `REDIS_PORT`, `MINIO_API_PORT`, `MINIO_CONSOLE_PORT`, `MAILPIT_SMTP_PORT`, and `MAILPIT_WEB_PORT`.

## Docker Runtime Foundation

Docker support is now in place for:

- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `apps/worker/Dockerfile`
- [docker-compose.yml](/Users/anuagar2/Desktop/practice/Attendease/docker-compose.yml) for infra-only local services
- [docker-compose.runtime.yml](/Users/anuagar2/Desktop/practice/Attendease/docker-compose.runtime.yml) for full runtime bring-up

The runtime images are production-style and monorepo-aware:

- they build from the repository root context
- they use multi-stage builds
- they run production start commands instead of dev watchers
- API and worker explicitly generate the Prisma client during the image build
- secrets are expected at runtime through environment injection, not baked into images

Useful local commands:

- `docker build -f apps/api/Dockerfile -t attendease-api:phase-a .`
- `docker build -f apps/web/Dockerfile -t attendease-web:phase-a .`
- `docker build -f apps/worker/Dockerfile -t attendease-worker:phase-a .`
- `pnpm infra:up`
- `pnpm runtime:config`
- `pnpm runtime:build`
- `pnpm runtime:up`
- `pnpm runtime:smoke`
- `pnpm runtime:check`
- `pnpm runtime:logs`
- `pnpm runtime:down`

The full runtime stack now includes:

- `postgres`
- `redis`
- `minio`
- `mailpit`
- `migrate` as a one-shot helper service
- `bucket-init` as a one-shot helper service
- `api`
- `worker`
- `web`

Runtime behavior:

- `migrate` applies Prisma migrations before API and worker start
- `bucket-init` creates the local MinIO bucket before app services start
- API health is exposed at `GET /health`, `GET /health/ready`, and `GET /health/queues`
- web health is exposed at `GET /health`
- worker health is exposed through `pnpm health` inside the worker container
- the local worker still uses `EMAIL_PROVIDER_MODE=console` by default, so Mailpit is available in the stack but is not the default delivery path in this runtime profile
- API startup does not hide migrations inside the normal app command; migrations stay in the dedicated helper service
- API and worker receive most configuration at container startup through explicit compose env injection
- export downloads may use a distinct `STORAGE_PUBLIC_ENDPOINT` when the API talks to MinIO on an internal Docker hostname but teachers download files through a host-facing URL
- web public configuration such as `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, and rollout flags is baked during image build because that matches the current Next.js runtime model in this repo

Host-port overrides are optional and stay explicit:

- defaults keep the current local workflow: Postgres `5432`, Redis `6379`, MinIO `9000/9001`, Mailpit `1025/8025`, API `4000`, web `3000`
- if a port is already in use, override it through shell env or `.env`
- example: `POSTGRES_PORT=55432 pnpm runtime:up`
- the optional compose host-port variables are listed at the end of [.env.example](/Users/anuagar2/Desktop/practice/Attendease/.env.example)

What is intentionally not containerized:

- Expo mobile development
- native BLE, camera, GPS, and real-device testing
- iOS or Android build pipelines

What still requires manual env setup in real environments:

- Google OIDC client secrets and redirect-domain decisions
- Sentry DSN and OTEL exporter configuration
- SES credentials and production email settings
- any production rollout-flag changes beyond the local defaults

Containerized smoke validation:

1. Run `pnpm runtime:build`.
2. Start the stack with `pnpm runtime:up`.
3. Validate the runtime with `pnpm runtime:check`.
4. If you need to isolate the HTTP-only checks, run `pnpm runtime:smoke`.
5. Inspect services with `docker compose -f docker-compose.yml -f docker-compose.runtime.yml ps`.
6. Stop the stack with `pnpm runtime:down`.

CI coverage:

- [`.github/workflows/docker.yml`](/Users/anuagar2/Desktop/practice/Attendease/.github/workflows/docker.yml) now validates the combined compose config, builds the runtime images, boots the containerized stack, checks API and web health over HTTP, checks worker health in-container, and tears the stack back down.

Current Docker scope:

- Local Docker support: implemented for infra plus the `api`, `worker`, and `web` runtime stack.
- CI image validation: implemented through the dedicated Docker workflow and runtime smoke validation.
- Deployment-ready packaging: not implemented yet. There is no registry push, deployment manifest set, or production rollout automation in the repo today.

## Manual Verification Prep

If you want to verify the Android app and website locally without redoing setup by hand:

For the full step-by-step manual testing flow, use [guide.md](/Users/anuagar2/Desktop/practice/Attendease/guide.md).

1. Run `pnpm manual:info` to print the current LAN IP, seeded accounts, and trusted-device values.
2. Run `pnpm manual:prepare` to boot the Docker runtime, seed the database, and verify health.
3. Run `pnpm verify:mobile-reports` if you want a host-side proof that the current student and teacher mobile report routes match the live backend report APIs on seeded data.
4. For the same web path verified in the latest manual-prep pass, run `pnpm --filter @attendease/web build` and `pnpm --filter @attendease/web start`.
5. Start the Android app:
   - real phone: `pnpm manual:mobile`
   - emulator: `pnpm manual:mobile:emulator -- --device emulator-5554 --port 8101`
6. Open the website at:
   - `http://localhost:3000/login` for teacher sign in
   - `http://localhost:3000/register` for teacher registration
   - `http://localhost:3000/admin/login` for admin sign in
7. If you want the native Android debug-build path that is now verified on this machine, run:

```bash
pnpm --filter @attendease/mobile exec expo run:android -d Pixel_9_Pro_XL --port 8083 --no-install
```

Notes for that native path:

- it now builds, installs, and launches the debug app package `com.anurag203.attendease` on the emulator
- it is useful for native startup, Gradle, and BLE-module validation
- deterministic nested-route deep links are still easier in Expo Go than in the native development client

Local files prepared for that workflow:

- root `.env` can override the occupied Postgres port on this machine
- `apps/mobile/.env.local` still points the app at the current LAN API URL plus seeded dev accounts and trusted-device defaults for real-phone checks
- `pnpm manual:mobile:emulator` overrides that LAN API URL at launch time so emulator validation stays on `127.0.0.1` with `adb reverse`
- `apps/web/.env.local` points the web app at the local API and enables the local password sign-in flow

## Full Product Screenshot Audit

The repo now includes a deterministic screenshot-audit artifact set for the current reset implementation.

Commands:

- `pnpm audit:matrix`
- `pnpm audit:screenshots:mobile`
- `pnpm audit:screenshots:web`

Outputs:

- audit report: [Structure/full-product-screenshot-audit.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/full-product-screenshot-audit.md)
- mobile screenshots: [Structure/artifacts/full-product-audit/mobile](/Users/anuagar2/Desktop/practice/Attendease/Structure/artifacts/full-product-audit/mobile)
- web screenshots: [Structure/artifacts/full-product-audit/web](/Users/anuagar2/Desktop/practice/Attendease/Structure/artifacts/full-product-audit/web)

Audit rules:

- every screen in scope is tracked with a deterministic screenshot path and a `PASS`, `FAIL`, `BLOCKED`, or `MANUAL-REQUIRED` status
- emulator/browser captures are valid for layout and route-state proof
- real-device QR camera, GPS accuracy/range, and BLE proximity remain manual-required even when the route screenshots exist

Website verification notes:

- `/login` now owns teacher sign in and writes the protected teacher web-session cookies
- `/register` now owns teacher account creation and opens an authenticated teacher session on success
- `/admin/login` now owns admin sign in and writes the protected admin web-session cookies
- `/admin/devices?view=support` now opens the student-support desk for account-state, classroom-context, and device-context review, while `/admin/devices` now opens the guarded device-recovery desk
- seeded teacher and admin accounts still exist for local checks, but they are no longer the primary framing of the web entry experience

Mobile verification notes:

- the mobile BLE bridge now falls back cleanly if the native BLE module is unavailable, so Expo Go should not crash just because BLE is missing
- Expo typed-route generation is disabled in `apps/mobile/app.json` because it was crashing Metro on this machine; the app route structure itself is unchanged
- BLE validation itself still needs an Expo dev build on real hardware
- if your Wi-Fi IP changes, rerun `pnpm manual:info` and update `apps/mobile/.env.local`
- student self-registration is now live through `POST /auth/register/student`, so you can validate signup with a fresh email in the mobile app instead of relying only on seeded student accounts
- that signup flow binds the first attendance phone during registration, and the student device-status screen should then show `Attendance device state: Trusted`
- teacher self-registration is now live through `POST /auth/register/teacher`, so you can validate teacher signup with a fresh email on mobile or web instead of relying only on the seeded teacher account
- the shared mobile app now opens on a neutral role-choice landing screen and no longer jumps straight into the student route group
- mobile dev credential envs still prefill the auth forms, but they no longer auto-sign the app into a role

## Testing Story

The current baseline uses Vitest for shared packages and shell-level helpers, a real PostgreSQL-backed DB integration suite in `packages/db`, and Nest-backed auth integration tests in `apps/api` for:

- migration integrity
- raw SQL constraint enforcement
- transaction helper behavior
- audit/outbox helper persistence
- development seed idempotency
- initial report read models
- export-file uniqueness, analytics bounds, and seeded roster-snapshot/manual-edit integrity
- analytics aggregate refresh processors, chart-ready API payloads, drill-down access control, and reporting/analytics truth alignment
- low-attendance email rule management, preview rendering, manual-send queueing, scheduled daily dispatch, duplicate prevention, SES/console provider adapters, and teacher-web automation workspace behavior
- request-ID propagation, structured API error envelopes, auth/attendance rate limiting, and non-functional middleware behavior
- auth login, refresh, logout, and `me` flows
- teacher assignment and student enrollment access protection
- login-time trusted-device blocking for same-phone student-account switching
- student-session rejection when device context is missing, blocked, or reused
- Google exchange rejection for unverified identities and refresh-time role-escalation denial
- rolling QR token issuance, expiry, and tamper rejection
- GPS radius and accuracy validation for QR attendance
- QR session creation with roster snapshotting and counter initialization
- successful QR attendance marking with audit, outbox, and realtime seam coverage
- rotating BLE token issuance, expiry, and tamper rejection
- Bluetooth session creation with roster snapshotting and advertiser config return
- successful Bluetooth attendance marking with duplicate protection, security-event logging, and realtime seam coverage
- teacher day-wise and subject-wise reporting, teacher student-percentage reporting, and student self-report overview or subject breakdown coverage
- export-job request lifecycle, report/export truth consistency, retention-aware signed export status/detail shaping, and worker-side session PDF or CSV and percentage/comprehensive CSV generation
- worker structured logging, error serialization, and monitoring-helper behavior

## Current Backend Foundation

The API now includes the first real auth and academic scope surface:

- `POST /auth/login`
- `POST /auth/google/exchange`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /devices/register`
- `GET /devices/trust/attendance-ready`
- `GET /admin/students`
- `GET /admin/students/:studentId`
- `POST /admin/students/:studentId/status`
- `GET /admin/device-bindings`
- `GET /admin/device-bindings/:studentId`
- `POST /admin/device-bindings/:bindingId/revoke`
- `POST /admin/device-bindings/:studentId/delink`
- `POST /admin/device-bindings/:studentId/approve-new-device`
- `GET /academic/assignments/me`
- `GET /academic/assignments/me/:assignmentId`
- `GET /academic/enrollments/me`
- `GET /academic/enrollments/me/:enrollmentId`
- `GET /admin/semesters`
- `GET /admin/semesters/:semesterId`
- `POST /admin/semesters`
- `PATCH /admin/semesters/:semesterId`
- `POST /admin/semesters/:semesterId/activate`
- `POST /admin/semesters/:semesterId/archive`
- `GET /classrooms`
- `GET /classrooms/:classroomId`
- `POST /classrooms`
- `PATCH /classrooms/:classroomId`
- `POST /classrooms/:classroomId/archive`
- `GET /classrooms/:classroomId/schedule`
- `GET /classrooms/:classroomId/join-code`
- `POST /classrooms/:classroomId/join-code/reset`
- `GET /classrooms/:classroomId/students`
- `POST /classrooms/:classroomId/students`
- `PATCH /classrooms/:classroomId/students/:enrollmentId`
- `GET /classrooms/:classroomId/stream`
- `POST /classrooms/:classroomId/announcements`
- `GET /classrooms/:classroomId/roster-imports`
- `GET /classrooms/:classroomId/roster-imports/:jobId`
- `POST /classrooms/:classroomId/roster-imports`
- `POST /classrooms/:classroomId/roster-imports/:jobId/apply`
- `GET /students/me/classrooms`
- `POST /classrooms/join`
- `POST /classrooms/:classroomId/schedule/weekly-slots`
- `PATCH /classrooms/:classroomId/schedule/weekly-slots/:slotId`
- `POST /classrooms/:classroomId/schedule/exceptions`
- `PATCH /classrooms/:classroomId/schedule/exceptions/:exceptionId`
- `POST /classrooms/:classroomId/schedule/save-and-notify`
- `GET /classrooms/:classroomId/lectures`
- `POST /classrooms/:classroomId/lectures`
- `GET /sessions/:sessionId`
- `GET /reports/daywise`
- `GET /reports/subjectwise`
- `GET /reports/students/percentages`
- `GET /students/me/reports/overview`
- `GET /students/me/reports/subjects`
- `GET /students/me/reports/subjects/:subjectId`
- `GET /analytics/trends`
- `GET /analytics/distribution`
- `GET /analytics/comparisons`
- `GET /analytics/modes`
- `GET /analytics/students/:studentId/timeline`
- `GET /analytics/sessions/:sessionId/detail`
- `GET /automation/email/rules`
- `POST /automation/email/rules`
- `PATCH /automation/email/rules/:ruleId`
- `POST /automation/email/preview`
- `POST /automation/email/send-manual`
- `GET /automation/email/runs`
- `GET /automation/email/logs`
- `POST /exports`
- `GET /exports`
- `GET /exports/:exportJobId`
- `POST /sessions/qr`
- `POST /sessions/bluetooth`
- `POST /sessions/:sessionId/end`
- `POST /attendance/qr/mark`
- `POST /attendance/bluetooth/mark`

Current device behavior:

- student device context is accepted during login and Google exchange
- student auth succeeds only when the resolved device trust state is `TRUSTED`
- trusted-device state is returned in auth responses and `GET /auth/me`
- auth responses and `GET /auth/me` now also return a lifecycle state so clients can distinguish `Trusted`, `Pending approval`, `Replaced`, `Blocked`, and `Unregistered`
- authenticated sessions can re-register their current device through `POST /devices/register`
- student attendance-sensitive flows can prove trust through `GET /devices/trust/attendance-ready`
- same-device second-student attempts, second-device attempts, revoked-device use, and attendance-block events are logged to `security_events`
- a second-phone attempt for the same student now creates a pending replacement binding instead of silently taking over the active one
- admins can search student/device records, revoke one binding, deregister the current trusted phone, and approve a replacement install through the API
- the admin recovery payloads now surface the current trusted phone, pending replacement phone, latest risk event, latest recovery action, and the next safe recovery step
- teacher and admin sessions remain outside the strict student attendance-device gate and receive `NOT_REQUIRED` trust state for normal auth/device registration paths
- teacher and student sessions are denied from the admin recovery endpoints, and non-student sessions are denied from the student-only attendance-readiness endpoint
- the web shell now includes an admin device-support console and the mobile shell now includes blocked-attendance trust messaging, a lifecycle-aware device-status screen, and attestation placeholders
- client-supplied attestation metadata is stored but not treated as verified proof yet
- full server-side attestation verification and deeper attendance-screen integration are deferred to the later device/admin steps

Current QR + GPS attendance behavior:

- teacher/admin sessions can create active QR attendance sessions through `POST /sessions/qr`
- teacher/admin polling routes can now load the live session summary through `GET /sessions/:sessionId`
- QR session creation snapshots the active classroom roster into `attendance_records`
- the created session stores `qrSeed`, GPS anchor metadata, radius, duration, scheduled end, and live counters
- the create response includes the current rolling QR payload and its expiry timestamp
- student QR marking is protected by trusted-device enforcement and validates HMAC token slices plus GPS distance and accuracy
- successful QR marks update `attendance_records`, increment/decrement session counters, write `attendance_events`, queue outbox rows, and call the realtime publishing seam
- suspicious GPS failures now write `security_events` with device/session context while leaving attendance records and counters unchanged
- ending or timing out a QR or Bluetooth session sets `editableUntil`, which the shared manual-edit API now enforces for teacher web and teacher mobile
- timed-out sessions now auto-expire consistently during teacher polling and student mark attempts
- the realtime transport is still a stub seam; websocket/projector streaming is deferred to the later live-session phase
- the teacher web client now launches QR sessions from `/teacher/sessions/start`, requires browser geolocation before session start, and keeps the active-session plus projector routes refreshed through polling
- the student mobile client now uses a short four-step QR flow for choose session, scan QR, confirm location, and mark attendance, then submits the real QR attendance mark with explicit expired/invalid/session-closed/low-accuracy/out-of-range/duplicate error mapping

Current Bluetooth attendance behavior:

- teacher and admin sessions can create active Bluetooth attendance sessions through `POST /sessions/bluetooth`
- Bluetooth session creation snapshots the active classroom roster into `attendance_records`
- the created session stores `bleSeed`, `blePublicId`, `bleProtocolVersion`, rotation window, duration, scheduled end, and live counters
- the create response includes the current advertiser payload, its expiry timestamp, and the configured BLE service UUID
- student Bluetooth marking is protected by trusted-device enforcement and validates the rotating BLE identifier using timestamp slices plus HMAC
- successful Bluetooth marks update `attendance_records`, increment or decrement session counters, write `attendance_events`, queue outbox rows, and call the realtime publishing seam
- invalid, expired, or mismatched Bluetooth payloads now write `ATTENDANCE_BLUETOOTH_VALIDATION_FAILED` security events without mutating attendance truth
- timed-out Bluetooth sessions now auto-expire during mark attempts using the same edit-window behavior as QR sessions
- explicitly ended Bluetooth sessions now block later mark attempts
- the realtime transport is still a stub seam; websocket push for live session updates remains a later phase
- the teacher mobile client now creates Bluetooth sessions from a classroom-scoped setup route, starts and stops the native advertiser through the shared BLE wrapper, polls the live session summary during the active-session route, and keeps advertiser failure or session-end retry recovery inside the same route
- the teacher Bluetooth flow now separates setup, broadcast controls, and end-session closeout so the teacher can start Bluetooth attendance, see recovery state, and land in session detail after ending the session without leaving the phone flow
- the teacher mobile session-detail flow now keeps live present or absent student lists visible during an active session, then exposes grouped one-tap `Mark Present` or `Mark Absent` corrections once the session ends
- the student mobile client now scans for live BLE detections through the native scanner wrapper, supports detected-session selection when multiple payloads are visible, and submits the detected payload to the live Bluetooth mark endpoint with explicit expired, invalid, mismatched, duplicate, and blocked-device error mapping
- the student attendance hub and Bluetooth route now expose refresh actions so a teacher-started Bluetooth session can appear without restarting the app
- Android emulator validation now proves teacher Bluetooth setup, active recovery state, and clean end-session handoff to session detail; actual nearby advertising and scan success still remain real-device-only
- real Android and iOS device verification is still required for advertiser lifecycle behavior, Bluetooth-disabled recovery, and scan reliability
- a short real-device checklist now lives in `Structure/bluetooth-device-test-checklist.md`

Current analytics behavior:

- analytics aggregate rows are refreshed by the worker from outbox topics after session end, session expiry, manual edit changes, and explicit refresh requests
- `analytics_daily_attendance`, `analytics_subject_attendance`, `analytics_student_course_summary`, and `analytics_mode_usage_daily` are now actively populated by the worker
- compact weekly/monthly trend, distribution, comparison, mode-usage, student-timeline, and session-drilldown payloads are available through the API
- teacher/admin analytics access uses the same assignment-aware scope rules as reporting, and drill-downs stay tied to finalized `attendance_records`

Current email automation behavior:

- teacher/admin users can create, pause, resume, and inspect one low-attendance rule per classroom
- manual preview and manual send reuse the same finalized attendance truth already used by teacher/student reports
- the worker schedules automated runs once per due local day and local minute, then prevents duplicate per-student sends within a dispatch run
- stale processing runs are reclaimed after the timeout window so email automation can recover from interrupted worker cycles
- dispatch runs and recipient-level logs persist in `email_dispatch_runs` and `email_logs`
- email rendering is shared through `packages/email`, with console and SES-backed provider adapters selected through worker env configuration
- teacher web analytics and email pages now load the live analytics APIs and low-attendance automation APIs instead of shell-only placeholders

Current non-functional behavior:

- `packages/config` now centrally validates API, worker, web, and mobile envs with consistent defaults
- rollout flags now exist for Bluetooth attendance, email automation, and strict device-binding enforcement mode
- API request handling now propagates a configurable request ID header through success and error responses
- API and worker logs are now structured JSON with request/user correlation and sensitive-field redaction
- optional Sentry and tracing hooks are now wired for API and worker through env configuration
- auth and attendance-mark endpoints now use reusable named rate-limit policies instead of inline controller logic
- API errors now flow through one exception filter so validation, auth, and server failures share the same envelope shape
- rollout-disabled Bluetooth attendance and email automation routes now fail closed with `503 Service Unavailable`
- API now exposes dedicated readiness and queue-health surfaces for database and queue monitoring
- queue-health stale detection now uses the shared `QUEUE_HEALTH_STALE_AFTER_MS` threshold instead of implicitly reusing worker reclaim timing
- worker-cycle monitoring now captures uncaught failures and uses configurable stale-work recovery for exports, roster imports, announcement fanout, analytics refresh, and email automation
- GitHub Actions now has separate workflows for workspace validation, lint, typecheck, tests, and builds
- in `NODE_ENV=test`, rate limiting defaults to disabled unless `RATE_LIMIT_ENABLED` is explicitly set, so feature integration suites stay deterministic while dedicated non-functional tests can still exercise 429 behavior

Operational notes now live in `Structure/operations-runbook.md`.

Current client bootstrap behavior:

- `packages/auth` now exposes a shared auth API client and Google exchange payload builder
- `apps/web/src/auth.ts` and `apps/mobile/src/auth.ts` now provide platform-specific auth bootstrap helpers
- both client shells can surface whether a public Google client ID is configured
- `packages/auth` now also exposes shared classroom, join-code, roster, schedule, and lecture request helpers for teacher and student client surfaces
- `apps/web/app/(teacher)/teacher` and `apps/web/app/(admin)/admin` now provide the first protected teacher/admin web route groups
- `apps/web/src/web-portal.ts` and `apps/web/src/web-shell.tsx` now centralize cookie-backed access evaluation, portal navigation, and reusable dashboard/table/chart shells for teacher/admin pages
- `apps/web/app/login/page.tsx`, `apps/web/app/register/page.tsx`, and `apps/web/app/admin/login/page.tsx` now provide the split teacher/admin web auth entry routes for the protected portal layouts
- `apps/web/app/(teacher)/teacher/dashboard/page.tsx` and `apps/web/app/(admin)/admin/dashboard/page.tsx` now provide the first teacher/admin dashboard shells
- `apps/web/app/(teacher)/teacher/classrooms/page.tsx`, `apps/web/app/(teacher)/teacher/semesters/page.tsx`, `apps/web/app/(teacher)/teacher/sessions/start/page.tsx`, `apps/web/app/(teacher)/teacher/sessions/history/page.tsx`, `apps/web/app/(teacher)/teacher/reports/page.tsx`, `apps/web/app/(teacher)/teacher/exports/page.tsx`, `apps/web/app/(teacher)/teacher/analytics/page.tsx`, `apps/web/app/(teacher)/teacher/email-automation/page.tsx`, and `apps/web/app/(teacher)/teacher/imports/page.tsx` now provide the stable teacher-web route structure for the later QR/history/report phases
- `apps/web/app/(admin)/admin/semesters/page.tsx`, `apps/web/app/(admin)/admin/devices/page.tsx`, and `apps/web/app/(admin)/admin/imports/page.tsx` now provide the stable admin-web route structure for lifecycle, device-support, and import monitoring work
- the admin web dashboard now separates student support, device recovery, imports, and semesters into distinct route lanes, and the device area now treats the protected admin session as the primary recovery path while keeping token override secondary
- the device-recovery desk now makes the strict rule explicit: deregistering the current phone never auto-trusts a pending replacement; support still has to approve that phone
- `apps/web/app/(teacher)/teacher/academics/page.tsx` now provides a first teacher academic scheduling console against the live API
- `apps/web/app/(teacher)/teacher/classrooms/new/page.tsx`, `apps/web/app/(teacher)/teacher/classrooms/[classroomId]/page.tsx`, `apps/web/app/(teacher)/teacher/classrooms/[classroomId]/roster/page.tsx`, `apps/web/app/(teacher)/teacher/classrooms/[classroomId]/imports/page.tsx`, `apps/web/app/(teacher)/teacher/classrooms/[classroomId]/schedule/page.tsx`, and `apps/web/app/(teacher)/teacher/classrooms/[classroomId]/stream/page.tsx` now provide live teacher classroom CRUD, roster, import-status, schedule-editing, and stream workflows against the current backend
- `apps/web/app/(teacher)/teacher/exports/page.tsx` now queues export jobs, polls job status, and opens signed file downloads from the shared export API
- `apps/mobile/src/teacher-foundation.tsx` now queues export jobs from teacher mobile and opens ready-file URLs from the shared export API
- `apps/web/src/teacher-workflows-client.tsx` and `apps/web/src/admin-workflows-client.tsx` now centralize the interactive teacher/admin web workspaces on top of TanStack Query
- `apps/web/src/teacher-review-workflows.ts` now centralizes teacher-web session-review and report view models so present/absent correction flows and report rollups stay aligned with the same final attendance truth
- `apps/web/src/web-workflows.ts` now centralizes workflow route helpers, query keys, schedule draft shaping, roster-import parsing, import monitoring, QR session create payload shaping, and live-session polling models for the web portal
- `apps/web/src/teacher-qr-session-management.ts` now centralizes teacher-web QR classroom options, setup readiness rules, and create-payload shaping for the dedicated `/teacher/sessions/start` flow
- `apps/web/src/teacher-workflows-client.tsx` now uses that dedicated QR setup flow and keeps classroom detail as a short handoff into live QR launch
- `apps/web/src/qr-session-shell.tsx`, `apps/web/app/(teacher)/teacher/sessions/active/[sessionId]/page.tsx`, and `apps/web/app/(teacher)/teacher/sessions/active/[sessionId]/projector/page.tsx` now provide the live teacher control and projector surfaces for the current QR + GPS phase
- `apps/api/src/modules/attendance/attendance-history.controller.ts` now exposes shared teacher history routes plus the shared manual-edit save route through `GET /sessions`, `GET /sessions/:sessionId`, `GET /sessions/:sessionId/students`, and `PATCH /sessions/:sessionId/attendance`
- `apps/api/src/modules/reports/reports.controller.ts` and `apps/api/src/modules/reports/student-reports.controller.ts` now expose the shared teacher and student reporting routes on top of SQL read models plus one shared percentage helper
- `packages/contracts/src/reports.ts` and `packages/domain/src/attendance-percentage.ts` now centralize reporting DTO contracts and percentage calculation rules for reports, later exports, and later analytics reuse
- `apps/api/src/modules/exports/exports.service.ts` now suppresses signed download URLs once an export file is past its retention window, so expired files stop looking downloadable even before cleanup jobs run
- `apps/web/src/teacher-qr-session-management.test.ts`, `apps/web/src/web-portal.test.ts`, and `apps/web/src/web-workflows.test.ts` now cover QR setup preconditions, route-protection, login-handoff, classroom CRUD shell behavior, live QR session polling models, and projector-boundary coverage
- `apps/mobile/src/academic-management.ts` and `apps/mobile/app/index.tsx` now provide the first teacher scheduling integration seam in the mobile shell
- `apps/web/src/classroom-communications.ts`, `apps/web/src/teacher-classroom-console.tsx`, and `apps/web/app/(teacher)/teacher/classrooms/page.tsx` now provide the first teacher classroom stream and roster-import integration point in the web shell
- `apps/mobile/src/classroom-communications.ts` and `apps/mobile/app/index.tsx` now surface the first student-stream and teacher roster-import integration seams in the shared mobile shell
- `apps/mobile/app/(student)` now exposes the first dedicated student mobile route group for dashboard, join classroom, classroom detail, classroom stream, classroom schedule, reports overview, subject report, profile, attendance entry, QR attendance, Bluetooth attendance, history, and device status
- `apps/mobile/src/student-foundation.tsx` now wires those student routes to live auth, classroom, stream, lecture, schedule, join, trusted-device, and final student-report endpoints through TanStack Query
- `apps/mobile/src/student-routes.ts`, `apps/mobile/src/student-view-state.ts`, and `apps/mobile/src/student-attendance.ts` now centralize route targets, UX-state banners, QR and Bluetooth error mapping, and attendance controller contracts so later attendance phases do not need to redesign the student route group
- `apps/mobile/src/native/bluetooth` plus `apps/mobile/modules/attendease-bluetooth` now provide the shared TypeScript wrapper and local Expo native-module scaffolding for Android BLE advertising and iOS or Android BLE scanning
- `apps/mobile/src/bluetooth-attendance.ts` now centralizes teacher advertiser hooks, student scanner hooks, BLE runtime-state mapping, and Bluetooth mark mutations for the mobile attendance flows
- the current student QR and Bluetooth attendance routes already enforce trusted-device readiness, open-lecture selection, live device capability mapping, real mark submission, and post-success query invalidation
- `apps/mobile/app/(teacher)` now exposes the first dedicated teacher mobile route group for dashboard, classroom list, classroom detail, roster, schedule, announcements, and lectures
- `apps/mobile/src/teacher-foundation.tsx` now wires those teacher routes to live auth, assignments, classrooms, roster, schedule, stream, lecture, join-code reset, roster-import, and classroom mutation endpoints through TanStack Query
- `apps/mobile/src/teacher-classroom-management.ts` now shapes labeled teaching-scope options plus create, edit, and archive payloads so teacher mobile classroom management stays aligned with the shared classroom CRUD API
- `apps/mobile/src/teacher-roster-management.ts` now shapes teacher roster filters, add-student payloads, member-action affordances, and result summaries so the phone app can handle normal roster work without bouncing teachers back to the web app
- `apps/mobile/src/teacher-session.tsx`, `apps/mobile/src/teacher-query.ts`, `apps/mobile/src/teacher-routes.ts`, and `apps/mobile/src/teacher-models.ts` now centralize teacher role bootstrap, teacher-specific cache keys, classroom-context route targets, dashboard card shaping, and lecture-backed recent activity so later Bluetooth/session/report work can extend the same mobile contracts
- `apps/mobile/app/(teacher)/bluetooth`, `apps/mobile/app/(teacher)/reports`, and `apps/mobile/app/(teacher)/exports` now extend that teacher route group with live Bluetooth session creation, active-session advertiser control, and report or export workflow surfaces
- `apps/mobile/src/teacher-operational.ts` and `apps/mobile/src/teacher-schedule-draft.ts` now centralize Bluetooth session candidates, advertiser-state models, join-code action state, roster-import text parsing, API-backed teacher report shaping, export request state, and local schedule-draft diffing so later teacher attendance or report phases can reuse the same mobile workflow layer

Current academic-management behavior:

- semester lifecycle changes are admin-only
- teacher classroom creation is limited by active assignment scope and `canSelfCreateCourseOffering`
- teacher mobile classroom creation now uses labeled assignment scopes so the teacher can choose a
  semester/class/section/subject combination without seeing raw IDs
- admin classroom creation still validates that the target teacher owns the requested academic scope
- classroom creation automatically provisions one active join code
- teachers and admins can fetch, rotate, and expire classroom join codes through dedicated roster endpoints
- students can join classrooms through `POST /classrooms/join`, while duplicate, blocked, dropped, expired-code, closed-semester, and completed-classroom paths are rejected server-side
- stale active join codes are normalized to `EXPIRED` on lookup or join attempt before the API returns the failure state
- teachers and admins can list, add, activate, drop, and block classroom roster members through dedicated roster endpoints
- teacher mobile now uses that shared roster API in one task-oriented roster screen with course context, search/filter, visible member actions, and a secondary bulk-import area
- teachers and admins can create roster import jobs, inspect row-level validation results, and apply reviewed valid rows through dedicated classroom endpoints
- the worker now validates uploaded roster import rows asynchronously and persists valid, invalid, skipped, applied, and failed row states
- teacher/admin classroom streams now support announcement posting, teacher-only visibility, student-visible visibility, and optional notify-on-post outbox events
- the worker now fans out student-visible announcement notifications through the shared notification abstraction and persists `announcement_receipts`
- teacher-only `IMPORT_RESULT` stream posts are created when reviewed roster imports are applied
- classroom detail and `GET /classrooms/:id/schedule` now expose schedule slot and schedule exception read models
- weekly slots reject overlap within the same classroom weekday
- schedule exceptions now support one-off, cancelled, and rescheduled flows
- `POST /classrooms/:id/schedule/save-and-notify` now writes one transaction-backed `schedule.changed` outbox event for downstream notifications
- schedule exceptions now auto-link `lectures` rows so future attendance sessions can reference them cleanly
- lecture creation enforces classroom access, semester-window validity, and duplicate occurrence protection
- teachers are denied classroom and schedule access outside their assignment scope
- classroom, schedule, and lecture mutations are blocked in closed or archived semesters, and schedule edits are also blocked for completed classrooms
- join-code and roster mutations follow the same semester/classroom lifecycle rules, and self-join is limited to DRAFT or ACTIVE classroom/semester states
- classroom stream writes and roster-import apply flows now follow the same lifecycle rules, blocking completed classrooms plus closed or archived semesters
- classroom stream reads enforce teacher/admin assignment scope versus student membership scope, so student clients only see `STUDENT_AND_TEACHER` posts for classrooms where they still have `PENDING` or `ACTIVE` enrollment access

## Seeded Dev Accounts

`pnpm --filter @attendease/db seed:dev` now creates deterministic auth and academic fixtures, including:

- admin: `admin@attendease.dev` / `AdminPass123!`
- teacher: `teacher@attendease.dev` / `TeacherPass123!`
- students such as `student.one@attendease.dev` / `StudentOnePass123!`
- student self-registration now also works on mobile with a fresh email plus the initial device-registration payload from the app
- teacher self-registration now also works on mobile or web with a fresh email through `POST /auth/register/teacher`
- active teacher assignments and student enrollments for the seeded math and physics course offerings
- a Google-linked teacher identity for local auth and integration testing

Testing conventions and the expansion path for integration and E2E suites are documented in [Structure/testing-strategy.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/testing-strategy.md).

## Scaffold Notes

This phase intentionally creates the foundation only:

- app shells are minimal but bootable
- shared packages expose the first common contracts, env loaders, helper barrels, and theme tokens
- the scaffold now has a real foundational test baseline across app health helpers, shared packages, and workspace validation
- the DB package now contains the first real Prisma schema, migration set, DB runtime helpers, deterministic development seed flow, report SQL views, and integrity tests
- the API now contains the first real auth, role-guard, Google OIDC, teacher-assignment, enrollment, and login-time device-trust foundation
- mobile BLE, QR, deeper device-admin flows, and reporting behavior will be layered in later phase-specific prompts
