# AttendEase Codebase Structure

Use this document as the index for the current repo layout.
Keep this file short and move detailed ownership maps into the companion docs below.

## Top-Level Layout

- `apps/api`
  - NestJS API modules, guards, policies, integrations, and health surfaces.
- `apps/mobile`
  - Expo routes plus role-specific student and teacher foundations.
- `apps/web`
  - Next.js teacher and admin portal routes, layouts, and workspaces.
- `apps/worker`
  - BullMQ job processors and queue-backed automation.
- `packages/auth`
  - shared API client and auth-session helpers.
- `packages/contracts`
  - shared request/response schemas and wire types.
- `packages/db`
  - Prisma schema, migrations, fixtures, seeds, and DB helpers.
- `packages/domain`
  - UI-free product rules and language/domain helpers.
- `packages/ui-mobile`
  - shared mobile design tokens and primitives.
- `packages/ui-web`
  - shared web design tokens and primitives.
- `scripts`
  - validation, audit, screenshot, and targeted test helpers.
- `Structure`
  - requirements, architecture, context, testing, and audit docs.

## Companion Maps

- `Structure/codebase-structure-mobile.md`
  - mobile route ownership plus student/teacher module layout.
- `Structure/codebase-structure-web.md`
  - teacher/admin web workspace and page-model layout.
- `Structure/codebase-structure-backend-packages.md`
  - API, worker, contracts, auth, db, and domain package layout.

## Structure Rules

- Keep route-facing and package-facing barrels stable.
- Split files by screen, workspace, helper, or domain concern before they cross the `300-400` line range.
- Keep generated artifacts out of the source-of-truth structure docs.
- Use `Structure/line-count-cleanup-plan.md` to track the remaining repo-wide over-400 cleanup outside functional source.

## Current Status

- Non-test TypeScript source is now fully under `400` lines.
- Remaining over-limit files are tests, docs, one audit script, and a few explicit repo exceptions such as lock/schema/migration files.
