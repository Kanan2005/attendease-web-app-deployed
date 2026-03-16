# Non-Functional Architecture

Maps to: [`../requirements/12-non-functional-requirements.md`](../requirements/12-non-functional-requirements.md)

## Purpose

This document defines the operational, security, performance, observability, and delivery architecture that supports the product features.

## Security Architecture

### Authentication Security

- password hashes stored with Argon2 or equivalent
- refresh tokens stored hashed server-side if persistent
- web auth cookies marked secure and httpOnly
- mobile refresh tokens stored only in secure storage
- Google login tokens validated server-side against trusted issuer metadata

### Authorization Security

- all protected endpoints require auth guard
- all teacher actions require role guard
- all session and report actions require scope policy checks

### API Security

- request validation through Zod-backed DTOs
- rate limiting on auth and attendance-mark endpoints
- request IDs in logs
- idempotent handling for retry-prone endpoints
- a centralized exception filter that returns a stable error envelope with `requestId`
- a reusable rate-limit guard with named policies instead of controller-local logic

### Device Trust Security

- do not depend on MAC address as a mobile identity primitive
- use app-scoped device install IDs and signed device registration
- use platform attestation where available, such as Android Play Integrity and Apple attestation flows
- enforce student attendance marking only from trusted bound devices
- log suspicious account-switch attempts, repeated invalid marks, and revoked-device usage
- log suspicious QR location-validation failures with session/device context but without copying raw GPS coordinates into security-event text
- centralize trusted-device checks in a reusable guard rather than duplicating device validation in each attendance controller
- provide audited admin recovery endpoints so legitimate device replacement does not require weakening the trust model

## Privacy Architecture

The system should minimize sensitive exposure.

Rules:

- request location only during QR + GPS marking
- request Bluetooth permissions only during Bluetooth flow
- do not expose one student's records to another student
- avoid long-term storage of unnecessary raw device telemetry
- avoid collecting invasive hardware identifiers when app-scoped trust signals are sufficient

## Performance Architecture

### Attendance Path

The highest-priority performance path is live attendance marking.

Design rules:

- attendance mark endpoints should be small transactional writes
- avoid heavy joins in the write path
- live counter updates should be event-driven, not polling-heavy

### Reporting Path

- use read models or aggregate tables
- move file generation to workers
- keep large exports out of request-response path

### Import and Notification Path

- spreadsheet imports should run asynchronously
- notification fan-out should run in workers, not user requests
- schedule-save actions may return quickly while notifications continue in the background

## Scalability Plan

The architecture should scale each concern separately:

- web instances for teacher traffic
- API instances for attendance and data APIs
- worker instances for exports and email volume
- Redis and Postgres vertically first, then API horizontally

This is enough for a college-scale deployment without premature complexity.

## Observability Architecture

The system should ship with:

- structured JSON logs
- error tracking
- API latency metrics
- job queue metrics
- websocket connection metrics
- device-binding and suspicious-event metrics

Recommended tooling:

- Sentry for app and API errors
- OpenTelemetry-compatible tracing
- metrics dashboard for queue and API health

Current repo implementation:

- `packages/config` validates API and worker envs with defaults
- `apps/api/src/infrastructure/request-context.middleware.ts` propagates request IDs and wraps request context
- `apps/api/src/infrastructure/api-exception.filter.ts` normalizes API failures and captures 5xx errors
- `apps/api/src/infrastructure/api-logger.service.ts` emits structured JSON logs with redaction
- `apps/api/src/infrastructure/api-monitoring.service.ts` provides optional Sentry and tracing hooks
- `apps/worker/src/infrastructure/worker-logger.ts` and `worker-monitoring.ts` provide the same baseline for the worker loop

## Operational Logging

Logs should always include enough context to trace an issue:

- request ID
- user ID if authenticated
- session ID for attendance actions
- job ID for exports and email sends
- device ID or install ID reference for security-sensitive student actions

Avoid logging:

- raw passwords
- full token strings
- unnecessary exact GPS coordinates in plain text logs
- raw GPS coordinates inside security-event descriptions when distance/accuracy context is sufficient
- attestation payloads, secrets, cookies, authorization headers, or storage credentials in plain text

## Reliability Architecture

### Failure Recovery

The system should recover cleanly from:

- temporary API instance restart
- worker restart while jobs are queued
- duplicate request retries from mobile clients
- websocket reconnects during active teacher session
- device-binding checks during token refresh and re-login attempts

### Data Safety

- PostgreSQL backups must be enabled
- object storage should be durable
- migrations should run through CI/CD process

## Testing Architecture

The project should include four layers of tests.

### Unit Tests

For:

- domain calculations
- QR and BLE token logic
- policy helpers

### Integration Tests

For:

- API modules with real database
- session lifecycle
- attendance mark rules
- manual edit behavior
- classroom join-code and roster-import behavior
- device-binding and admin-delink behavior
- trusted-device registration and attendance-readiness guard behavior

### End-to-End Tests

For:

- web flows using Playwright
- mobile flows using Detox or equivalent

### Contract Tests

For:

- API DTO compatibility between clients and server
- export column formats

## CI/CD Architecture

Recommended pipeline:

1. lint
2. typecheck
3. unit tests
4. integration tests
5. build apps and packages
6. deploy web, API, and worker
7. run smoke checks

## Configuration Management

Configuration should be centralized in `packages/config` and loaded by each app.

Important env categories:

- database
- redis
- object storage
- auth secrets
- email provider
- Google OAuth configuration
- device attestation configuration
- QR rotation interval
- BLE rotation interval
- rate limits
- request-id header and observability settings
- worker timing and stuck-dispatch recovery thresholds

## Feature Flags

Use simple config-driven flags for risky features such as:

- Bluetooth attendance rollout
- automated email sending
- teacher-selected live GPS anchor
- strict device-binding enforcement modes
- roster import rollout

This helps pilot safely before enabling every feature for all users.

## Release Strategy

Recommended rollout order:

1. web + API + QR + GPS
2. student history and teacher history
3. teacher mobile Bluetooth pilot
4. exports
5. analytics and email automation

This reduces launch risk because QR + GPS is the primary mode and BLE is the most device-sensitive part.

## Implementation Outcome

When this architecture is complete:

- the system is not only feature-complete but also operable, testable, and production-safe
- live attendance remains the highest-priority, best-protected workflow

Current non-functional foundation now implemented:

- centralized env parsing with test-safe rate-limit defaults
- structured API and worker logging with request/user correlation and sensitive-field redaction
- optional Sentry/OpenTelemetry hooks ready to be enabled by env
- auth and attendance-mark endpoint rate limiting with reusable named policies
- request-ID propagation across success and error responses
- rollout flags for Bluetooth attendance, email automation, and strict device-binding mode
- rollout-disabled Bluetooth attendance and email automation routes now fail closed with `503` responses at the API boundary
- API readiness and queue-health endpoints for database and worker-backed queue visibility
- queue-health stale detection now uses `QUEUE_HEALTH_STALE_AFTER_MS`, so operator alerts can be tuned separately from worker reclaim thresholds
- worker-cycle failure logging plus configurable stale-work recovery for exports, imports, outbox processing, and email dispatch
- backup and recovery notes captured in `Structure/operations-runbook.md`
