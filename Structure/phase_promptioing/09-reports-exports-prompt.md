# Phase Prompt: Reports and Exports

Use this playbook to implement teacher reports, student self-reports, and export jobs.

Execution order: Phase 13 of 15.
Assume all earlier phases listed in `Structure/phase_promptioing/README.md` are already merged before you start this one.

## Prompt 1
```text
You are implementing the AttendEase reports and exports architecture.

Read these files first:
- Structure/context.md
- Structure/final-tech-stack-and-implementation.md
- Structure/requirements/09-reports-exports.md
- Structure/architecture/09-reports-exports.md
- Structure/architecture/08-session-history-manual-edits.md
- Structure/architecture/11-data-rules-audit.md

Inspect the current repo and implement the reporting backend:
- add report read models or SQL views for day-wise, subject-wise, student percentage, and student report overview data
- implement teacher report endpoints
- implement student self-report endpoints
- centralize percentage calculation in shared domain code
- make sure report access control is enforced correctly for teacher and student contexts
- add robust tests for report calculations and access control while implementing them

Write the actual reporting services, contracts, and tests.
```

## Prompt 2
```text
Continue the reports and exports phase from the current repo state.

Now implement export infrastructure:
- add export_jobs and export_job_files handling
- implement export request and status endpoints
- implement worker processors for session PDF, session CSV, student percentage CSV, and comprehensive CSV
- upload generated files to object storage
- wire teacher web and teacher mobile export request flows to the backend
- add robust tests for export job lifecycle and file output behavior
- update the matching requirements, architecture docs, and any reporting/export docs to reflect the implemented behavior
- update Structure/context.md with current progress, tests added, blockers, and the exact next pickup point

Run relevant tests and fix issues before stopping. This phase is not complete if reporting truth and export lifecycle behavior are weakly tested.
```

## Prompt 3
```text
Finish the reports/exports phase with review and verification.

Do all of the following:
- verify student-facing and teacher-facing reports use the same attendance truth
- add robust tests for filter behavior, student-versus-teacher report consistency, export job lifecycle, and file output structure
- review signed download flow and retention handling
- do a final documentation sync for the matching requirement, architecture, and reporting/export docs
- update Structure/context.md with completed scope, remaining gaps, and the next recommended phase
- summarize what is complete and what the analytics phase can now build on
- list the test files added or updated, the commands run, and any remaining manual verification items

Fix issues and missing relevant test coverage before stopping.
```
