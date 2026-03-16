# Phase Prompt: QR + GPS Attendance

Use this playbook to implement the QR session flow and GPS validation.

Execution order: Phase 10 of 15.
Assume all earlier phases listed in `Structure/phase_promptioing/README.md` are already merged before you start this one.

## Prompt 1
```text
You are implementing the AttendEase QR + GPS attendance architecture.

Read these files first:
- Structure/context.md
- Structure/final-tech-stack-and-implementation.md
- Structure/requirements/06-qr-gps-attendance.md
- Structure/architecture/06-qr-gps-attendance.md
- Structure/architecture/08-session-history-manual-edits.md
- Structure/architecture/11-data-rules-audit.md

Inspect the current repo and implement the backend QR + GPS core:
- add session fields and migrations needed for QR sessions, anchors, radius, and QR seed
- implement QR session creation and end endpoints
- implement rolling QR token generation using timestamp slices and HMAC
- implement GPS validation service and location-anchor resolution
- implement the student QR mark-attendance endpoint with transactional status update and duplicate protection
- emit outbox and realtime events on successful mark
- add robust unit and integration tests for QR token generation, QR validation, GPS validation, and mark-attendance transactions

Do not stop at design. Write the actual services, controllers, contracts, and tests.
```

## Prompt 2
```text
Continue the QR + GPS implementation from the current repo state.

Now wire the client flows:
- teacher web session-creation form and active projector page
- live marked-count subscription and QR rotation updates
- student mobile QR scanning flow using the existing mobile architecture
- location capture and submission from mobile
- error mapping for expired QR, invalid QR, out-of-range GPS, and duplicate mark
- add or extend robust tests for the teacher QR flow and student QR entry flow where practical
- update the matching requirements, architecture docs, and any attendance-flow docs to reflect the implemented behavior
- update Structure/context.md with current progress, tests added, blockers, and the exact next pickup point

Run relevant integration tests and UI checks, and fix issues before stopping. This phase is not complete if QR/GPS risk paths are weakly tested.
```

## Prompt 3
```text
Finish the QR + GPS phase with hardening and review.

Do all of the following:
- review timestamp-slice tolerance, session-end behavior, and duplicate-mark handling
- add robust tests for expired QR, invalid signature, out-of-range GPS, poor location accuracy, duplicate-mark prevention, and successful live counter updates
- verify suspicious-location failures are logged to security events without corrupting attendance truth
- do a final documentation sync for the matching requirement, architecture, and attendance/security docs
- update Structure/context.md with completed scope, remaining gaps, and the next recommended phase
- summarize what is complete and any open follow-up items for reports/history
- list the test files added or updated, the commands run, and any remaining manual verification items

Fix issues and missing relevant test coverage before stopping.
```
