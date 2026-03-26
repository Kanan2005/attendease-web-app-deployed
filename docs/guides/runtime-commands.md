# AttendEase Runtime And Commands

## Quick Start

1. Run `pnpm install`.
2. Copy `.env.example` plus the app-level `.env.example` files you need.
3. Start infrastructure with `pnpm infra:up`.
4. Start the apps you need:
   - `pnpm dev:web`
   - `pnpm dev:api`
   - `pnpm dev:worker`
   - `pnpm dev:mobile`
   - or `pnpm dev`
5. Prepare DB/runtime state when working on backend flows:
   - `pnpm --filter @attendease/db prisma:generate`
   - `pnpm --filter @attendease/db migrate:deploy`
   - `pnpm --filter @attendease/db seed:dev`
6. Verify the workspace:
   - `pnpm workspace:validate`
   - `pnpm check`
   - `pnpm build`

## Core Scripts

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm workspace:validate`
- `pnpm check`
- `pnpm build`
- `pnpm test:api:targeted -- <files...>`
- `pnpm test:api:integration -- [integration-files...]`
- `pnpm test:mobile:targeted -- <files...>`
- `pnpm test:web:targeted -- <files...>`
- `pnpm infra:up`
- `pnpm infra:down`
- `pnpm runtime:config`
- `pnpm runtime:build`
- `pnpm runtime:up`
- `pnpm runtime:smoke`
- `pnpm runtime:check`
- `pnpm runtime:down`
- `pnpm manual:info`
- `pnpm manual:prepare`
- `pnpm manual:mobile`
- `pnpm manual:mobile:emulator -- --device <emulator-serial> --port <port> [--api-port <port>]`
- `pnpm verify:mobile-reports`
- `pnpm audit:matrix`
- `pnpm audit:screenshots:mobile`
- `pnpm audit:screenshots:web`
- `pnpm android:validate:help`
- `pnpm android:validate -- --device <device> --port <port> [--no-install]`

## Focused Reset Validation

- `POSTGRES_PORT=55432 pnpm test:api:integration -- src/modules/auth/auth.integration.test.ts`
- `pnpm test:api:targeted -- src/test/integration-helpers.test.ts`
- `pnpm test:mobile:targeted -- src/student-foundation.test.ts src/student-query.test.ts`
- `pnpm test:web:targeted -- src/web-portal.test.ts`
- `pnpm android:validate:help`
- `pnpm android:validate -- -d emulator-5554 --port 8083 --no-install`

## Health Surfaces

- Web: `GET http://localhost:3000/health`
- API: `GET http://localhost:4000/health`
- API readiness: `GET http://localhost:4000/health/ready`
- API queue health: `GET http://localhost:4000/health/queues`
- Worker: `pnpm --filter @attendease/worker health`

## Local Services

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- MinIO API on `localhost:9000`
- MinIO console on `localhost:9001`
- Mailpit SMTP on `localhost:1025`
- Mailpit UI on `localhost:8025`

If those ports are already used, override them through compose env variables such as `POSTGRES_PORT`, `REDIS_PORT`, `MINIO_API_PORT`, `MINIO_CONSOLE_PORT`, `MAILPIT_SMTP_PORT`, and `MAILPIT_WEB_PORT`.

## Runtime References

- [docker-compose.yml](/Users/anuagar2/Desktop/practice/Attendease/docker-compose.yml)
- [docker-compose.runtime.yml](/Users/anuagar2/Desktop/practice/Attendease/docker-compose.runtime.yml)
- [Structure/codebase-structure.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/codebase-structure.md)
- [Structure/line-count-cleanup-plan.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/line-count-cleanup-plan.md)
