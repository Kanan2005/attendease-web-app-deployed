# Phase Prompt: Analytics and Email Automation

Use this playbook to implement advanced analytics and low-attendance email flows.

Execution order: Phase 14 of 15.
Assume all earlier phases listed in `Structure/phase_prompting/README.md` are already merged before you start this one.

## Prompt 1
```text
You are implementing the AttendEase analytics and email automation architecture.

Read these files first:
- Structure/context.md
- Structure/final-tech-stack-and-implementation.md
- Structure/requirements/10-analytics-email-automation.md
- Structure/architecture/10-analytics-email-automation.md
- Structure/architecture/09-reports-exports.md
- Structure/architecture/11-data-rules-audit.md

Inspect the repo and implement the analytics backend:
- add aggregate tables or refreshable summary structures for attendance trends, distributions, subject summaries, and mode usage
- implement outbox-driven analytics refresh processors in the worker
- implement analytics API endpoints for trends, distribution, comparisons, mode usage, student timeline drill-down, and session drill-down
- keep chart payloads server-prepared and compact
- add robust tests for aggregate refresh and analytics contract behavior while implementing them

Write the actual services, jobs, contracts, and tests.
```

## Prompt 2
```text
Continue the analytics/email automation implementation from the current repo state.

Now implement low-attendance email behavior:
- add automation rule, dispatch run, and email log models if missing
- implement manual preview and manual send flows
- implement automatic daily scheduler and duplicate-send protection
- integrate SES-backed email service adapters and template rendering
- wire teacher web analytics and email screens to the API
- add robust tests for email selection, dispatch runs, duplicate prevention, and preview rendering
- update the matching requirements, architecture docs, and any analytics/email docs to reflect the implemented behavior
- update Structure/context.md with current progress, tests added, blockers, and the exact next pickup point

Run tests and fix issues before stopping. This phase is not complete if analytics refresh and email automation risks are untested.
```

## Prompt 3
```text
Finish the analytics/email phase with review and verification.

Do all of the following:
- verify analytics numbers remain consistent with reporting logic
- add robust tests for aggregate refresh, recipient selection, duplicate-send prevention, preview rendering, and failed-send handling
- review failure handling for scheduler, SES sends, and stuck jobs
- do a final documentation sync for the matching requirement, architecture, and analytics/email docs
- update Structure/context.md with completed scope, remaining gaps, and the next recommended phase
- summarize what is complete and any operational caveats for production rollout
- list the test files added or updated, the commands run, and any remaining manual verification items

Fix issues and missing relevant test coverage before stopping.
```
