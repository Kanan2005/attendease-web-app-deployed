# Phase Prompt: Bluetooth Attendance

Use this playbook to implement BLE beacon-style attendance.

Execution order: Phase 11 of 15.
Assume all earlier phases listed in `Structure/phase_promptioing/README.md` are already merged before you start this one.

## Prompt 1
```text
You are implementing the AttendEase Bluetooth attendance architecture.

Read these files first:
- Structure/context.md
- Structure/final-tech-stack-and-implementation.md
- Structure/requirements/07-bluetooth-attendance.md
- Structure/architecture/07-bluetooth-attendance.md
- Structure/architecture/04-teacher-mobile-app.md
- Structure/architecture/15-device-trust-and-admin-controls.md

Inspect the current repo and implement the backend and native foundations:
- add BLE-specific session fields, contracts, and token services
- implement the backend Bluetooth session create and mark-attendance endpoints
- implement rotating BLE identifier generation and validation
- scaffold the native BLE bridge for Android and iOS with a shared TypeScript wrapper
- wire the teacher advertiser and student scanner service boundaries in mobile code
- add robust backend tests for BLE token logic and attendance validation as part of the implementation

This phase requires real native module structure. Do not replace it with a fake JS-only abstraction.
```

## Prompt 2
```text
Continue the Bluetooth attendance implementation from the current repo state.

Now implement the operational flows:
- teacher mobile Bluetooth session start, active status, and stop flow
- student BLE scan, detected-session selection if needed, and mark-attendance submit flow
- backend duplicate protection and session-state checks
- suspicious replay or invalid BLE attempts logged to security events
- recovery handling for advertiser start failure, Bluetooth disabled state, and session-end retry
- add mocked tests for mobile BLE flows and native wrapper boundaries where practical
- update the matching requirements, architecture docs, and any BLE/native-integration docs to reflect the implemented behavior
- update Structure/context.md with current progress, tests added, blockers, and the exact next pickup point

Run the tests you can run, and add clear platform notes where manual device testing is still required. Lack of perfect automation is acceptable here, but lack of meaningful BLE test coverage is not.
```

## Prompt 3
```text
Finish the Bluetooth phase with verification and platform hardening.

Do all of the following:
- review iOS and Android bridge boundaries and keep TypeScript usage clean
- add robust unit tests for rotating BLE identifiers and backend validation rules
- add mocked integration tests for mobile BLE flows and native wrapper boundaries where possible
- write a short device-test checklist for teacher and student BLE scenarios
- do a final documentation sync for the matching requirement, architecture, and BLE/platform docs
- update Structure/context.md with completed scope, remaining gaps, and the next recommended phase
- summarize what is complete, what requires real-device verification, and any known platform caveats
- list the test files added or updated, the commands run, and any remaining manual verification items

Fix issues and missing relevant test coverage before stopping.
```
