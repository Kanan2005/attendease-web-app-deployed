# Phase Prompt: Device Trust and Admin Controls

Use this playbook to implement trusted-device binding, anti-account-switch enforcement, and admin recovery flows.

Execution order: Phase 4 of 15.
Assume all earlier phases listed in `Structure/phase_promptioing/README.md` are already merged before you start this one.

## Prompt 1
```text
You are implementing the AttendEase device-trust and admin-controls architecture.

Read these files first:
- Structure/context.md
- Structure/final-tech-stack-and-implementation.md
- requirement.md
- Structure/requirements/02-auth-roles-enrollment.md
- Structure/requirements/12-non-functional-requirements.md
- Structure/architecture/15-device-trust-and-admin-controls.md
- Structure/architecture/02-auth-roles-enrollment.md
- Structure/architecture/12-non-functional-requirements.md

Inspect the repo and implement the backend foundation:
- add or refine models and migrations for devices, user_device_bindings, security_events, and admin_action_logs
- implement device registration endpoint and binding policy service
- implement trusted-device guard for student attendance-sensitive actions
- implement security-event logging for multi-account same-device attempts, second-device attempts, and revoked-device use
- keep the implementation aligned with the explicit decision to avoid MAC-address locking
- add robust tests for binding policy and trusted-device guard behavior as part of the implementation

Do not stop at analysis. Implement the real services, guards, DTOs, and tests.
```

## Prompt 2
```text
Continue the device-trust implementation from the current repo state.

Now implement the client and admin flows:
- mobile device registration bootstrap and trusted-device status handling
- blocked-attendance UX integration for student mobile
- admin device-support endpoints for revoke, delink, and replacement approval
- admin web pages for searching students/devices and taking recovery actions
- attestation integration placeholders or actual adapters for Android and Apple, depending what is already possible in the repo
- add or extend robust tests for admin recovery flows and client blocked-attendance behavior where practical
- update the matching requirements, architecture docs, and any device-trust/support docs to reflect the implemented behavior
- update Structure/context.md with current progress, tests added, blockers, and the exact next pickup point

Run tests and fix issues before stopping. This phase is not complete if the same-phone multi-account abuse scenario is not covered by strong tests.
```

## Prompt 3
```text
Finish the device-trust/admin phase with security review and verification.

Do all of the following:
- verify that one phone cannot casually rotate through multiple student accounts for attendance
- verify that teacher/admin flows are not broken by the stricter student rules
- add robust tests for first bind, blocked second student, blocked second device, revoked device, admin recovery, and trusted-device enforcement on attendance endpoints
- do a final documentation sync for the matching requirement, architecture, and device-trust/support docs
- update Structure/context.md with completed scope, remaining gaps, and the next recommended phase
- summarize what is complete, what depends on production attestation setup, and any support-process notes
- list the test files added or updated, the commands run, and any remaining manual verification items

Fix issues and missing relevant test coverage before stopping.
```
