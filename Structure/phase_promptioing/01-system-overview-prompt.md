# Phase Prompt: System Overview

Use this playbook to scaffold the repo foundation and shared runtime structure.

Execution order: Phase 1 of 15.
Assume all earlier phases listed in `Structure/phase_promptioing/README.md` are already merged before you start this one.

## Prompt 1
```text
You are implementing the AttendEase system-overview foundation.

Read these files first:
- Structure/context.md
- Structure/final-tech-stack-and-implementation.md
- Structure/testing-strategy.md
- Structure/requirements/01-system-overview.md
- Structure/architecture/README.md
- Structure/architecture/01-system-overview.md
- Structure/architecture/11-data-rules-audit.md

Then inspect the current repo before making assumptions.

Your task is to implement the repository foundation, not just describe it. Do all of the following:
- set up the monorepo structure for apps/mobile, apps/web, apps/api, apps/worker, and shared packages
- add pnpm workspace configuration and Turborepo configuration
- add base TypeScript config, shared lint/format config, and root scripts
- add package boundaries for auth, contracts, db, domain, email, export, notifications, realtime, config, and utils
- add a local development bootstrap with Docker Compose for Postgres, Redis, MinIO, and Mailpit
- add a root README or developer setup doc if needed

Important constraints:
- do not redesign the chosen stack
- use apply_patch for manual file creation and edits
- keep the structure aligned with the architecture docs
- add or update foundational tests and validation checks where relevant to the scaffold

After inspection, implement the scaffold, add relevant foundational coverage, and verify the workspace files are coherent.
```

## Prompt 2
```text
Continue the system-overview implementation from the current repo state.

Now wire the runnable app shells and shared foundations:
- create minimal bootable shells for apps/mobile, apps/web, apps/api, and apps/worker
- add shared config loading in packages/config
- add placeholder contract and domain packages with barrel exports
- add env templates and environment-loading utilities
- add basic health-check entrypoints for web, api, and worker
- ensure the repo can install dependencies and each app has a clear start/build script
- add or strengthen foundational tests/checks that protect the workspace and shared packages
- update the matching requirements, architecture docs, and any relevant setup docs to reflect what was actually implemented
- update Structure/context.md with current progress, tests added, blockers, and the exact next pickup point

Run the relevant checks you can run locally, fix anything broken, and keep the structure clean. This phase is not complete if the workspace has no meaningful test baseline.
```

## Prompt 3
```text
Finish the system-overview phase with hardening and verification.

Do all of the following:
- review the monorepo for missing scripts, broken workspace references, and inconsistent tsconfig/package names
- add CI skeleton files for lint, typecheck, test, and build
- make sure the workspace has a clear testing story so later phases can add unit, integration, and E2E coverage cleanly
- add or update workspace-validation checks and the shared testing-strategy doc if they are missing or misleading
- verify the local-dev story is documented and consistent with the final stack doc
- clean up any low-signal placeholder code if it causes confusion
- do a final documentation sync for the matching requirement, architecture, setup, and workflow docs
- update Structure/context.md with completed scope, remaining gaps, and the next recommended phase
- summarize what is now scaffolded, what is intentionally stubbed, and what the next phase depends on
- list the test files added or updated, the commands run, and any remaining manual verification items

If checks fail or foundational coverage is missing, fix that before stopping.
```
