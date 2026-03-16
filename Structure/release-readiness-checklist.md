# AttendEase Release Readiness Checklist

## Purpose

This checklist is the final closeout guide for taking AttendEase from feature-complete implementation to release-ready validation.

Use it after the architecture phases are complete.

## Current Project Status

- Core implementation is complete across student mobile, teacher mobile, teacher/admin web, API, worker, DB, reporting, exports, analytics, email automation, QR + GPS, Bluetooth, and device trust.
- The remaining work is verification, environment setup, operational hardening, and rollout signoff.
- This is a release-readiness checklist, not a feature backlog.

## Release Gate

Do not call the system release-ready until all of the following are complete:

- environment configuration is set for the target deployment
- database migrations run cleanly in the target environment
- object storage is reachable and signed download flow works
- email provider works in the target environment
- health, readiness, and queue-health surfaces are green
- teacher web critical flows pass
- student mobile critical flows pass
- teacher mobile critical flows pass
- QR attendance passes on real devices
- Bluetooth attendance passes on real devices
- backup and restore drill is performed
- observability is enabled and verified

## Environment Setup

- Prepare production or staging env files for API, worker, web, and mobile.
- Set real values for auth secrets and Google OIDC configuration.
- Set real storage configuration and verify bucket access.
- Set real SES configuration if email automation is enabled.
- Set real Sentry DSN and OTEL endpoint if observability is required at launch.
- Decide rollout values for:
  - `FEATURE_BLUETOOTH_ATTENDANCE_ENABLED`
  - `FEATURE_EMAIL_AUTOMATION_ENABLED`
  - `FEATURE_STRICT_DEVICE_BINDING_MODE`
- Decide whether Bluetooth launches enabled or as a pilot rollout.
- Decide whether email automation launches enabled or stays off initially.

## Infrastructure Validation

- Run migrations in the target environment.
- Seed only the environments that are supposed to contain demo or development data.
- Verify PostgreSQL reachability from API and worker.
- Verify Redis reachability if production uses Redis-backed rate limiting.
- Verify MinIO or S3-compatible storage from API and worker.
- Verify Mailpit in local development and SES in deployment environments.

## Health And Observability

- Verify `GET /health` returns healthy.
- Verify `GET /health/ready` returns ready under normal operation.
- Verify `GET /health/queues` returns healthy under normal operation.
- Verify degraded readiness behavior when DB is unavailable.
- Verify degraded queue-health behavior when work is intentionally stalled.
- Verify request IDs appear in logs and API error responses.
- Verify structured logs redact tokens, secrets, cookies, and credentials.
- Verify Sentry captures a forced server-side error in staging.
- Verify traces appear in the configured tracing backend if tracing is enabled.

## Teacher Web Critical Flows

- Login and protected-route behavior.
- Dashboard loads without auth leakage.
- Classroom create, update, and archive flows.
- Semester management flows.
- Schedule editing and save-and-notify.
- Classroom stream posting.
- Roster import create, monitor, and apply.
- Session history view and manual edit save.
- Report filtering.
- Export request and signed download.
- Analytics filters and drill-downs.
- Email automation rule create, preview, manual send, and run/log visibility.
- QR session create, active control page, and projector page.
- Admin device support search, revoke, delink, and replacement approval.

## Student Mobile Critical Flows

- Login and trusted-device state handling.
- Dashboard data load.
- Join-classroom flow.
- Classroom detail, stream, and schedule views.
- Report overview and subject detail views.
- Device-status screen and blocked-attendance messaging.
- QR attendance scan plus GPS submit.
- Bluetooth session detection and mark submit.
- Post-attendance refresh on success.

## Teacher Mobile Critical Flows

- Login and teacher dashboard load.
- Classroom list and classroom detail navigation.
- Roster management entrypoints.
- Schedule editing draft and save.
- Announcement composer and list.
- Bluetooth session start, active state, and stop flow.
- Session history and manual edit flow.
- Report and export request flows.

## QR Attendance Real-Device Checklist

- Teacher can start QR attendance from web.
- Projector page visibly updates during active session.
- Student scans QR successfully on a real phone.
- Student GPS permission denial shows the correct message.
- Out-of-range GPS attempt is blocked correctly.
- Poor GPS accuracy attempt is blocked correctly.
- Duplicate mark is blocked correctly.
- Session end stops further marking.
- Teacher sees final counts correctly after marks.

## Bluetooth Attendance Real-Device Checklist

- Teacher advertiser starts on Android.
- Teacher advertiser starts on iOS.
- Bluetooth-disabled state is surfaced clearly.
- Advertiser-start failure is surfaced clearly.
- Student scan detects the active classroom session.
- Student can choose between detected sessions if more than one is visible.
- Invalid or replayed BLE payloads are rejected.
- Duplicate BLE mark is rejected.
- Session end stops further BLE marking.
- Teacher stop-retry flow recovers correctly after a transient failure.

Also use:

- [bluetooth-device-test-checklist.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/bluetooth-device-test-checklist.md)

## Security And Abuse Checks

- Student cannot switch through multiple accounts on one phone for attendance.
- Student cannot use a second active device without admin recovery.
- Revoked device cannot mark attendance.
- Teacher cannot access admin recovery routes.
- Student cannot access teacher/admin scoped data.
- Report and analytics access is scoped correctly.
- Export access is scoped correctly.
- Suspicious attendance failures log to security events without corrupting attendance truth.
- Rollout-disabled routes fail closed with `503`.

## Backup And Recovery

- Perform a PostgreSQL backup.
- Perform a PostgreSQL restore into a verification environment.
- Verify restored API readiness after restore.
- Verify object storage export files are still retrievable where expected.
- Verify queue-health after restore and worker restart.
- Review and follow:
  - [operations-runbook.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/operations-runbook.md)

## Performance And Stability Checks

- Verify auth rate limiting.
- Verify attendance-mark rate limiting.
- Verify report endpoints under realistic seeded data.
- Verify export generation under realistic data volume.
- Verify roster import processing under realistic row volume.
- Verify worker cycles do not leave stale processing rows under normal operation.
- Verify queue-health remains healthy after repeated export/import/analytics/email activity.

## Launch Decision

Release candidate is acceptable only when:

- no critical path is failing
- no role or scope leak is present
- no attendance-truth corruption issue is present
- QR works on real devices
- Bluetooth works on the intended pilot devices if enabled at launch
- observability is live
- restore drill is completed
- known caveats are explicitly accepted by the team

## Known Caveats To Decide Explicitly

- Bluetooth can launch enabled or as a pilot-only rollout.
- Email automation can launch enabled or after SES-only validation.
- Realtime transport is still a seam, so live updates currently rely on polling where already implemented.
- BullMQ-backed orchestration is still optional future hardening, not a blocker for current contracts.
- SES bounce and complaint feedback is still deferred.

## Recommended Next Prompt

Use a dedicated execution prompt for final validation, for example:

"Use [release-readiness-checklist.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/release-readiness-checklist.md) as the source of truth. Run the remaining release-readiness verification for AttendEase against the current repo and local stack, record pass/fail results, fix safe issues directly, and produce a final go/no-go summary."
