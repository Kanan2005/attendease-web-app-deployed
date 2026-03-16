# Phase Prompt: Classroom Communications and Roster

Use this playbook to implement join codes, rosters, imports, stream posts, and notifications.

Execution order: Phase 6 of 15.
Assume all earlier phases listed in `Structure/phase_promptioing/README.md` are already merged before you start this one.

## Prompt 1
```text
You are implementing the AttendEase classroom communications and roster architecture.

Read these files first:
- Structure/context.md
- Structure/final-tech-stack-and-implementation.md
- requirement.md
- Structure/requirements/03-student-mobile-app.md
- Structure/requirements/04-teacher-mobile-app.md
- Structure/requirements/05-teacher-web-app.md
- Structure/architecture/14-classroom-communications-and-roster.md
- Structure/architecture/13-academic-management-and-scheduling.md
- Structure/architecture/03-student-mobile-app.md

Inspect the repo and implement the classroom roster backend:
- implement join-code generation, lookup, reset, expiry, and join flows
- implement classroom membership queries and membership state transitions
- implement teacher roster management endpoints
- add contracts for student join and teacher roster operations
- keep all membership logic aligned with semester and classroom status rules
- add robust tests for join-code and roster behavior while implementing it

Write the actual services, controllers, and tests.
```

## Prompt 2
```text
Continue the classroom communications/roster implementation from the current repo state.

Now implement imports and announcements:
- add roster import job creation and worker processing
- implement row-level validation and import result tracking
- implement classroom stream / announcement post endpoints
- implement optional notify-on-post fan-out through the notification abstraction
- wire teacher web/mobile and student mobile classroom stream and roster integration points
- add robust tests for import lifecycle, stream posting, and visibility rules
- update the matching requirements, architecture docs, and any classroom/roster docs to reflect the implemented behavior
- update Structure/context.md with current progress, tests added, blockers, and the exact next pickup point

Run tests and fix issues before stopping. This phase is not complete if join-code, import, and classroom-stream risks are weakly tested.
```

## Prompt 3
```text
Finish the classroom communications/roster phase with review and verification.

Do all of the following:
- review duplicate membership handling, join-code expiry behavior, and visibility rules for student versus teacher
- add robust tests for join success/failure, import lifecycle, announcement posting, membership duplication, and student-versus-teacher stream visibility
- do a final documentation sync for the matching requirement, architecture, and classroom/roster docs
- update Structure/context.md with completed scope, remaining gaps, and the next recommended phase
- summarize what classroom hub functionality is now complete and what later phases reuse it
- list the test files added or updated, the commands run, and any remaining manual verification items

Fix issues and missing relevant test coverage before stopping.
```
