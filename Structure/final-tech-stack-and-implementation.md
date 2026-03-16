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
| Mobile auth | `expo-auth-session` using Google OIDC Authorization Code + PKCE | Standards-based Google login for mobile |
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

AttendEase needs device-heavy student and teacher mobile flows, a projector-friendly teacher web surface, and richer teacher/admin dashboards. React Native covers device access well, Next.js handles the web portals cleanly, and NestJS plus PostgreSQL provides the safest backend shape for academic, attendance, and governance rules.

We are not using Firebase as the system of record because this product needs relational academic data, transactional attendance writes, SQL-shaped reports, and enforceable device-binding and audit rules.

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

## 4. Worker Implementation

Detailed docs:

- `Structure/architecture/09-reports-exports.md`
- `Structure/architecture/10-analytics-email-automation.md`
- `Structure/architecture/14-classroom-communications-and-roster.md`

Implementation decisions:

- separate `apps/worker`
- BullMQ processors connected to Redis
- worker handles all slow and retryable work such as exports, analytics refresh, low-attendance emails, roster imports, and announcement fan-out

## 5. Database and Data Model Implementation

Detailed doc:

- `Structure/architecture/11-data-rules-audit.md`

Implementation decisions:

- PostgreSQL is the source of truth
- Prisma owns migrations and schema
- SQL views and materialized views are allowed for report and analytics read models
- critical writes use transactions
- outbox table is mandatory for reliable async processing

## 6. Authentication and Google Login Implementation

Detailed doc:

- `Structure/architecture/02-auth-roles-enrollment.md`

Final decision:

- support email/password for admin and internal fallback accounts
- support Google login for teacher accounts
- support Google login or institution-approved OIDC flow for student accounts
- short-lived access tokens plus rotated refresh tokens
- secure httpOnly cookies for web and secure storage for mobile

## 7. Device Trust and Anti-Multi-Account Security

Detailed docs:

- `Structure/architecture/15-device-trust-and-admin-controls.md`
- `Structure/architecture/12-non-functional-requirements.md`

Final decision:

- do not use MAC address
- use `install_id`, device key material, platform attestation, and backend binding tables
- enforce student attendance only on trusted bound devices
- keep teacher/admin login less strict because they do not mark attendance as students

## 8. Academic Management, Semesters, and Classroom CRUD

Detailed docs:

- `Structure/architecture/13-academic-management-and-scheduling.md`
- `Structure/architecture/14-classroom-communications-and-roster.md`

Final decision:

- `subjects`, `classes`, `sections`, `semesters`, and `course_offerings` are separate entities
- the operational classroom shown in UX is `course_offering`
- teachers may create course offerings only within assignment rules
- admins can define semesters and control lifecycle

## 9. Student Enrollment and Join-Classroom Implementation

Detailed docs:

- `Structure/architecture/02-auth-roles-enrollment.md`
- `Structure/architecture/14-classroom-communications-and-roster.md`

Final decision:

- enrollment is not only admin-managed
- classroom self-join via code is supported
- import-based roster onboarding is supported
- all paths end in the same enrollment and membership model

## 10. Scheduling, Calendar, and Lecture Implementation

Detailed doc:

- `Structure/architecture/13-academic-management-and-scheduling.md`

Final decision:

- use recurring weekly schedule slots plus date-specific exceptions
- support extra one-off classes, cancellations, and reschedules
- keep `lectures` separate from `attendance_sessions`
- allow `attendance_sessions` to reference `lecture_id`

Detailed attendance, reporting, local-runtime, deployment, observability, build-order, and rejected-choice notes now live in [`final-tech-stack-and-implementation-appendix.md`](./final-tech-stack-and-implementation-appendix.md).
