# AttendEase Implementation Context

Use this file as the shared handoff for new chat windows.
Keep it short, factual, and implementation-focused.

## Current Status

- Product baseline is feature-complete across student mobile, teacher mobile, teacher/admin web, QR + GPS attendance, Bluetooth attendance, reports, exports, analytics, automation, and device trust/admin recovery.
- Release baseline is still `NO-GO` until real-device QR, GPS, and Bluetooth validation plus production environment checks are completed.
- Premium reset UI is in place across mobile and web through `packages/ui-mobile` and `packages/ui-web`.
- Deterministic audit artifacts live under `Structure/full-product-screenshot-audit.md` and `Structure/artifacts/full-product-audit`.
- Last updated on: `2026-03-16`
- Updated by: `Copilot`

## Reset Track Status

- Prompt 1 through Prompt 40 are complete.
- Reset-track IA/auth markers are enforced by workspace validation.
- Source-of-truth reset audit:
  - `Structure/ux-redesign-audit.md`
- Core reset docs already updated:
  - `Structure/requirements/01-system-overview.md`
  - `Structure/requirements/02-auth-roles-enrollment.md`
  - `Structure/requirements/03-student-mobile-app.md`
  - `Structure/requirements/04-teacher-mobile-app.md`
  - `Structure/requirements/05-teacher-web-app.md`
  - `Structure/architecture/01-system-overview.md`
  - `Structure/architecture/02-auth-roles-enrollment.md`
  - `Structure/architecture/03-student-mobile-app.md`
  - `Structure/architecture/04-teacher-mobile-app.md`
  - `Structure/architecture/05-teacher-web-app.md`

## Structure Status

- Non-test TypeScript source is now fully under the `400` line guardrail.
- Final shared-package splits completed:
  - `packages/contracts/src/academic.ts` into `academic.*.ts`
  - `packages/contracts/src/attendance.ts` into `attendance.*.ts`
  - `packages/auth/src/client.ts` into `client.*.ts`
  - `packages/db/src/seed.ts` into `seed.*.ts`
- Current repo-wide cleanup status:
  - functional source files are done
  - remaining over-limit files are tests, docs, one audit script, generated Android/CMake artifacts, and a few lock/schema/migration files
- Cleanup tracker:
  - `Structure/line-count-cleanup-plan.md`

## Prompt 4 Summary

- Authentication and role-entry reset work is complete.
- Student self-registration, teacher self-registration, and admin login-only behavior remain the enforced baseline.
- Later cleanup must preserve the split entry ownership and the final auth contract surface.

## Prompt 5 Summary

- Shared mobile/web shell cleanup and reset IA alignment are complete.
- The remaining repo-wide line-count work is structural only and must not reintroduce placeholder-heavy UX or seeded-helper primary flows.
- Current follow-up focus is tests, docs, and generated artifact hygiene rather than product behavior changes.

## Prompt 39 Summary

- Documentation sync for the reset track is complete at the product-story level.
- The current documentation cleanup pass is specifically about file-size restructuring, not changing reset decisions.
- Any additional doc splits should keep top-level docs short and move long detail into linked sibling docs.

## Prompt 40 Validation Summary

- Root automated validation is now green for runtime-backed tests:
  - `POSTGRES_PORT=55432 pnpm test`
  - `pnpm typecheck`
  - `POSTGRES_PORT=55432 pnpm runtime:check`
- API and worker test scripts now run Vitest with one worker to avoid temporary PostgreSQL / Prisma connection exhaustion during full-suite runs.
- Android emulator validation was rerun on `Pixel_9_Pro_XL`:
  - native build/install/open succeeded
  - `MainActivity` resumed successfully
  - the landing screen rendered with split student/teacher entry actions confirmed through `uiautomator dump`
- Lint is now green:
  - all 119 formatting/import-order/useImportType issues across `packages/db`, `apps/mobile`, and `apps/web` were resolved
  - Biome check passes across all packages with zero errors

## Validation Snapshot

- Shared package validation completed:
  - `pnpm --filter @attendease/contracts typecheck`
  - `pnpm --filter @attendease/contracts exec vitest run src/index.test.ts src/reset-contracts.test.ts`
  - `pnpm --filter @attendease/auth typecheck`
  - `pnpm --filter @attendease/auth exec vitest run src/client.test.ts src/reset-client.auth.test.ts src/reset-client.attendance-admin.test.ts src/index.test.ts`
  - `pnpm --filter @attendease/db typecheck`
  - `pnpm --filter @attendease/db test`
- Workspace validation completed:
  - `pnpm workspace:validate`
- Full repo validation completed:
  - `POSTGRES_PORT=55432 pnpm test`
  - `pnpm typecheck`
  - `POSTGRES_PORT=55432 pnpm runtime:check`
- Android emulator validation completed:
  - `EXPO_PUBLIC_API_URL=http://127.0.0.1:4000 pnpm android:validate -- --device Pixel_9_Pro_XL --port 8083 --no-install`
- Seed-focused DB integration discovery:
  - `pnpm --filter @attendease/db exec vitest run src/integration.test.ts -t "seedDevelopmentData"`
  - the suite was discovered but skipped in this environment

## Existing Baseline To Preserve

- Keep one-device binding and do not regress to vague device identity.
- Keep teacher mobile as Bluetooth owner and teacher web as QR + GPS owner.
- Keep admin as login-only plus governance/recovery, not self-registration.
- Reuse the existing backend and domain truth instead of rebuilding flows from scratch.

## Post-Cleanup Validation Summary

- All lint errors resolved: 119 Biome format/import-order/useImportType issues fixed across `packages/db`, `apps/mobile`, and `apps/web`.
- All integration test failures resolved: DB connection pool exhaustion (8 failures across 4 test files) fixed by capping `PrismaPg` pool size and improving connection cleanup in test teardown.
- Android build artifacts removed from tracked files and added to `.gitignore`.
- Full `pnpm -w run check` passes: workspace validation, lint, typecheck (16/16), and tests (222 API + 331 unit).

## Exact Next Pickup Point

- Remaining cleanup work:
  - split the remaining large tests and docs listed in `Structure/line-count-cleanup-plan.md`
- Product follow-up:
  - run real-device QR, GPS, and Bluetooth validation
  - validate production credentials and release-readiness integrations (Google OIDC, SES, Sentry, OTEL)
