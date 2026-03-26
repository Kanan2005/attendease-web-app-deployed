# Phase Prompt: Auth, Roles, and Enrollment

Use this playbook to implement identity, Google login, RBAC, assignments, and enrollment foundations.

Execution order: Phase 3 of 15.
Assume all earlier phases listed in `Structure/phase_prompting/README.md` are already merged before you start this one.

## Prompt 1
```text
You are implementing the AttendEase auth, roles, and enrollment architecture.

Read these files first:
- Structure/context.md
- Structure/final-tech-stack-and-implementation.md
- Structure/requirements/02-auth-roles-enrollment.md
- Structure/architecture/02-auth-roles-enrollment.md
- Structure/architecture/11-data-rules-audit.md
- Structure/architecture/15-device-trust-and-admin-controls.md

Inspect the current repo and implement the backend foundation for this area:
- add Prisma models and migrations for users, roles, credentials, oauth accounts, refresh tokens, auth sessions, teacher assignments, enrollments, course offerings, and classroom join codes
- implement NestJS auth module with login, refresh, logout, and me endpoints
- implement role guards and shared policy helpers
- add the Google OIDC exchange endpoint and server-side verification flow
- add assignment and enrollment service foundations with teacher-scope validation helpers
- add shared contracts and Zod schemas for auth responses and key academic assignment/enrollment payloads
- add robust unit and integration tests for high-risk auth and permission behavior as part of the implementation

Do not stop at analysis. Implement the actual code and keep it aligned with the frozen stack decision file.
```

## Prompt 2
```text
Continue from the current state and complete the auth/enrollment feature slice.

Now do the following:
- implement teacher assignment queries and enrollment queries/endpoints needed by later phases
- add seed/dev fixtures for admin, teacher, student, assignments, and enrollments
- wire Google login bootstrap for web and mobile client layers if client code already exists; otherwise add the shared client helpers and placeholder integration points
- add robust tests for login, refresh rotation, Google login exchange, role enforcement, assignment restrictions, and enrollment-scoped access
- document required environment variables for Google OIDC and auth secrets
- update the matching requirements, architecture docs, and auth-related support docs to reflect the implemented behavior
- update Structure/context.md with current progress, tests added, blockers, and the exact next pickup point

Run relevant tests and fix failures before stopping. This phase is not complete if risky auth flows are weakly tested.
```

## Prompt 3
```text
Finish the auth, roles, and enrollment phase with a security review.

Do all of the following:
- review for permission holes, token-storage mistakes, and trust-of-client-data issues
- verify that students cannot read arbitrary student data and teachers cannot operate outside assignment scope
- clean up DTO naming, policy helper placement, and package exports
- do a final documentation sync for the matching requirement, architecture, and auth/device-trust related docs
- update Structure/context.md with completed scope, remaining gaps, and the next recommended phase
- add a concise implementation summary and list any intentional follow-up items for the device-trust phase
- list the test files added or updated, the commands run, and any remaining manual verification items

If any risky auth flows still lack strong tests, add them now before stopping.
```
