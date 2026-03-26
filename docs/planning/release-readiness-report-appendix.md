# AttendEase Release Readiness Appendix

Companion to: [`release-readiness-report.md`](./release-readiness-report.md)

## QR Real-Device Checks

Status: MANUAL REQUIRED

- PASS (host-only): the live QR backend path was verified end to end against the running Docker runtime.
- PASS (automated): QR token, GPS, duplicate protection, and error-mapping coverage remains green.
- PASS (emulator-native UX-only): the student QR route was re-verified in the native reset build for trusted-device messaging and clear empty/live-waiting state handling.
- MANUAL REQUIRED (real-device-only): real QR plus GPS verification still must be performed on actual hardware.

## Bluetooth Real-Device Checks

Status: MANUAL REQUIRED

- PASS (host-only): the live Bluetooth backend path was verified end to end against the running Docker runtime.
- PASS (automated): mocked BLE wrapper, teacher recovery models, scanner selection, and backend invalid or replay protection remain green.
- PASS (emulator-native UX-only): the student Bluetooth route and teacher Bluetooth setup route were re-verified in the native reset build for clean empty/live-waiting and setup-state UX.
- MANUAL REQUIRED (real-device-only): Android and iOS BLE validation still must be performed on actual hardware.

## Security/Abuse Checks

Status: PASS

Live and automated checks confirm:

- same-phone multi-account prevention
- second-device blocking
- revoked-device readiness blocking
- teacher/admin route isolation
- report/export/analytics scope correctness
- auth and attendance rate limiting
- rollout-flag fail-closed behavior
- structured request-ID logging
- queue-health and worker liveness surfaces
- separation of suspicious attendance failures from final attendance truth

## Backup/Recovery Checks

Status: MANUAL REQUIRED

- PASS: operational documentation exists for runtime startup, health checks, queue triage, and backup/recovery guidance.
- PASS: PostgreSQL backup and restore were exercised with a full dump and temp-database restore inside the Docker stack.
- PASS: queue-health degradation and stale-work recovery were exercised live.
- MANUAL REQUIRED: object-storage backup and restore remain operations-only in this pass.

## Performance/Stability Checks

Status: MANUAL REQUIRED

- PASS: queue-health surfaces report all queues healthy with zero backlog in the runtime stack.
- PASS: worker health succeeded in-container.
- PASS: containerized smoke validation succeeded.
- PASS: export retention behavior is enforced at the API response layer.
- PASS: stale-work recovery protections are aligned with the queue-health surface.
- MANUAL REQUIRED: no load, soak, or production-like concurrency run was executed in this baseline.

## Production-Only Setup Required

- configure real auth secrets and Google OIDC envs
- configure real storage bucket, public endpoint, and retention/versioning policy
- configure real SES credentials and sender settings if email automation launches enabled
- configure Sentry DSN and OTEL exporter endpoint
- choose launch rollout values for Bluetooth and email automation
- decide whether Bluetooth launches enabled or stays pilot-only until device validation finishes

## Accepted Caveats

- local host-port `5432` conflict is machine-specific and not a product blocker because `POSTGRES_PORT=55432` works
- realtime updates still rely on polling where already implemented
- BullMQ-backed orchestration is still optional hardening and not required for current contracts
- SES bounce/complaint feedback is still deferred

## Test Files Added or Updated During Release-Readiness

- `packages/auth/src/client.test.ts`
- `packages/export/src/index.test.ts`
- `packages/config/src/index.test.ts`
- `apps/web/src/web-portal.test.ts`
- `apps/web/src/web-auth-session.test.ts`
- `apps/web/src/web-workflows.test.ts`
- `apps/web/src/teacher-analytics-automation.test.ts`
- `apps/api/src/modules/exports/exports.integration.test.ts`
- `apps/api/src/modules/automation/automation.integration.test.ts`
- `apps/api/src/modules/attendance/attendance-history.integration.test.ts`
- `apps/api/src/modules/academic/classroom-roster.integration.test.ts`
- `apps/api/src/infrastructure/non-functional.integration.test.ts`
- `apps/mobile/src/student-foundation.test.ts`
- `apps/mobile/src/student-workflow-models.test.ts`
- `apps/mobile/src/teacher-models.test.ts`
- `apps/mobile/src/teacher-operational.test.ts`

## Commands Run

Representative commands executed during the release-readiness pass:

```bash
pnpm workspace:validate
pnpm check
POSTGRES_PORT=55432 pnpm runtime:up
POSTGRES_PORT=55432 pnpm runtime:check
POSTGRES_PORT=55432 pnpm runtime:down
pnpm --filter @attendease/web test -- src/web-portal.test.ts src/web-workflows.test.ts src/teacher-analytics-automation.test.ts
pnpm --filter @attendease/api test -- src/modules/exports/exports.integration.test.ts src/modules/automation/automation.integration.test.ts src/modules/attendance/attendance-history.integration.test.ts
pnpm --filter @attendease/mobile test -- src/student-session.test.ts src/student-foundation.test.ts src/student-attendance.test.ts src/student-query.test.ts src/student-view-state.test.ts src/device-trust.test.ts src/bluetooth-attendance.test.ts src/native/bluetooth/AttendEaseBluetooth.test.ts src/teacher-session.test.ts src/teacher-models.test.ts src/teacher-operational.test.ts src/teacher-query.test.ts src/teacher-schedule-draft.test.ts src/teacher-routes.test.ts src/student-routes.test.ts
pnpm --filter @attendease/mobile typecheck
ATTENDEASE_API_URL=http://127.0.0.1:4000 pnpm verify:mobile-reports
pnpm --filter @attendease/api test -- src/modules/reports/reports.integration.test.ts
```

## Exact Next Recommended Action

1. complete the remaining physical-device validation using `guide.md`, `Structure/manual-check-quickstart.md`, and `Structure/bluetooth-device-test-checklist.md`
2. validate production or staging Google OIDC, SES, Sentry, and OTEL setup with real credentials
3. update the main readiness report to either `GO` or `NO-GO` after those environment and hardware checks complete
