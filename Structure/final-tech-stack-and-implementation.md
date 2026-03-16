# AttendEase Final Tech Stack and Implementation Decisions

## Purpose

This file freezes the final technical direction for AttendEase. It answers three things:

1. what exact stack we will use
2. how each major architecture area will be implemented
3. which alternatives are rejected so we do not keep revisiting core decisions

This file should be treated as the implementation baseline for scaffolding, database design, API design, and sprint planning.

## Decision Status

These decisions are now the default build path unless a hard technical blocker appears:

- mobile will be built with React Native, not a plain React web app
- mobile development will use Expo prebuild and custom dev builds, not Expo Go as the main runtime
- web will be built with Next.js App Router
- backend will be a separate NestJS API
- PostgreSQL will be the source of truth
- Redis will back queues, rate limits, and websocket scaling
- BLE attendance will use native beacon-style advertising modules, not a JS-only workaround
- Google login will be supported through proper OAuth/OIDC flows
- anti-multi-account abuse will use trusted device binding and attestation, not MAC address locking

## Final Stack

| Layer | Final Choice | Why |
| --- | --- | --- |
| Monorepo | `pnpm` workspaces + `Turborepo` | Fast installs, shared packages, simple multi-app builds |
| Language | TypeScript everywhere | Shared contracts and domain logic across web, mobile, API, and worker |
| Mobile | React Native + Expo prebuild + Expo Router | Best fit for iOS/Android plus camera, GPS, and native BLE needs |
| Web | Next.js App Router | Strong for dashboards, SSR, route protection, and teacher/admin panels |
| API | NestJS with Fastify | Clean module boundaries, strong auth patterns, performant REST API |
| Database | PostgreSQL | Best fit for relational academic data, transactions, and reports |
| ORM / schema | Prisma + targeted SQL views | Fast schema iteration with room for optimized reporting queries |
| Queue / cache | Redis + BullMQ | Reliable async jobs for exports, analytics, imports, and emails |
| Realtime | Socket.IO + Redis adapter | Live counters, QR rotation events, and classroom refreshes |
| Object storage | Amazon S3 in prod, MinIO locally | Export files, import files, attachments |
| Email | Amazon SES | Good deliverability and predictable backend integration |
| Mobile auth | `expo-auth-session` using Google OIDC Authorization Code + PKCE | Standards-based Google login for mobile without depending on deprecated platform-only flows |
| Web auth | Google OIDC / Google Identity Services + backend session cookies | Best fit for teacher/admin web login |
| QR scanning | `expo-camera` | Official Expo path for camera and barcode scanning |
| GPS | `expo-location` | Official Expo path for device location |
| BLE | Custom native modules in Swift and Kotlin using CoreBluetooth and Android BLE APIs | Required for reliable advertising and scanning |
| Web UI | Tailwind CSS + shadcn/ui + TanStack Table + Recharts | Fast, maintainable admin/dashboard UI stack |
| Forms / validation | React Hook Form + Zod | Shared validation and clean form handling |
| Mobile state | TanStack Query + Zustand | Server-state and light local UI state without overcomplication |
| PDF generation | Playwright HTML-to-PDF in worker | Predictable printable exports |
| Testing | Jest, Vitest, Playwright, Detox, Supertest | Right tool for each runtime surface |
| Observability | Sentry + OpenTelemetry + structured logs | Needed for classroom issues and supportability |
| CI/CD | GitHub Actions | Straightforward monorepo pipeline |
| Production hosting | Dockerized apps on AWS ECS Fargate, RDS Postgres, ElastiCache, S3, SES | One coherent production platform |

## Monorepo Layout

```text
apps/
  mobile/
  web/
  api/
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
  final-tech-stack-and-implementation.md
```

## Why This Stack

### Why React Native + Next.js

AttendEase is not just a mobile app and not just a dashboard. It needs:

- student and teacher mobile flows
- camera access
- GPS access
- BLE scanning and advertising
- a projector-friendly web session screen
- heavy teacher/admin management views

React Native handles device-heavy mobile work, and Next.js handles the teacher/admin portal much better than trying to force all of this into one hybrid web-only app.

### Why NestJS + PostgreSQL

The product has strong domain rules:

- enrollments
- semesters
- classrooms
- lecture scheduling
- attendance sessions
- manual edits
- reports
- analytics
- device trust

That needs relational integrity, transactions, and clear backend modules. PostgreSQL plus NestJS is the safest fit.

### Why Not Firebase as the Core Backend

We are not choosing Firebase as the primary backend because:

- this app has complex relational academic data
- attendance writes must be transactional
- reports and exports are SQL-shaped
- device-binding and audit flows are easier to enforce in a relational backend

Firebase can still be integrated later for optional services, but not as the system of record.

## How Each Architecture Area Will Be Implemented

## 1. Mobile App Implementation

Detailed docs:

- `Structure/architecture/03-student-mobile-app.md`
- `Structure/architecture/04-teacher-mobile-app.md`

Implementation decisions:

- one shared React Native app for both student and teacher roles
- Expo prebuild with custom development builds
- Expo Router for route groups like `(student)` and `(teacher)`
- TanStack Query for all API-backed data
- Zustand only for transient UI state such as scan progress, active tab, and device banners
- React Hook Form + Zod for profile, classroom, and schedule forms
- `expo-secure-store` for refresh token storage

Important rule:

- we will not depend on Expo Go for the final dev workflow because BLE advertising and device-trust features require native code

## 2. Teacher and Admin Web Implementation

Detailed doc:

- `Structure/architecture/05-teacher-web-app.md`

Implementation decisions:

- Next.js App Router
- server components for initial route bootstrapping and access checks
- client components for live session pages, charts, calendar editing, and report filters
- Tailwind CSS for layout and design system tokens
- shadcn/ui for consistent admin/dashboard primitives
- TanStack Table for roster, report, import, and device-support tables
- Recharts for analytics and distribution charts

Route groups:

- `(teacher)` for teacher operations
- `(admin)` for admin operations such as semesters, imports, and device recovery

## 3. API Implementation

Detailed docs:

- `Structure/architecture/01-system-overview.md`
- `Structure/architecture/02-auth-roles-enrollment.md`

Implementation decisions:

- NestJS with Fastify adapter
- REST API for all standard operations
- Socket.IO gateway for live session updates
- Zod schemas stored in `packages/contracts`
- API modules split by domain, not by controller type

Core API modules:

- `auth`
- `academic`
- `classrooms`
- `scheduling`
- `announcements`
- `devices`
- `admin`
- `sessions`
- `attendance`
- `qr`
- `bluetooth`
- `history`
- `reports`
- `exports`
- `analytics`
- `automation`

## 4. Worker Implementation

Detailed docs:

- `Structure/architecture/09-reports-exports.md`
- `Structure/architecture/10-analytics-email-automation.md`
- `Structure/architecture/14-classroom-communications-and-roster.md`

Implementation decisions:

- separate `apps/worker`
- BullMQ processors connected to Redis
- worker handles all slow and retryable work

Worker responsibilities:

- export generation
- analytics aggregate refresh
- low-attendance email jobs
- roster spreadsheet import processing
- announcement notification fan-out

## 5. Database and Data Model Implementation

Detailed doc:

- `Structure/architecture/11-data-rules-audit.md`

Implementation decisions:

- PostgreSQL is the source of truth
- Prisma owns migrations and schema
- SQL views and materialized views are allowed for report and analytics read models
- critical writes use transactions
- outbox table is mandatory for reliable async processing

Core table families:

- auth and identity tables
- academic and classroom tables
- schedule and lecture tables
- attendance tables
- reporting and analytics tables
- automation and email tables
- device and security tables
- audit and admin-action tables

## 6. Authentication and Google Login Implementation

Detailed doc:

- `Structure/architecture/02-auth-roles-enrollment.md`

Final decision:

- support email/password for admin and internal fallback accounts
- support Google login for teacher accounts
- support Google login or institution-approved OIDC flow for student accounts

### Mobile Google Login

Implementation:

- use `expo-auth-session`
- run Authorization Code + PKCE against Google OIDC endpoints
- exchange authorization code in backend
- backend verifies Google identity and creates AttendEase session

Why this path:

- standards-based
- works in Expo prebuild
- keeps the backend in control of user mapping and role checks

### Web Google Login

Implementation:

- web starts Google OIDC / Google Identity Services flow
- backend or server-side callback resolves user
- web stores session using secure httpOnly cookies

### Session Management

- access token short-lived
- refresh token rotated
- web session cookie secure and httpOnly
- mobile refresh token in secure storage

## 7. Device Trust and Anti-Multi-Account Security

Detailed docs:

- `Structure/architecture/15-device-trust-and-admin-controls.md`
- `Structure/architecture/12-non-functional-requirements.md`

Final decision:

- do not use MAC address
- use app-generated `install_id`
- use device key pair in secure hardware store when possible
- use platform attestation
- enforce student attendance only on trusted bound devices

### Why MAC Address Is Rejected

- unreliable on modern iOS and Android
- often unavailable or randomized
- not good enough for a serious production rule

### What We Will Use Instead

- `install_id`
- device public key
- Android Play Integrity
- Apple App Attest / DeviceCheck where available
- `user_device_bindings` and `security_events` in backend

### Enforcement Rule

- one active attendance-eligible student binding per device
- one active attendance-eligible device per student
- teacher and admin logins are less strict because they are not using student mark-attendance flows

### Recovery Rule

- admin can delink old device
- admin can approve replacement device
- old broken or stolen phone path is explicitly supported

## 8. Academic Management, Semesters, and Classroom CRUD

Detailed docs:

- `Structure/architecture/13-academic-management-and-scheduling.md`
- `Structure/architecture/14-classroom-communications-and-roster.md`

Final decision:

- `subjects`, `classes`, `sections`, `semesters`, and `course_offerings` are separate entities
- the operational classroom shown in UI is `course_offering`
- teachers may create course offerings only within assignment rules
- admins can define semesters and control lifecycle

### CRUD Coverage

Implemented through API and web/mobile UI for:

- semester creation and activation
- course offering creation and editing
- student roster add/remove/deactivate
- join-code creation and reset
- lecture creation where needed

## 9. Student Enrollment and Join-Classroom Implementation

Detailed docs:

- `Structure/architecture/02-auth-roles-enrollment.md`
- `Structure/architecture/14-classroom-communications-and-roster.md`

Final decision:

- enrollment is not only admin-managed
- classroom self-join via code is supported
- import-based roster onboarding is supported

Supported paths:

- join code entered by student in mobile app
- teacher manual add
- CSV/XLSX import
- admin academic provisioning

All paths end in the same enrollment / membership model.

## 10. Scheduling, Calendar, and Lecture Implementation

Detailed doc:

- `Structure/architecture/13-academic-management-and-scheduling.md`

Final decision:

- use recurring weekly schedule slots plus date-specific exceptions
- support extra one-off classes, cancellations, and reschedules
- use `Save & Notify` style flow
- `lectures` are separate from `attendance_sessions`
- `attendance_sessions` may reference `lecture_id`

Why this matters:

- schedule calendar remains clean
- lecture list can exist before attendance starts
- session history and lecture history stay aligned

## 11. QR + GPS Attendance Implementation

Detailed doc:

- `Structure/architecture/06-qr-gps-attendance.md`

Final decision:

- QR sessions created only from teacher web
- rolling QR tokens are generated from:
  - session ID
  - timestamp slice
  - version
  - HMAC signature
- QR tokens expire every short time slice
- backend accepts current and previous slice to tolerate small clock drift
- GPS validation is server-side

### QR Scanning Stack

- `expo-camera` for QR scanning
- backend validates HMAC and timestamp slice

### GPS Stack

- `expo-location` for student location capture
- backend computes haversine distance
- session anchor may be fixed classroom, campus zone, or teacher-selected live location

## 12. Bluetooth Attendance Implementation

Detailed doc:

- `Structure/architecture/07-bluetooth-attendance.md`

Final decision:

- BLE attendance uses beacon-style advertising
- no pairing flow
- no classic Bluetooth dependency
- no JS-only BLE workaround as the core implementation

### Native BLE Implementation

Android:

- `BluetoothLeAdvertiser`
- `BluetoothLeScanner`

iOS:

- `CBPeripheralManager`
- `CBCentralManager`

React Native bridge:

- custom Kotlin and Swift modules
- shared TypeScript wrapper in `apps/mobile/src/native/bluetooth`

### BLE Security

- rotating identifier per time slice
- validated on backend with session seed
- replay-like attempts logged into security events

## 13. Attendance History and Manual Edit Implementation

Detailed doc:

- `Structure/architecture/08-session-history-manual-edits.md`

Final decision:

- snapshot roster at session start
- create one attendance row per eligible student
- default all rows to `ABSENT`
- successful mark changes row to `PRESENT`
- manual edits update final row state and create audit log

This model is chosen because:

- absent count becomes deterministic
- reports stay stable
- edits become simple and safe

## 14. Reports, Exports, and Student Self-Reports

Detailed doc:

- `Structure/architecture/09-reports-exports.md`

Final decision:

- backend owns all report calculations
- student and teacher report screens use different DTOs but the same domain calculations
- exports run only as async jobs

Teacher report coverage:

- day-wise summary
- subject-wise summary
- per-student attendance percentage
- session-wise PDF and CSV
- comprehensive CSV

Student report coverage:

- overall attendance overview
- subject-wise percentage
- history
- low-attendance warning view

### Export Implementation

- worker fetches report data
- PDF rendered from HTML using Playwright
- CSV generated via streaming writer
- files uploaded to S3

## 15. Analytics and Low-Attendance Email Automation

Detailed doc:

- `Structure/architecture/10-analytics-email-automation.md`

Final decision:

- analytics uses aggregate tables refreshed by worker
- charts are server-prepared, not browser-computed from raw rows
- low-attendance threshold starts at 75%
- manual email send and daily automation both supported

Implementation:

- API writes outbox event when session or manual edit changes final attendance
- worker refreshes affected analytics aggregates
- scheduler checks due email rules
- SES sends emails
- logs stored in DB

## 16. Classroom Stream, Announcements, and Notifications

Detailed doc:

- `Structure/architecture/14-classroom-communications-and-roster.md`

Final decision:

- every classroom has a stream
- stream supports teacher announcements and generated schedule-update posts
- roster and schedule actions can optionally create notification events

Notification channels in the baseline:

- in-app notifications
- email for important automations and selected notices

Push notifications:

- supported later through the notification abstraction
- not required to unblock the first architecture build

## 17. Local Development Stack

Local environment will use:

- `pnpm`
- Docker Compose
- PostgreSQL container
- Redis container
- MinIO container
- Mailpit container

Mobile local workflow:

- Expo dev build on simulator or real device
- not Expo Go

Web/API local workflow:

- Next.js dev server
- NestJS dev server
- worker dev process
- root `pnpm dev` should boot the four runtime apps only; shared packages do not need separate manual watchers in phase 1

## 18. Production Deployment

Final decision:

- containerize `web`, `api`, and `worker`
- deploy all runtime services on AWS ECS Fargate
- use Amazon RDS PostgreSQL
- use Amazon ElastiCache Redis
- use Amazon S3 for object storage
- use Amazon SES for email

Why one main cloud stack:

- fewer moving parts
- easier secrets and networking
- simpler scaling and monitoring story

## 19. Testing Stack

Final decision:

- shared packages and pure domain logic: Vitest
- API integration and end-to-end HTTP tests: Jest + Supertest
- React Native component tests: Jest + React Native Testing Library
- web end-to-end tests: Playwright
- mobile end-to-end tests: Detox

Phase-1 scaffold note:

- the current repository baseline implements the first layer only: Vitest-based package and app-shell tests plus workspace validation
- integration, component, and E2E harnesses should be introduced in the phase that adds the corresponding real surface
- test conventions and placement rules are tracked in `Structure/testing-strategy.md`

Must-have test categories:

- auth and Google login
- device binding and admin delink
- QR token validation
- GPS range validation
- BLE rotating identifier validation
- roster import
- schedule save-and-notify
- reports and exports

## 20. Observability and Support

Final decision:

- Sentry for app, web, and backend errors
- structured JSON logs
- OpenTelemetry-compatible traces
- queue metrics
- websocket metrics
- security-event metrics

Support-critical logs must include:

- request ID
- user ID
- session ID when relevant
- job ID when relevant
- device or install reference for security-sensitive student actions

## 21. Build Order

We will implement in this order:

1. monorepo setup with `pnpm` and `Turborepo`
2. shared config, contracts, and domain packages
3. auth, Google OIDC, and device registration foundation
4. semesters, classrooms, course offerings, and enrollments
5. schedule, lecture, roster, and announcement modules
6. QR + GPS attendance end-to-end
7. history, manual edits, and reports
8. Bluetooth attendance end-to-end
9. exports, analytics, and email automation
10. observability, hardening, and performance tuning

## 22. Explicitly Rejected Choices

We are intentionally not choosing:

- plain React web app for iOS/Android delivery
- Flutter as the primary stack
- Firebase as the core system of record
- MAC-address-based account locking
- static QR tokens
- Bluetooth pairing as the attendance mechanism
- offline attendance as final truth
- Expo Go as the main development runtime

## 23. Source Basis

These decisions were aligned against official documentation and platform guidance:

- React Native recommends using a framework for new apps: [https://reactnative.dev/docs/environment-setup](https://reactnative.dev/docs/environment-setup)
- Expo prebuild and custom native code workflow: [https://docs.expo.dev/workflow/prebuild/](https://docs.expo.dev/workflow/prebuild/)
- Expo AuthSession: [https://docs.expo.dev/versions/latest/sdk/auth-session/](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- Expo Camera: [https://docs.expo.dev/versions/latest/sdk/camera/](https://docs.expo.dev/versions/latest/sdk/camera/)
- Expo Location: [https://docs.expo.dev/versions/latest/sdk/location/](https://docs.expo.dev/versions/latest/sdk/location/)
- Google OpenID Connect and OAuth guidance: [https://developers.google.com/identity/openid-connect/openid-connect](https://developers.google.com/identity/openid-connect/openid-connect)
- Next.js App Router docs: [https://nextjs.org/docs/app](https://nextjs.org/docs/app)
- NestJS authentication and websockets docs: [https://docs.nestjs.com/security/authentication](https://docs.nestjs.com/security/authentication), [https://docs.nestjs.com/websockets/gateways](https://docs.nestjs.com/websockets/gateways)
- Prisma with PostgreSQL: [https://www.prisma.io/docs/orm/overview/databases/postgresql](https://www.prisma.io/docs/orm/overview/databases/postgresql)
- BullMQ docs: [https://docs.bullmq.io/](https://docs.bullmq.io/)
- Socket.IO docs: [https://socket.io/docs/v4/](https://socket.io/docs/v4/)
- Android BLE advertiser docs: [https://developer.android.com/reference/android/bluetooth/le/BluetoothLeAdvertiser](https://developer.android.com/reference/android/bluetooth/le/BluetoothLeAdvertiser)
- Apple CoreBluetooth peripheral manager docs: [https://developer.apple.com/documentation/corebluetooth/cbperipheralmanager](https://developer.apple.com/documentation/corebluetooth/cbperipheralmanager)
- Google Play Integrity: [https://developer.android.com/google/play/integrity](https://developer.android.com/google/play/integrity)
- Apple App Attest / DeviceCheck: [https://developer.apple.com/documentation/devicecheck](https://developer.apple.com/documentation/devicecheck)

## Final Note

This file is the final stack decision layer. The architecture folder contains the deeper per-domain implementation details, and the requirements folder contains the product expectations those implementations must satisfy.
