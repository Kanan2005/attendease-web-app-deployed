# Line Count Cleanup Plan

Use this file as the source of truth for the repo-wide `400` line cleanup pass.

## Current Snapshot

- Raw repo scan on `2026-03-16` found `64` files over `400` lines.
- Current repo scan, excluding generated Android/CMake output, shows the remaining over-limit set is now dominated by test files plus explicit lock/schema/migration exceptions.
- Functional `*.ts` / `*.tsx` source files over `400`: `0`
- Oversized hand-authored docs that still drive product and architecture understanding are now split into overview-plus-notes files.
- Markdown docs over `400`: `0`
- Remaining long exceptions are mostly:
  - large integration or end-to-end style test files
  - `pnpm-lock.yaml`
  - `packages/db/prisma/schema.prisma`
  - the initial migration SQL

## Highest Remaining Files

- `packages/auth/src/client.test.ts`
- `packages/db/src/integration.test.ts`
- `packages/contracts/src/index.test.ts`
- `apps/api/src/modules/academic/classroom-roster.integration.test.ts`
- `apps/api/src/modules/attendance/attendance-history.integration.test.ts`
- `apps/api/src/modules/auth/auth.integration.test.ts`
- `apps/mobile/src/teacher-operational.test.ts`

## Cleanup Order

1. Generated artifact hygiene
   - ignore `apps/mobile/android/app/.cxx`
   - ignore Android Gradle/build output
   - keep generated files out of future scans

2. Context and structure docs
   - keep top-level handoff docs short
   - move long histories into smaller sibling docs only when they are still useful
   - avoid turning index docs into changelog dumps

3. Large test suites
   - split by domain and behavior
   - prefer `*.auth.test.ts`, `*.attendance.test.ts`, `*.reports.test.ts`, `*.roster.test.ts`, `*.device.test.ts`
   - keep a small barrel test only if it adds value

4. Large scripts
   - split helpers, scanners, and report builders into smaller sibling modules

5. Hard exceptions
   - review `pnpm-lock.yaml`
   - review `packages/db/prisma/schema.prisma`
   - review migration SQL files
   - keep these as documented exceptions unless a safe generation strategy exists

## Acceptance Target

- Every hand-authored source, test, script, and doc file should be under `400` lines.
- Generated artifacts should be ignored and excluded from the cleanup target.
- Any remaining exception file must be documented explicitly in `Structure/context.md`.

## Current Guardrails

- `scripts/full-product-audit-lib.mjs` has already been split into smaller audit data/helper modules.
- `scripts/line-count-validator.mjs` is now part of `pnpm workspace:validate`.
- major product and ops docs now stay under the limit with companion notes or appendix docs, including auth architecture, student-mobile architecture, data-rules architecture, final tech stack, Dockerization, release readiness, and Android emulator validation
- `packages/auth/src/reset-client.test.ts` has been split into smaller auth and attendance/admin suites plus shared fixtures.
- `apps/api/src/modules/automation/automation.integration.test.ts` has been reduced with a dedicated test-support module.
- `apps/mobile/src/student-attendance.test.ts` has been split into banner, marking, and fixture-focused test files.
- `Structure/architecture/05-teacher-web-app.md` now stays under the limit with a companion implementation-notes doc.
- `Structure/requirements/05-teacher-web-app.md` now stays under the limit with a companion notes doc.
- `Structure/architecture/06-qr-gps-attendance.md` now stays under the limit, with validation details moved into a companion doc.
- `Structure/architecture/01-system-overview.md` and `Structure/architecture/13-academic-management-and-scheduling.md` now stay under the limit with companion foundation/notes docs.
- `Structure/testing-strategy.md` now stays under the limit with a companion validation-inventory doc.
- `Structure/phase_prompting/` replaces the earlier typoed `Structure/phase_promptioing/` folder name.
- Any newly oversized tracked file fails validation unless it is added deliberately to the reviewed allowlist.
