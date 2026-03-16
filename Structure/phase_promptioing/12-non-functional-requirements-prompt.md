# Phase Prompt: Non-Functional Hardening

Use this playbook to implement security, observability, CI/CD, rate limits, and operational protections.

Execution order: Phase 15 of 15.
Assume all earlier phases listed in `Structure/phase_promptioing/README.md` are already merged before you start this one.

## Prompt 1
```text
You are implementing the AttendEase non-functional architecture.

Read these files first:
- Structure/context.md
- Structure/final-tech-stack-and-implementation.md
- Structure/requirements/12-non-functional-requirements.md
- Structure/architecture/12-non-functional-requirements.md
- Structure/architecture/15-device-trust-and-admin-controls.md
- Structure/architecture/01-system-overview.md

Inspect the repo and implement the non-functional foundation:
- add centralized config loading and env validation
- add structured logging to API and worker
- add Sentry and tracing integration hooks
- add rate limiting for auth and attendance-mark endpoints
- add baseline error handling and request-id propagation
- add security-sensitive log redaction where needed
- add relevant tests for middleware, config validation, and error handling as you build them

Implement the actual infrastructure code and config files, not just comments.
```

## Prompt 2
```text
Continue the non-functional implementation from the current repo state.

Now do the following:
- add CI workflows for lint, typecheck, tests, and builds
- add feature-flag plumbing for Bluetooth rollout, automation rollout, and strict device-binding modes
- add health checks, readiness checks, and queue health reporting
- add backup/recovery notes or operational docs where code-level changes are not enough
- add performance protections for slow exports/imports and long-running jobs
- add or extend robust tests for config loading, health checks, and critical middleware behavior
- update the matching requirements, architecture docs, and any operational docs to reflect the implemented behavior
- update Structure/context.md with current progress, tests added, blockers, and the exact next pickup point

Run relevant checks and fix issues before stopping.
```

## Prompt 3
```text
Finish the non-functional phase with a production-readiness review.

Do all of the following:
- review security posture, logging quality, rate-limit coverage, and observability completeness
- add any missing robust tests for config validation, error handlers, middleware, and feature-flag behavior
- do a final documentation sync for the matching requirement, architecture, and operational docs
- update Structure/context.md with completed scope, remaining gaps, and the next recommended phase
- summarize the operational baseline, known gaps, and any production-only setup steps still required
- list the test files added or updated, the commands run, and any remaining manual verification items

Fix issues and missing relevant test coverage before stopping.
```
