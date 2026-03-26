# Mobile Structure

## Route Ownership

- `apps/mobile/app/index.tsx`
  - neutral first-run role entry.
- `apps/mobile/app/(entry)`
  - student and teacher sign-in/register routes.
- `apps/mobile/app/(student)`
  - protected student-only routes.
- `apps/mobile/app/(teacher)`
  - protected teacher-only routes.

## Student Mobile

- `apps/mobile/src/student-foundation.tsx`
  - stable public barrel for student screens and invalidation helpers.
- `apps/mobile/src/student-foundation/`
  - route-local student screen implementations.
- `apps/mobile/src/student-foundation/queries*.ts`
  - student query hooks and data composition.
- `apps/mobile/src/student-foundation/shared-ui.tsx`
  - student screen frame, cards, banners, and empty/loading/error helpers.
- `apps/mobile/src/student-foundation/styles.ts`
  - shared student styles.
- `apps/mobile/src/student-attendance*.ts`
  - QR/Bluetooth attendance models and submission helpers.
- `apps/mobile/src/student-workflow-models*.ts`
  - dashboard, schedule, report, attendance, and profile view-model builders.
- `apps/mobile/src/student-query.ts`
  - student query keys and invalidation helpers.

## Teacher Mobile

- `apps/mobile/src/teacher-foundation.tsx`
  - stable public barrel for teacher screens and invalidation helpers.
- `apps/mobile/src/teacher-foundation/`
  - route-local teacher screen implementations.
- `apps/mobile/src/teacher-foundation/queries*.ts`
  - classroom, session, report, and mutation hooks.
- `apps/mobile/src/teacher-foundation/shared-ui.tsx`
  - teacher screen frame, card, banner, and CTA primitives.
- `apps/mobile/src/teacher-foundation/styles.ts`
  - shared teacher styles.
- `apps/mobile/src/teacher-operational*.ts`
  - Bluetooth, session, report, and export view-model builders.
- `apps/mobile/src/teacher-models.ts`
  - teacher dashboard and summary models.
- `apps/mobile/src/teacher-query.ts`
  - teacher query keys and invalidation helpers.

## Mobile Structure Rules

- Keep `student-foundation.tsx` and `teacher-foundation.tsx` as stable barrels.
- Split large screens into route-local `*-content.tsx`, `*-card.tsx`, or `queries-*.ts` companions.
- Keep view-model logic in `student-workflow-models*.ts` and `teacher-operational*.ts`, not inside route components.
