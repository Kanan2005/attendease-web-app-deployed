# Phase Prompt: Teacher Mobile App

Use this playbook to implement the teacher-facing mobile experience.

Execution order: Phase 8 of 15.
Assume all earlier phases listed in `Structure/phase_promptioing/README.md` are already merged before you start this one.

## Prompt 1
```text
You are implementing the AttendEase teacher mobile architecture.

Read these files first:
- Structure/context.md
- Structure/final-tech-stack-and-implementation.md
- Structure/requirements/04-teacher-mobile-app.md
- Structure/architecture/04-teacher-mobile-app.md
- Structure/architecture/13-academic-management-and-scheduling.md
- Structure/architecture/14-classroom-communications-and-roster.md

Inspect the mobile app and implement the teacher mobile foundation:
- create the teacher route group and teacher dashboard
- add classroom list/detail routes, roster view routes, schedule routes, announcements routes, and lecture list routes
- add teacher-specific API hooks and query keys
- wire teacher dashboard cards for classrooms, recent sessions, and quick actions
- add the classroom-centric navigation flow used by the architecture docs
- add relevant tests for the implemented teacher mobile foundation as you build it

Implement real structure and data integration, not just mock screens.
```

## Prompt 2
```text
Continue the teacher mobile implementation from the current repo state.

Now implement the teacher operational flows:
- Bluetooth session creation and active-session screen shell
- student roster list, manual add entrypoint, and import trigger entrypoint
- schedule calendar editing flow with local draft state and save behavior
- classroom stream / announcements composer and list view
- reports and export request UI hooks
- write or extend robust tests for the implemented teacher mobile flows
- update the matching requirements, architecture docs, and any mobile workflow docs to reflect the implemented behavior
- update Structure/context.md with current progress, tests added, blockers, and the exact next pickup point

If some backend APIs are not finished yet, create clean client integration points rather than hardcoding fake behavior.
```

## Prompt 3
```text
Finish the teacher mobile phase with reliability and test coverage.

Do all of the following:
- review role gating, query invalidation, and classroom-context navigation
- add robust tests for teacher dashboard, classroom flow, join-code reset action if supported, report/export request flow, and Bluetooth session screen state handling
- make sure the Bluetooth session screens are ready for the later native BLE phase without requiring a rewrite
- do a final documentation sync for the matching requirement, architecture, and mobile workflow docs
- update Structure/context.md with completed scope, remaining gaps, and the next recommended phase
- summarize what is complete, what is stubbed for the BLE phase, and any blockers discovered
- list the test files added or updated, the commands run, and any remaining manual verification items

Fix issues and missing relevant test coverage before stopping.
```
