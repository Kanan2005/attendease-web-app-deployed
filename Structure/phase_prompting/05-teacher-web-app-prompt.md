# Phase Prompt: Teacher and Admin Web App

Use this playbook to implement the teacher/admin web portal.

Execution order: Phase 9 of 15.
Assume all earlier phases listed in `Structure/phase_prompting/README.md` are already merged before you start this one.

## Prompt 1
```text
You are implementing the AttendEase teacher and admin web architecture.

Read these files first:
- Structure/context.md
- Structure/final-tech-stack-and-implementation.md
- Structure/requirements/05-teacher-web-app.md
- Structure/architecture/05-teacher-web-app.md
- Structure/architecture/13-academic-management-and-scheduling.md
- Structure/architecture/15-device-trust-and-admin-controls.md

Inspect the web app and implement the web foundation:
- set up route groups for teacher and admin
- add auth-aware layout boundaries and route protection
- create teacher dashboard and admin dashboard shells
- create classroom, semester, session-history, reports, exports, analytics, email automation, devices, and imports page routes
- wire shared web UI primitives and table/chart shells using the chosen stack
- add relevant tests for route protection and page bootstrapping as you build them

Do not redesign the web stack. Implement the route structure and data-fetching foundations.
```

## Prompt 2
```text
Continue from the current repo state and build the main teacher/admin workflows.

Now implement:
- classroom CRUD pages
- semester management pages
- roster table pages and import-status pages
- schedule calendar editing pages
- announcements/stream pages
- QR active-session projector shell with live-session component boundaries
- admin device support pages and import monitoring pages
- write or extend robust tests for the implemented web flows
- update the matching requirements, architecture docs, and any relevant web-flow docs to reflect the implemented behavior
- update Structure/context.md with current progress, tests added, blockers, and the exact next pickup point

Hook these pages to the API layer as far as the current backend supports, and add clean loading/error states.
```

## Prompt 3
```text
Finish the teacher/admin web phase with review and tests.

Do all of the following:
- review route protection, role segregation, and data-loading boundaries
- add robust tests for login routing, teacher dashboard access, admin dashboard access, classroom CRUD pages, key table/filter flows, and projector route behavior
- ensure the projector route and active-session component structure are ready for the later QR phase
- do a final documentation sync for the matching requirement, architecture, and web/admin docs
- update Structure/context.md with completed scope, remaining gaps, and the next recommended phase
- summarize what is complete and what later phases will plug into
- list the test files added or updated, the commands run, and any remaining manual verification items

Fix issues and missing relevant test coverage before stopping.
```
