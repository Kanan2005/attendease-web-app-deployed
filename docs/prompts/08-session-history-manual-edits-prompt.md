# Phase Prompt: Session History and Manual Edits

Use this playbook to implement history, session detail, and the 24-hour edit window.

Execution order: Phase 12 of 15.
Assume all earlier phases listed in `Structure/phase_prompting/README.md` are already merged before you start this one.

## Prompt 1
```text
You are implementing the AttendEase session history and manual edit architecture.

Read these files first:
- Structure/context.md
- Structure/final-tech-stack-and-implementation.md
- Structure/requirements/08-session-history-manual-edits.md
- Structure/architecture/08-session-history-manual-edits.md
- Structure/architecture/11-data-rules-audit.md
- Structure/architecture/09-reports-exports.md

Inspect the repo and implement the backend history/read-model foundation:
- add or refine the attendance_records snapshot model if needed
- implement session history queries and summary read models
- implement session detail endpoints and student-list endpoints
- expose editability state derived from ended_at and editable_until
- make sure session APIs are shared by teacher web and teacher mobile
- add relevant tests for read models and editability rules as you implement them

Implement the actual queries, DTOs, and service logic, not just placeholders.
```

## Prompt 2
```text
Continue from the current repo state and implement manual editing.

Now do the following:
- implement PATCH /sessions/:id/attendance with transactional updates
- create attendance edit audit log writes
- wire teacher web and teacher mobile edit flows to the shared API
- ensure final counts refresh after edits
- ensure manual edits do not create a visible manual-vs-automatic distinction in normal UX
- add or extend robust integration tests for edit-save behavior and final-summary refresh
- update the matching requirements, architecture docs, and any history/reporting docs to reflect the implemented behavior
- update Structure/context.md with current progress, tests added, blockers, and the exact next pickup point

Run integration tests and fix issues before stopping. This phase is not complete if session locking and manual-edit behavior are untested.
```

## Prompt 3
```text
Finish the history/manual-edit phase with review and consistency checks.

Do all of the following:
- add robust tests for editable versus locked sessions, manual add/remove flows, and read-model consistency after edits
- verify history, detail, and edit flows use the same final attendance truth
- add optional suspicious-attempt summary fields without mixing them into present/absent truth
- do a final documentation sync for the matching requirement, architecture, and history/reporting docs
- update Structure/context.md with completed scope, remaining gaps, and the next recommended phase
- summarize what is complete and what later reporting/export phases can now rely on
- list the test files added or updated, the commands run, and any remaining manual verification items

Fix issues and missing relevant test coverage before stopping.
```
