# Phase Prompt: Academic Management and Scheduling

Use this playbook to implement semesters, classrooms, schedules, and lectures.

Execution order: Phase 5 of 15.
Assume all earlier phases listed in `Structure/phase_prompting/README.md` are already merged before you start this one.

## Prompt 1
```text
You are implementing the AttendEase academic management and scheduling architecture.

Read these files first:
- Structure/context.md
- Structure/final-tech-stack-and-implementation.md
- requirement.md
- Structure/requirements/04-teacher-mobile-app.md
- Structure/requirements/05-teacher-web-app.md
- Structure/requirements/11-data-rules-audit.md
- Structure/architecture/13-academic-management-and-scheduling.md
- Structure/architecture/02-auth-roles-enrollment.md
- Structure/architecture/11-data-rules-audit.md

Inspect the repo and implement the academic backend foundation:
- add or refine models and migrations for semesters, course offerings, schedule slots, schedule exceptions, and lectures
- implement semester CRUD and lifecycle endpoints for admin
- implement classroom/course-offering CRUD endpoints for teacher/admin within assignment rules
- implement lecture list and lecture create endpoints
- add shared contracts and validation for these operations
- add robust tests for semester, classroom, and lecture domain behavior as part of the implementation

Do not stop at analysis. Implement the actual code and tests.
```

## Prompt 2
```text
Continue the academic/scheduling implementation from the current repo state.

Now implement the scheduling behavior:
- recurring weekly slot create/update flows
- one-off class, cancellation, and reschedule flows
- save-and-notify outbox events
- lecture linkage so attendance sessions can reference lectures
- teacher web and teacher mobile integration points for schedule and lecture screens
- add robust tests for recurrence rules, exceptions, lecture linkage, and save-and-notify behavior
- update the matching requirements, architecture docs, and any academic/scheduling docs to reflect the implemented behavior
- update Structure/context.md with current progress, tests added, blockers, and the exact next pickup point

Run tests and fix issues before stopping. This phase is not complete if calendar and classroom CRUD behavior are weakly tested.
```

## Prompt 3
```text
Finish the academic/scheduling phase with review and verification.

Do all of the following:
- review semester-state enforcement and classroom-scope permission checks
- add robust tests for recurrence, exception handling, lecture linkage, classroom CRUD restrictions, and semester-state enforcement
- do a final documentation sync for the matching requirement, architecture, and academic/scheduling docs
- update Structure/context.md with completed scope, remaining gaps, and the next recommended phase
- summarize what is now available for classrooms and what later attendance phases will plug into
- list the test files added or updated, the commands run, and any remaining manual verification items

Fix issues and missing relevant test coverage before stopping.
```
