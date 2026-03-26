# Testing Strategy Validation Inventory

This companion note keeps the long-form test inventory and audit-validation references that support the main testing strategy.

## Screenshot Audit Validation Layer

Outputs:

- `Structure/full-product-screenshot-audit.md`
- `Structure/artifacts/full-product-audit/mobile`
- `Structure/artifacts/full-product-audit/web`

Interpretation rules:

- `PASS` means the expected screen/state was captured successfully
- `FAIL` means a product defect was reproduced and should be recorded with repro notes
- `BLOCKED` means code or environment prevented the expected state
- `MANUAL-REQUIRED` means hardware-only proof is still outstanding even when the UI route is captured

## Test Placement And Layering

- Shared packages: `packages/*/src/*.test.ts`
- API shell tests: `apps/api/src/**/*.test.ts`
- Web shell tests: `apps/web/src/**/*.test.ts`
- Mobile shell tests: `apps/mobile/src/**/*.test.ts`
- Worker shell tests: `apps/worker/src/**/*.test.ts`

Unit tests stay colocated beside source files. Integration tests live under app or DB runtime boundaries with `*.integration.test.ts` naming.

## Current Coverage Inventory

Representative current coverage includes:

- DB integration and helpers: `packages/db/src/integration.test.ts`, `packages/db/src/client.test.ts`, `packages/db/src/transactions.test.ts`, `packages/db/src/audit.test.ts`, `packages/db/src/schema.test.ts`
- API auth, academic, attendance, reports, exports, analytics, non-functional, and worker coverage across `apps/api/src/**/*.test.ts` and `apps/worker/src/**/*.test.ts`
- Shared/client coverage in `packages/auth/src/client.test.ts`, `packages/contracts/src/index.test.ts`, `packages/contracts/src/reset-contracts.test.ts`, `packages/domain/src/academic-language.test.ts`, `packages/ui-mobile/src/index.test.ts`, and `packages/ui-web/src/index.test.ts`
- Web portal coverage in `apps/web/src/web-portal.test.ts`, `apps/web/src/web-workflows.test.ts`, `apps/web/src/web-auth-entry.test.ts`, `apps/web/src/web-auth-session.test.ts`, `apps/web/src/teacher-classroom-management.test.ts`, `apps/web/src/teacher-roster-management.test.ts`, and `apps/web/src/teacher-review-workflows.test.ts`
- Mobile coverage in `apps/mobile/src/mobile-entry.test.ts`, `apps/mobile/src/student-query.test.ts`, `apps/mobile/src/student-routes.test.ts`, `apps/mobile/src/student-view-state.test.ts`, `apps/mobile/src/student-attendance.banner.test.ts`, `apps/mobile/src/student-attendance.marking.test.ts`, `apps/mobile/src/student-workflow-models.test.ts`, `apps/mobile/src/teacher-routes.test.ts`, `apps/mobile/src/teacher-query.test.ts`, `apps/mobile/src/teacher-models.test.ts`, `apps/mobile/src/teacher-view-state.test.ts`, `apps/mobile/src/teacher-roster-management.test.ts`, and `apps/mobile/src/teacher-operational.test.ts`

## Reset Prompt Coverage References

Reset-track prompts should keep coverage aligned across:

- teacher web classroom management, roster, history, and reports
- mobile auth, teacher shell, teacher roster, and student device lifecycle
- classroom CRUD, seed fixtures, and report truth

Key reference files include:

- `apps/web/src/teacher-classroom-management.test.ts`
- `apps/web/src/teacher-roster-management.test.ts`
- `apps/web/src/teacher-review-workflows.test.ts`
- `apps/web/src/web-portal.test.ts`
- `apps/web/src/web-workflows.test.ts`
- `apps/mobile/src/mobile-entry.test.ts`
- `apps/mobile/src/device-trust.test.ts`
- `apps/mobile/src/teacher-routes.test.ts`
- `apps/mobile/src/teacher-roster-management.test.ts`
- `apps/mobile/src/teacher-query.test.ts`
- `apps/mobile/src/teacher-view-state.test.ts`
- `apps/mobile/src/student-attendance.banner.test.ts`
- `apps/mobile/src/student-attendance.marking.test.ts`
- `packages/auth/src/client.test.ts`
- `packages/contracts/src/index.test.ts`
- `packages/db/src/integration.test.ts`
- `apps/api/src/modules/auth/auth.integration.test.ts`
- `apps/api/src/modules/academic/academic-management.integration.test.ts`
- `apps/api/src/modules/academic/classroom-roster.integration.test.ts`
- `apps/api/src/modules/attendance/attendance-history.integration.test.ts`
- `apps/api/src/modules/reports/reports.integration.test.ts`

## E2E And Device-Level Guidance

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
