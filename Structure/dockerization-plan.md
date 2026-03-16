# AttendEase Dockerization Plan

## Purpose

This plan defines where Docker is useful in AttendEase, where it is not, and the recommended order for adopting it.

The goal is not to containerize everything blindly. The goal is to improve:

- reproducible local runtime setup
- deployment consistency
- CI and smoke-test reliability
- operational verification for API, web, worker, and infrastructure

## Recommendation Summary

Use Docker for:

- PostgreSQL
- Redis
- MinIO or S3-compatible storage
- Mailpit in local development
- API runtime
- worker runtime
- web runtime
- full-stack smoke-test environments
- deployment-style staging verification

Do not rely on Docker for:

- Expo native mobile development
- iOS BLE verification
- Android BLE verification
- QR camera testing
- real GPS permission behavior
- real device-trust lifecycle validation

Practical recommendation:

- keep mobile/native development outside Docker
- add Docker support for API, web, worker, and infra
- use Docker as the canonical runtime verification path before deployment

## Current State

The repo already has useful Docker coverage in [docker-compose.yml](/Users/anuagar2/Desktop/practice/Attendease/docker-compose.yml) for:

- PostgreSQL
- Redis
- MinIO
- Mailpit

This is already valuable and should remain.

What is missing:

- API container
- worker container
- web container
- full-stack compose for application runtime
- image build strategy for the monorepo
- deployment-oriented runtime notes

## What Should Be Dockerized

### 1. Infrastructure

Keep Docker for:

- PostgreSQL
- Redis
- MinIO
- Mailpit

This is already the right approach.

### 2. API

Docker is strongly useful for the API because it depends on:

- Node runtime consistency
- Prisma client generation
- environment-managed secrets and config
- database and Redis reachability

Target outcome:

- one production-style API image
- health endpoint available in the container
- no dev-only watchers in the container

### 3. Worker

Docker is strongly useful for the worker because it depends on:

- the same codebase and package graph as the API
- background job execution
- storage, DB, Redis, and email provider access
- queue-health and failure recovery validation

Target outcome:

- one production-style worker image
- worker can run against the same environment as the API
- restart behavior is easy to validate

### 4. Web

Docker is useful for the Next.js web app because it gives:

- a reproducible production runtime
- consistent env injection
- easy staging smoke tests
- simpler deployment packaging

Target outcome:

- one production-style web image
- app served through `next start`
- ready for reverse proxy or ingress later

### 5. Mobile

Do not try to make Docker the main path for the mobile app.

Reason:

- Expo native workflows need host tooling
- BLE, camera, GPS, permissions, install IDs, and device trust need real devices
- Docker adds friction without solving the real testing problem

Useful Docker support for mobile is indirect only:

- API + worker + DB + storage stack can be containerized while the mobile app runs on the host machine

## What Should Not Be Dockerized First

Do not prioritize these early:

- full iOS build pipelines inside Docker
- Android emulator workflows inside Docker
- BLE device simulation as a Docker-first goal
- QR camera E2E inside Docker

These are lower-value than runtime containers for web, API, and worker.

## Recommended Dockerization Phases

## Phase A: Runtime Containers

First useful implementation step:

- add `Dockerfile` for `apps/api`
- add `Dockerfile` for `apps/worker`
- add `Dockerfile` for `apps/web`

Design rules:

- use multi-stage builds
- build from the monorepo root
- install dependencies once per image build stage
- run compiled output only in the final container
- do not use `tsx watch`, `next dev`, or Expo dev commands in runtime containers

Expected runtime commands:

- API: built Nest runtime
- Worker: built worker runtime
- Web: `next start`

## Phase B: Full Runtime Compose

After the three images exist:

- add a compose file for full runtime bring-up
- keep the current `docker-compose.yml` for infra
- add either:
  - `docker-compose.runtime.yml`
  - or Compose profiles in the same file

Recommended services:

- `postgres`
- `redis`
- `minio`
- `mailpit`
- `api`
- `worker`
- `web`

Optional helper services:

- one-shot migration job
- one-shot MinIO bucket init job

Current repo status:

- implemented in [docker-compose.runtime.yml](/Users/anuagar2/Desktop/practice/Attendease/docker-compose.runtime.yml)
- keeps [docker-compose.yml](/Users/anuagar2/Desktop/practice/Attendease/docker-compose.yml) infra-only
- verified locally with containerized `api`, `worker`, `web`, `postgres`, `redis`, `minio`, and `mailpit`
- local host-port overrides are supported through compose env variables so the runtime stack can coexist with other local services when needed

## Phase C: CI Image Validation

Once runtime containers exist:

- build API image in CI
- build worker image in CI
- build web image in CI
- run smoke validation against the containers

Good CI checks:

- API starts and `/health` responds
- API readiness responds when DB is reachable
- worker starts cleanly
- web starts cleanly
- runtime compose boots without missing envs

Current repo status:

- implemented in [`.github/workflows/docker.yml`](/Users/anuagar2/Desktop/practice/Attendease/.github/workflows/docker.yml)
- CI now validates the merged compose config, builds runtime images through compose, boots the runtime stack, checks API and web health, checks worker health, and tears the stack down
- the CI workflow is additive and does not replace the existing lint, typecheck, test, or build workflows

## Phase D: Deployment Packaging

After CI is stable:

- push versioned images to a registry
- add deployment docs for staging and production
- keep secrets out of images
- treat migrations as explicit deployment steps, not hidden app startup behavior

Current repo status:

- not implemented yet
- local Docker runtime support and CI smoke validation exist
- registry publishing, deployment manifests, and rollout automation remain future deployment work

## Build Strategy

## Monorepo Build Approach

Use the repository root as the Docker build context.

Reason:

- app packages depend on shared workspace packages
- Prisma client generation and TypeScript builds depend on monorepo structure

Recommended build pattern:

1. base stage with Node + pnpm
2. dependency stage with workspace manifests copied first
3. build stage with source copied and workspace build executed
4. runtime stage with only the built app and required runtime artifacts

## API Image Notes

The API image should:

- install workspace dependencies
- generate Prisma client
- build the API package
- run the compiled API entrypoint

Do not:

- run migrations automatically on every start
- rely on dev watchers

Prefer:

- one migration job or explicit deploy step

## Worker Image Notes

The worker image should:

- reuse the same workspace build strategy as API
- include export and email packages
- run only the worker entrypoint

The worker should not:

- bundle local-only dev assumptions
- depend on Mailpit unless local env chooses that provider

## Web Image Notes

The web image should:

- build Next.js in production mode
- ideally use Next standalone output when implemented
- run with runtime-safe environment variables

Recommended later improvement:

- switch to Next standalone output for a slimmer runtime image if not already configured

## Environment And Secrets Strategy

Do not bake secrets into images.

Use runtime env injection for:

- auth secrets
- Google OIDC secrets
- database URLs
- Redis URLs
- storage credentials
- SES credentials
- Sentry DSN
- OTEL endpoint
- rollout flags

Keep separate env sets for:

- local Docker runtime
- staging
- production

## Database And Migration Strategy

Do not hide migrations inside normal API startup.

Recommended strategy:

- run migrations in a separate one-shot container or deploy job
- start API and worker only after migrations succeed

Suggested runtime sequence:

1. infra healthy
2. migration job runs
3. API starts
4. worker starts
5. web starts

## Storage Strategy

For local Docker:

- keep MinIO
- optionally add bucket-init automation

For staging or production:

- use S3-compatible storage or real S3
- keep the same storage contract already used by the app

## Health Strategy In Docker

Every runtime container should have a clear health story.

Use existing app surfaces where possible:

- API: `/health`
- API readiness: `/health/ready`
- worker: health CLI or lightweight health mode
- web: `/health`

Compose and deployment health checks should prefer real app endpoints over raw process existence.

## Logging And Observability In Docker

Docker should preserve the existing logging model, not replace it.

Keep:

- structured JSON logs
- request IDs
- redaction
- Sentry and tracing via env

Do not add app-specific file logging inside containers unless there is a concrete ops requirement.

## Rollout Flag Strategy

Docker images should not assume all features are on.

Make sure runtime configs can toggle:

- Bluetooth rollout
- email automation rollout
- strict device binding mode

This is especially useful for:

- staging verification
- pilot deployments
- safer production rollout

## Suggested Files To Add Later

When implementing this plan, likely files will be:

- `apps/api/Dockerfile`
- `apps/worker/Dockerfile`
- `apps/web/Dockerfile`
- `.dockerignore`
- `docker-compose.runtime.yml` or equivalent compose profile setup
- optional migration job script
- optional MinIO bucket-init helper
- Docker deployment notes in `README.md` or `Structure/operations-runbook.md`

## Recommended Execution Order

1. add `.dockerignore`
2. add API Dockerfile
3. add worker Dockerfile
4. add web Dockerfile
5. add full runtime compose
6. validate health and startup order
7. add CI image build checks
8. add deployment notes

## Acceptance Criteria

The Dockerization effort is successful when:

- infra-only Docker still works
- API can boot in Docker against containerized infra
- worker can boot in Docker against containerized infra
- web can boot in Docker against containerized API
- runtime compose can bring up a usable full stack
- health and readiness checks work from the containerized stack
- no one is forced to use Docker for native mobile development

## Suggested Next Prompt

If you want implementation next, use:

"Implement Phase A of [dockerization-plan.md](/Users/anuagar2/Desktop/practice/Attendease/Structure/dockerization-plan.md): add `.dockerignore`, Dockerfiles for API, web, and worker, and keep the current local infra compose intact. Run the builds you can run locally, document assumptions, and sync the relevant docs."
