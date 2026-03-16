# Phase Prompt: Data, Rules, and Audit

Use this playbook to implement the database schema and integrity layer.

Execution order: Phase 2 of 15.
Assume all earlier phases listed in `Structure/phase_promptioing/README.md` are already merged before you start this one.

## Prompt 1
```text
You are implementing the AttendEase data, rules, and audit architecture.

Read these files first:
- Structure/context.md
- Structure/final-tech-stack-and-implementation.md
- Structure/requirements/11-data-rules-audit.md
- Structure/architecture/11-data-rules-audit.md
- Structure/architecture/01-system-overview.md
- Structure/architecture/13-academic-management-and-scheduling.md

Inspect the repo and implement the database foundation:
- create or refine the Prisma schema for auth, academic, classroom, scheduling, attendance, analytics, automation, device, and audit entities
- add the most important unique constraints and foreign keys
- implement the outbox_events model
- add core enums and statuses needed across the system
- create the first clean migration set
- add schema-level and data-integrity-focused tests/checks as part of the phase

Do not leave the schema half-defined. Make it coherent enough to support the next implementation phases.
```

## Prompt 2
```text
Continue the data/rules/audit implementation from the current repo state.

Now do the following:
- add shared DB helpers and transaction helpers
- implement seed scripts for core development data
- add SQL views or migration hooks for initial report read models if appropriate
- add audit/event model helpers for attendance, edits, device actions, and automation logs
- add indexes for the most important session, attendance, assignment, and device-binding queries
- add or extend robust tests for constraints, transaction helpers, and audit/event helpers
- update the matching requirements, architecture docs, and any schema/setup docs to reflect the implemented behavior
- update Structure/context.md with current progress, tests added, blockers, and the exact next pickup point

Run migration and schema checks, and fix issues before stopping.
```

## Prompt 3
```text
Finish the data/rules/audit phase with integrity review.

Do all of the following:
- verify the schema supports roster snapshotting, manual edits, exports, analytics, and device trust cleanly
- review naming consistency, enum choices, and retention-sensitive fields
- add robust tests for unique constraints, key transaction assumptions, outbox behavior, and audit/event persistence where possible
- do a final documentation sync for the matching requirement, architecture, and schema/setup docs
- update Structure/context.md with completed scope, remaining gaps, and the next recommended phase
- summarize the schema decisions and any deferred DB optimizations
- list the test files added or updated, the commands run, and any remaining manual verification items

Fix issues and missing relevant test coverage before stopping.
```
