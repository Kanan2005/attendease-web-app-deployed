# Phase Prompt: Product Reset Micro Phases

Use this playbook when you want to rebuild AttendEase into a cleaner, role-separated, user-friendly product without losing the existing backend and domain foundations.

Execution order: dedicated reset track, 40 prompts, strict order.
One chat window = one prompt.
Do not skip ahead unless all earlier prompts in this playbook are already implemented and merged into the repo state.

This playbook assumes the product decisions below are locked and must not be re-decided in each chat:

- one shared mobile app, but with fully separate student and teacher entry, auth, and navigation
- student and teacher support self-registration
- admin is login-only and is provisioned separately
- student one-device enforcement uses app device binding, not MAC-address-only locking
- teacher mobile owns Bluetooth attendance session creation
- teacher web owns QR + GPS attendance session creation
- admin web owns student, device, and course governance
- every prompt must update matching docs, add relevant tests, run relevant checks, and leave a concrete next pickup point in `Structure/context.md`

## Files Every Prompt Must Read First

- `Structure/context.md`
- `Structure/final-tech-stack-and-implementation.md`
- `Structure/testing-strategy.md`
- `Structure/phase_prompting/README.md`
- `Structure/ux-redesign-audit.md` after Prompt 1 creates it

Each prompt also names extra files that must be read before implementation starts.

## Global Rules For Every Prompt

- Inspect the current repo before making decisions.
- Implement real code, not TODO placeholders.
- Keep the current approved stack.
- Do not switch the product back to mixed teacher/student mobile UX.
- Do not switch student device enforcement back to MAC-address-only design.
- If a prompt changes user-visible behavior, update the matching requirement docs and architecture docs in the same prompt.
- Update `Structure/context.md` in every prompt with:
  - what was implemented
  - tests added or updated
  - commands run
  - blockers
  - exact next pickup point
- If setup, validation, or manual flows change, also update `README.md`, `guide.md`, and any relevant support docs.
- Every prompt must add or strengthen automated tests for the changed behavior.
- Every prompt must run relevant checks before stopping and fix safe issues discovered during those checks.

## Validation Tiers

- Tier A: docs, contracts, backend, worker, or web only
  - run targeted unit or integration tests, typecheck, and any touched web tests
  - no Android Studio validation required
- Tier B: shared mobile logic without native-runtime impact
  - run mobile typecheck and relevant mobile tests
  - no Android Studio validation required unless navigation or runtime behavior changed
- Tier C: mobile runtime changes
  - run mobile typecheck and relevant mobile tests
  - run native Android validation through `expo run:android` or Android Studio where practical
  - record results in `Structure/context.md`
- Tier D: QR, GPS, Bluetooth, device-binding, permissions, or other high-risk mobile runtime changes
  - run all Tier C checks
  - also validate Android permission handling, lifecycle recovery, logs, and relevant hardware-state flows where practical
  - capture honest evidence and blockers in `Structure/context.md`

## Prompt Packs

- [`20-product-reset-prompts-01-10.md`](./20-product-reset-prompts-01-10.md)
- [`20-product-reset-prompts-11-20.md`](./20-product-reset-prompts-11-20.md)
- [`20-product-reset-prompts-21-30.md`](./20-product-reset-prompts-21-30.md)
- [`20-product-reset-prompts-31-40.md`](./20-product-reset-prompts-31-40.md)
