# Operations Runbook

## Purpose

This runbook captures the operational behavior that is implemented in code today and the recovery notes that still require human process.

## Health And Readiness

- API liveness: `GET /health`
- API readiness: `GET /health/ready`
- API queue health: `GET /health/queues`
- Worker liveness: `pnpm --filter @attendease/worker health`

`/health/ready` currently checks:

- database reachability
- rollout flag state visibility

`/health/queues` currently reports:

- export jobs
- roster import jobs
- announcement fanout outbox
- analytics refresh outbox
- email dispatch runs

Queue status meanings:

- `healthy`: no failed or stale work and backlog is within the configured batch envelope
- `backlogged`: failed work exists or queued work is above the configured batch envelope
- `stalled`: stale `PROCESSING` work exists and recovery is needed

`QUEUE_HEALTH_STALE_AFTER_MS` controls when `/health/queues` starts classifying in-flight work as stale for operator visibility. Worker reclaim still uses the queue-specific stuck-timeout settings below.

## Feature Flags

The current rollout flags are config-driven:

- `FEATURE_BLUETOOTH_ATTENDANCE_ENABLED`
- `FEATURE_EMAIL_AUTOMATION_ENABLED`
- `FEATURE_STRICT_DEVICE_BINDING_MODE`

Current behavior:

- Bluetooth attendance endpoints are disabled when Bluetooth rollout is off and return `503 Service Unavailable`.
- Email automation APIs and worker scheduling are disabled when automation rollout is off, and the APIs return `503 Service Unavailable`.
- Strict device-binding mode currently tunes auth-time student enforcement:
  - `ENFORCE`: login blocks when the student device trust state is not trusted
  - `AUDIT` and `DISABLED`: login does not block, but attendance-sensitive device enforcement still remains strict

## Worker Guardrails

The worker now uses config-driven batch and stale-processing limits:

- `ROSTER_IMPORT_BATCH_SIZE`
- `ANNOUNCEMENT_FANOUT_BATCH_SIZE`
- `ANALYTICS_REFRESH_BATCH_SIZE`
- `EXPORT_JOB_BATCH_SIZE`
- `EMAIL_AUTOMATION_SCHEDULE_BATCH_SIZE`
- `EMAIL_AUTOMATION_PROCESS_BATCH_SIZE`
- `ROSTER_IMPORT_STUCK_TIMEOUT_MS`
- `OUTBOX_STUCK_TIMEOUT_MS`
- `EXPORT_JOB_STUCK_TIMEOUT_MS`
- `EMAIL_AUTOMATION_STUCK_DISPATCH_TIMEOUT_MS`

Current protections:

- stale roster-import jobs are reclaimed
- stale export jobs are reclaimed
- stale announcement outbox work is reclaimed
- stale analytics outbox work is reclaimed
- stale email-dispatch runs are reclaimed

## Containerized Runtime

The Docker path is additive. It is meant for reproducible runtime validation of API, worker, web, and infra. It is not required for Expo or real-device testing.

Current scope boundary:

- local Docker runtime support: implemented
- CI Docker build plus smoke validation: implemented
- deployment packaging and registry rollout automation: not implemented yet

Useful commands:

- `pnpm runtime:config`
- `pnpm runtime:build`
- `pnpm runtime:up`
- `pnpm runtime:smoke`
- `pnpm runtime:check`
- `pnpm runtime:logs`
- `pnpm runtime:down`

Startup sequencing in the runtime compose stack:

1. `postgres`, `redis`, `minio`, and `mailpit` start first
2. `migrate` waits for PostgreSQL health, then runs `prisma migrate deploy`
3. `bucket-init` waits for MinIO health, then creates the configured local bucket
4. `api` and `worker` wait for healthy infra plus successful `migrate` and `bucket-init`
5. `web` waits for API health

Important runtime assumptions:

- API and worker take their runtime env through explicit compose environment injection
- object storage can use a separate `STORAGE_PUBLIC_ENDPOINT` for signed downloads when the API talks to MinIO on an internal Docker hostname but browsers need a host-facing URL
- web public envs are build-time values in the current Next.js image model, so changing `NEXT_PUBLIC_*` values requires rebuilding the web image
- migrations remain explicit through the helper container, not hidden inside the normal API process command
- local worker email delivery still defaults to `EMAIL_PROVIDER_MODE=console`

Containerized smoke validation:

1. run `pnpm runtime:build`
2. run `pnpm runtime:up`
3. run `pnpm runtime:check`
4. if needed, run `pnpm runtime:smoke` to isolate the HTTP health surfaces
5. inspect `docker compose -f docker-compose.yml -f docker-compose.runtime.yml ps`
6. if needed, inspect `pnpm runtime:logs`
7. run `pnpm runtime:down`

If runtime startup fails:

- check `docker compose -f docker-compose.yml -f docker-compose.runtime.yml ps`
- inspect helper-service logs first:
  - `migrate`
  - `bucket-init`
- then inspect `api`, `worker`, and `web`
- if host ports are already taken, override them through `.env` or shell env such as `POSTGRES_PORT=55432`

## Backup And Recovery Notes

These are still operational process requirements, not application-level automation:

- PostgreSQL is the source of truth and must have scheduled backups enabled before production rollout.
- Object storage should enable bucket-level retention or versioning for export-file recovery if compliance requires it.
- Redis is not the source of truth for attendance data; it can be rebuilt after restart, but rate-limit behavior may temporarily reset.
- Recovery order after a serious environment issue:
  1. restore PostgreSQL
  2. confirm `GET /health/ready`
  3. confirm `GET /health/queues`
  4. restart API and worker
  5. verify export and email queues recover or are manually drained

## Queue Triage

If `/health/queues` is degraded:

- `exports`: inspect failed rows in `export_jobs` and object-storage reachability
- `roster-imports`: inspect `roster_import_jobs` and `roster_import_rows`
- `announcement-fanout` and `analytics-refresh`: inspect `outbox_events`
- `email-dispatch`: inspect `email_dispatch_runs` and `email_logs`

If a queue remains stalled after worker restart:

- identify stale `PROCESSING` rows
- confirm the related dependency is healthy
- re-run the worker after fixing the dependency
- move repeatedly failing work to a support-owned retry or cleanup path instead of leaving it in `PROCESSING`
