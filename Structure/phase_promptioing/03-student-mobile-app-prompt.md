# Phase Prompt: Student Mobile App

Use this playbook to implement the student-facing mobile experience.

Execution order: Phase 7 of 15.
Assume all earlier phases listed in `Structure/phase_promptioing/README.md` are already merged before you start this one.

## Prompt 1
```text
You are implementing the AttendEase student mobile app architecture.

Read these files first:
- Structure/context.md
- Structure/final-tech-stack-and-implementation.md
- Structure/requirements/03-student-mobile-app.md
- Structure/architecture/03-student-mobile-app.md
- Structure/architecture/09-reports-exports.md
- Structure/architecture/14-classroom-communications-and-roster.md

Inspect the current mobile app structure and implement the student foundation:
- create the student route group and key screens for dashboard, join classroom, classroom detail, history, reports, profile, and device status
- add shared API client hooks using TanStack Query
- add the student app shell, navigation structure, and placeholder loading/error states
- wire dashboard data sources for summary, recent history, and classroom memberships
- add join-classroom flow scaffolding using the planned API contracts
- add relevant mobile tests for the implemented student foundation as you build it

Do not just scaffold screens with empty placeholders. Connect the data layer as far as the current backend allows.
```

## Prompt 2
```text
Continue the student mobile implementation from the current repo state.

Now implement the key student workflows:
- classroom stream and schedule views
- student report overview and subject-wise reports
- profile and account screen with safe editable fields
- QR and Bluetooth attendance entry screens and controller hooks
- device trust status UI and blocked-attendance messaging
- query invalidation after attendance success and join-classroom success
- write or extend robust tests for the implemented screens, hooks, and student flows
- update the matching requirements, architecture docs, and any mobile UX docs to reflect the implemented flows
- update Structure/context.md with current progress, tests added, blockers, and the exact next pickup point

Use the existing architecture docs and do not redesign the flow.
```

## Prompt 3
```text
Finish the student mobile phase with polish and verification.

Do all of the following:
- review UX state handling for loading, no-data, permission denial, and attendance-result banners
- add robust tests for join classroom, dashboard loading, history refresh, report views, and key attendance-entry controller states
- add any missing mobile-specific contracts or hooks needed by later QR/Bluetooth phases
- verify route names and feature folder boundaries are clean and maintainable
- do a final documentation sync for the matching requirement, architecture, and mobile-flow docs
- update Structure/context.md with completed scope, remaining gaps, and the next recommended phase
- summarize what student flows are complete and what later attendance phases will extend
- list the test files added or updated, the commands run, and any remaining manual verification items

Fix issues and missing relevant test coverage before stopping.
```
