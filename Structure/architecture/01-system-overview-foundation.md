# System Overview Foundation Notes

This companion note keeps scaffold and rollout guidance separate from the main system architecture map.

## Initial Scaffold Baseline

The repository foundation should concretely include:

- root workspace files for `pnpm`, `Turborepo`, shared TypeScript config, linting, formatting, and validation scripts
- a root workspace-validation script that checks package names, required scripts, tsconfig presence, and app env templates
- bootable shells for `apps/mobile`, `apps/web`, `apps/api`, and `apps/worker`
- shared package entry points with barrel exports for config, contracts, domain helpers, auth helpers, DB helpers, exports, notifications, realtime, UI tokens, and utilities
- root and per-app `.env.example` files plus typed env loaders in `packages/config`
- local development bootstrap via Docker Compose for PostgreSQL, Redis, MinIO, and Mailpit
- baseline health surfaces and helpers:
  - `apps/web/app/health/route.ts` backed by `apps/web/src/health.ts`
  - `apps/api/src/health/health.controller.ts`
  - `apps/worker/src/health.ts`
- foundational tests for:
  - config loading and shared contracts
  - shared helper packages such as auth, DB, email, export, notifications, realtime, and UI tokens
  - app shell helpers for mobile, web, worker, and the API health controller
- a testing strategy document that explains how later phases should add unit, integration, and E2E coverage without inventing a new structure
- CI skeleton for lint, typecheck, test, and build
- a shared implementation handoff file in `Structure/context.md`

## Phase-1 Runtime Conventions

- root `pnpm dev` should boot only the four runtime apps, not every workspace package watcher
- Node app build output currently lands under `dist/apps/<app-name>/src/*` because shared workspace source is compiled into the app build
- `start` scripts for API and worker must target those emitted entrypoints, and in phase 1 they should use `tsx` so built runtimes can still resolve shared workspace packages that export source TypeScript

## Implementation Sequence Recommendation

The code should be built in this order:

1. monorepo and shared packages
2. auth, Google login, and device trust foundation
3. academic data model, semester setup, and course offerings
4. classroom join, roster, schedule, and announcements
5. session and attendance core
6. QR + GPS flow end-to-end
7. student history, teacher history, and reports
8. Bluetooth flow end-to-end
9. exports, analytics, and email automation
10. observability, performance tuning, and hardening

This order reduces risk by building the attendance core before advanced features.
