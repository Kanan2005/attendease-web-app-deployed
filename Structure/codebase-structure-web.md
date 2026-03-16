# Web Structure

## Teacher Web

- `apps/web/app/(teacher)`
  - teacher portal routes.
- `apps/web/src/teacher-workflows-client.tsx`
  - stable public barrel for teacher workspaces.
- `apps/web/src/teacher-workflows-client/`
  - classroom, roster, schedule, session history, reports, exports, and QR setup workspaces.
- `apps/web/src/teacher-analytics-automation-client.tsx`
  - stable public barrel for analytics and email-automation workspaces.
- `apps/web/src/teacher-analytics-automation-client/`
  - analytics dashboard and automation/email workspace pieces.
- `apps/web/src/web-portal*.ts`
  - teacher/admin page models, session parsing, navigation, and page helpers.
- `apps/web/src/web-workflows*.ts`
  - shared route, QR, schedule, and formatting helpers.
- `apps/web/src/teacher-review-workflows*.ts`
  - history, manual-correction, and report models.

## Admin Web

- `apps/web/app/(admin)`
  - admin portal routes.
- `apps/web/src/admin-workflows-client.tsx`
  - stable public barrel for admin workspaces.
- `apps/web/src/admin-workflows-client/`
  - student management, classroom governance, semester management, and import monitoring workspaces.
- `apps/web/src/admin-device-support-console.tsx`
  - stable public barrel for the high-risk device recovery console.
- `apps/web/src/admin-device-support-console/`
  - search, results, detail, bindings, history, and action sections for device recovery.
- `apps/web/src/admin-device-support.ts`
  - admin device recovery view models.
- `apps/web/src/admin-student-management.ts`
  - admin student governance view models.
- `apps/web/src/admin-classroom-governance.ts`
  - admin classroom archive/governance view models.

## Web Structure Rules

- Keep the top-level `teacher-workflows-client.tsx`, `admin-workflows-client.tsx`, and `teacher-analytics-automation-client.tsx` barrels stable.
- Split workspace UI into route-local sections/cards instead of growing a single route file.
- Keep page-model and workflow logic in `web-portal*.ts`, `web-workflows*.ts`, and `teacher-review-workflows*.ts`, not inside route components.
