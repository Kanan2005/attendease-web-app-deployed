# Phase Prompt: Dockerization And Runtime Packaging

Use this playbook after all architecture phases are complete and before final release signoff if you want a reproducible runtime stack for API, web, worker, and infrastructure.

Execution order: Post-architecture closeout, before release-readiness.
Assume all earlier phases listed in `Structure/phase_promptioing/README.md` are already implemented.

Purpose:

- containerize the useful runtime parts of AttendEase
- keep mobile/native development outside Docker
- produce a reproducible backend/web runtime stack
- improve CI, smoke testing, and deployment-style verification

Use [`../dockerization-plan.md`](../dockerization-plan.md) as the main source of truth.

## Prompt 1
```text
You are implementing Phase A of the AttendEase Dockerization plan.

Read these files first:
- Structure/context.md
- Structure/dockerization-plan.md
- Structure/final-tech-stack-and-implementation.md
- README.md
- docker-compose.yml
- package.json
- apps/api/package.json
- apps/web/package.json
- apps/worker/package.json

Inspect the repo before making assumptions.

Your task for this step is to implement the first useful Docker foundation:
- add a root `.dockerignore`
- add a production-style `Dockerfile` for `apps/api`
- add a production-style `Dockerfile` for `apps/web`
- add a production-style `Dockerfile` for `apps/worker`
- keep the current infra-only `docker-compose.yml` intact unless a clearly safe improvement is needed
- make the Dockerfiles monorepo-aware and aligned with the current pnpm + Turborepo workspace
- prefer multi-stage builds
- make sure runtime containers use production-style start commands, not dev watchers
- avoid forcing mobile/native Expo development into Docker
- add or update docs that explain what is now containerized and what is intentionally not
- update `Structure/context.md` with progress, files added, assumptions, blockers, and the exact next pickup point

Important constraints:
- do not redesign the app stack
- do not break the current local host-based workflow
- do not hide database migrations inside normal API startup unless the repo already clearly uses that pattern
- keep secrets out of images and plan for runtime env injection

Run the image builds or validation checks you can run locally, fix safe issues before stopping, and leave the Dockerfiles coherent.
```

## Prompt 2
```text
Continue the AttendEase Dockerization work from the current repo state.

Read these files first:
- Structure/context.md
- Structure/dockerization-plan.md
- README.md
- docker-compose.yml
- the Dockerfiles added in the previous step

Now implement the full runtime compose layer:
- add a compose file or compose-profile setup for bringing up:
  - api
  - worker
  - web
  - postgres
  - redis
  - minio
  - mailpit
- add health-aware startup ordering where practical
- add any safe helper services needed, such as:
  - migration job
  - bucket-init job
  but only if they clearly improve the runtime story
- keep runtime env handling explicit and documented
- make sure the runtime stack aligns with current health endpoints and worker behavior
- verify that API, worker, and web can boot in a containerized setup as far as the local environment allows
- document exactly what works, what is assumed, and what still requires manual env setup
- update the matching docs and `Structure/context.md`

Important constraints:
- do not try to containerize real mobile/native BLE, GPS, or camera testing
- do not weaken the current local infra workflow
- prefer clear runtime compose behavior over over-engineered orchestration

Run the relevant Docker or compose checks you can run locally, fix issues before stopping, and leave the runtime compose layer usable.
```

## Prompt 3
```text
Continue the AttendEase Dockerization work from the current repo state.

Read these files first:
- Structure/context.md
- Structure/dockerization-plan.md
- README.md
- Structure/operations-runbook.md
- the Dockerfiles and compose files currently in the repo

Now implement the CI and operational integration for Docker:
- add or update CI workflows so API, web, and worker images are built in CI where practical
- add smoke-check or validation steps for the containerized runtime where practical
- review image/runtime assumptions for:
  - Prisma generation
  - Next.js runtime mode
  - worker startup
  - env injection
  - health checks
- add any missing operational docs for:
  - image build commands
  - compose startup commands
  - migration/startup sequencing
  - containerized smoke validation
- fix safe issues found during CI/runtime review
- update `Structure/context.md` with progress, checks run, blockers, and the exact next pickup point

Important constraints:
- do not pretend CI container verification exists if it is not actually implemented
- keep the Docker path additive and helpful, not mandatory for all workflows
- do not introduce secret values into committed config

Run the relevant checks you can run locally, fix issues before stopping, and leave the Docker path documented and repeatable.
```

## Prompt 4
```text
Finish the AttendEase Dockerization phase with review and verification.

Read these files first:
- Structure/context.md
- Structure/dockerization-plan.md
- README.md
- Structure/operations-runbook.md
- the Dockerfiles and compose files currently in the repo

Now do all of the following:
- review the Docker setup for correctness, maintainability, and monorepo alignment
- verify what is containerized versus intentionally left outside Docker
- review startup sequencing, health checks, migration strategy, storage assumptions, and secret handling
- add any final missing tests or validation checks that are clearly useful for the Docker/runtime path
- do a final documentation sync for the Docker plan, setup docs, and operations docs
- update `Structure/context.md` with completed scope, remaining gaps, and the next recommended phase
- summarize:
  - what is now containerized
  - what is intentionally not containerized
  - which Docker commands were verified
  - what still needs manual verification
  - what release-readiness can now use from the Docker stack

Important constraints:
- do not call Dockerization “complete” if the images do not build or the compose runtime is not coherent
- clearly separate:
  - local Docker support
  - CI image validation
  - deployment-ready packaging
- keep mobile/native limitations explicit

Fix safe issues before stopping, then leave the repo with a clean Dockerization handoff.
```
