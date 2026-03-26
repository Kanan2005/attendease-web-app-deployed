# AttendEase Dockerization Runtime Notes

Companion to: [`dockerization-plan.md`](./dockerization-plan.md)

## Build Strategy

Use the repository root as the Docker build context because app packages depend on shared workspace packages and Prisma generation relies on the monorepo structure.

Recommended build pattern:

1. base stage with Node + pnpm
2. dependency stage with workspace manifests copied first
3. build stage with source copied and workspace build executed
4. runtime stage with only the built app and required runtime artifacts

## API Image Notes

The API image should install workspace dependencies, generate Prisma client, build the API package, and run only the compiled API entrypoint.

Do not:

- run migrations automatically on every start
- rely on dev watchers

## Worker Image Notes

The worker image should reuse the same workspace build strategy as the API, include export and email packages, and run only the worker entrypoint.

## Web Image Notes

The web image should build Next.js in production mode, run with runtime-safe environment variables, and later prefer standalone output for a slimmer runtime image.

## Environment and Secrets Strategy

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

## Database and Migration Strategy

Do not hide migrations inside normal API startup.

Recommended runtime sequence:

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

## Health Strategy in Docker

Every runtime container should have a clear health story.

Use existing app surfaces where possible:

- API: `/health`
- API readiness: `/health/ready`
- worker: health CLI or lightweight health mode
- web: `/health`

## Logging and Observability in Docker

Docker should preserve the existing logging model, not replace it.

Keep:

- structured JSON logs
- request IDs
- redaction
- Sentry and tracing via env

## Rollout Flag Strategy

Docker images should not assume all features are on.

Runtime configs must be able to toggle:

- Bluetooth rollout
- email automation rollout
- strict device binding mode

## Suggested Files To Add Later

Likely files include:

- `apps/api/Dockerfile`
- `apps/worker/Dockerfile`
- `apps/web/Dockerfile`
- `.dockerignore`
- `docker-compose.runtime.yml` or equivalent compose profiles
- optional migration job script
- optional MinIO bucket-init helper
- deployment notes in `README.md` or `Structure/operations-runbook.md`

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

`Implement Phase A of dockerization-plan.md: add .dockerignore, Dockerfiles for API, web, and worker, and keep the current local infra compose intact. Run the builds you can run locally, document assumptions, and sync the relevant docs.`
