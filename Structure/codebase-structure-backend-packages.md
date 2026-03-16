# Backend And Packages Structure

## API

- `apps/api/src/modules/auth`
  - authentication, registration, refresh, and session protection.
- `apps/api/src/modules/academic`
  - semesters, classrooms, schedule, roster, join codes, and imports.
- `apps/api/src/modules/attendance`
  - QR, Bluetooth, live session truth, and manual correction.
- `apps/api/src/modules/reports`
  - student and teacher reporting surfaces.
- `apps/api/src/modules/analytics`
  - aggregated attendance analytics.
- `apps/api/src/modules/automation`
  - low-attendance email automation orchestration.
- `apps/api/src/modules/devices`
  - trusted-device binding and attendance-readiness checks.
- `apps/api/src/modules/admin`
  - device recovery, student governance, and classroom governance.
- `apps/api/src/health`
  - service readiness and queue health helpers.

## Worker

- `apps/worker/src/jobs/export-job.processor.ts`
  - export queue orchestration.
- `apps/worker/src/jobs/email-automation.processor.ts`
  - scheduled/manual email dispatch orchestration.
- `apps/worker/src/jobs/analytics-refresh.processor.ts`
  - analytics refresh orchestration.
- Companion `*.common.ts`, `*.loaders.ts`, `*.dispatch.ts`, and `*.builders.ts`
  - split support modules for each worker job family.

## Shared Packages

- `packages/contracts/src`
  - API schema source of truth.
- `packages/contracts/src/academic.ts`
  - stable barrel over `academic.*.ts` modules.
- `packages/contracts/src/attendance.ts`
  - stable barrel over `attendance.*.ts` modules.
- `packages/auth/src`
  - shared auth/session client logic for web and mobile.
- `packages/auth/src/client.ts`
  - stable barrel over `client.*.ts` method-builder modules.
- `packages/db/src`
  - Prisma helpers, fixtures, seeds, and DB tests.
- `packages/db/src/seed.ts`
  - stable development-seed orchestrator over `seed.*.ts` domain modules.
- `packages/domain/src`
  - UI-free product rules and shared mapping helpers.
- `packages/ui-mobile`
  - shared mobile design tokens and primitives.
- `packages/ui-web`
  - shared web design tokens and primitives.

## Backend Structure Rules

- Keep route/service entry files thin and move domain-heavy logic into sibling helpers.
- Keep stable public barrels in `packages/contracts`, `packages/auth`, and `packages/db`.
- Treat worker processors like API services: orchestration at the top, detailed logic in focused helper modules.
