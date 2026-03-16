# AttendEase Architecture Structure

This folder contains the implementation architecture for AttendEase. Each file mirrors a document in [`Structure/requirements`](../requirements/README.md) and answers a different question:

- what code modules are needed
- what data model is required
- what APIs and background jobs are required
- how mobile, web, API, and worker layers interact
- what constraints must be respected during implementation

## Architecture Principles

- Keep one shared source of business truth in backend and shared domain packages.
- Keep mobile and web UI separate, but share contracts, validation, and calculations.
- Treat attendance sessions as stateful domain objects with strict lifecycle rules.
- Prefer deterministic validation and append-only audit trails.
- Keep reporting and analytics derived from the same final attendance dataset.
- Model academic operations explicitly: semester, course offering, schedule, enrollment, and roster flows are first-class parts of the system.
- Treat device trust as a product feature, not an afterthought, because attendance integrity depends on account-to-device enforcement.
- Design for production classroom usage, not just demo behavior.

## Chosen Technical Direction

- Mobile app: React Native with Expo prebuild, TypeScript, Expo Router, TanStack Query, and native BLE bridge modules
- Teacher and admin web app: Next.js App Router with TypeScript
- Backend API: NestJS with Fastify adapter
- Worker: BullMQ-based worker process for exports, analytics refresh, and email automation
- Database: PostgreSQL
- Cache and queue backing: Redis
- File storage: S3-compatible object storage
- Email delivery: provider adapter behind an internal email service
- Identity integration: Google OAuth/OIDC plus first-party auth flows
- Device trust: app-scoped device binding with platform attestation, not MAC-address locking

## Planned Monorepo Layout

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
```

## App Responsibilities

### `apps/mobile`

- student app flows
- teacher mobile flows
- QR scanning
- GPS collection
- BLE scanning and BLE advertising
- classroom join-code flows
- schedule/calendar views
- announcements and notification inbox
- history, reports, and export requests

### `apps/web`

- teacher dashboard
- admin console routes
- academic setup and semester configuration
- course offering and schedule management
- roster and device support tooling
- QR session creation and projector page
- analytics
- email automation management
- export management

### `apps/api`

- authentication
- Google login exchange and account linking
- role and permission checks
- academic data access
- course offering and semester management
- scheduling and calendar services
- announcements and notification APIs
- attendance session lifecycle
- attendance validation
- device trust and binding enforcement
- history and reports APIs
- realtime event publishing
- export job creation
- analytics API
- email automation API

### `apps/worker`

- export generation
- scheduled email runs
- analytics aggregate refresh
- notification fan-out jobs
- roster import processing
- outbox and event consumers

## Shared Package Responsibilities

### `packages/contracts`

- request and response DTOs
- Zod validation schemas
- generated API types for web and mobile

### `packages/domain`

- attendance percentage rules
- edit window calculations
- QR and BLE rotating token helpers
- session state transition helpers
- analytics bucketing rules

### `packages/db`

- Prisma schema
- migrations
- DB helpers
- seed and import scripts

### `packages/auth`

- JWT helpers
- password hashing helpers
- role policies
- API guards and web/mobile auth client utilities

### `packages/export`

- CSV builders
- PDF HTML template builders
- export file naming rules

### `packages/email`

- low-attendance templates
- template preview builders
- provider adapters

### `packages/notifications`

- in-app notification contracts
- push notification payload builders
- announcement fan-out helpers

## Document Map

- `01-system-overview.md` mirrors `requirements/01-system-overview.md`
- `02-auth-roles-enrollment.md` mirrors `requirements/02-auth-roles-enrollment.md`
- `03-student-mobile-app.md` mirrors `requirements/03-student-mobile-app.md`
- `04-teacher-mobile-app.md` mirrors `requirements/04-teacher-mobile-app.md`
- `05-teacher-web-app.md` mirrors `requirements/05-teacher-web-app.md`
- `06-qr-gps-attendance.md` mirrors `requirements/06-qr-gps-attendance.md`
- `07-bluetooth-attendance.md` mirrors `requirements/07-bluetooth-attendance.md`
- `08-session-history-manual-edits.md` mirrors `requirements/08-session-history-manual-edits.md`
- `09-reports-exports.md` mirrors `requirements/09-reports-exports.md`
- `10-analytics-email-automation.md` mirrors `requirements/10-analytics-email-automation.md`
- `11-data-rules-audit.md` mirrors `requirements/11-data-rules-audit.md`
- `12-non-functional-requirements.md` mirrors `requirements/12-non-functional-requirements.md`
- `13-academic-management-and-scheduling.md` extends the architecture with semester, course, lecture, and calendar design
- `14-classroom-communications-and-roster.md` extends the architecture with join codes, imports, announcements, and notification flows
- `15-device-trust-and-admin-controls.md` extends the architecture with device binding, anti-account-switch security, and recovery operations

## Rule For Future Updates

If product behavior changes, update both the requirement file and its matching architecture file so implementation stays aligned with business intent.
