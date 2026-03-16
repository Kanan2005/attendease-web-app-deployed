# Teacher Web App Implementation Notes

This companion note keeps detailed implementation, layout, and testing guidance for the teacher/admin web architecture.

## Visual And Copy Foundation

- `webTheme` centralizes typography, spacing, surface hierarchy, CTA emphasis, and neutral dashboard/table/chart framing tokens
- `findWebContentIssues()` acts as a content guardrail for shared portal copy
- `apps/web/src/web-shell.tsx`, `apps/web/src/web-portal.ts`, `apps/web/app/page.tsx`, and the teacher/admin auth entry pages reuse the shared web foundation
- `Structure/full-product-screenshot-audit.md` plus `Structure/artifacts/full-product-audit/web` act as the deterministic visual inventory for the implemented teacher/admin web route tree

## Page Ownership

- `apps/web/src/teacher-workflows-client.tsx` is the stable route-facing teacher workspace barrel
- `apps/web/src/admin-workflows-client.tsx` is the stable route-facing admin workspace barrel
- large workspace files are split into smaller modules inside:
  - `apps/web/src/teacher-workflows-client/`
  - `apps/web/src/admin-workflows-client/`
- `shared.tsx` files in those folders hold shared cards, fields, bootstrap, and formatting helpers

## Admin Governance Notes

- `apps/web/src/web-portal.ts` keeps the admin dashboard focused on support, device trust recovery, and academic governance
- `apps/web/app/(admin)/admin/semesters/page.tsx` combines semester lifecycle and classroom archive governance
- `apps/web/app/(admin)/admin/devices/page.tsx` switches between support and recovery modes
- `apps/web/src/admin-device-support-console.tsx` keeps protected-session access primary and manual token override secondary

## History, Reports, And Review Notes

- `apps/web/src/teacher-review-workflows.ts` centralizes filters, grouped roster modeling, correction summaries, and report view models
- `apps/web/app/(teacher)/teacher/reports/page.tsx` mounts the live report workspace rather than a placeholder
- report outputs keep review and export handoffs visible inside one teacher flow

## Data Fetching Notes

- server components handle route protection and first-pass page bootstrapping
- client components handle live session control, schedule editing, classroom stream actions, and interactive filters
- `apps/web/src/web-workflows.ts` centralizes route helpers, query keys, schedule drafts, import aggregation, and QR session models

## Route Protection Notes

- `apps/web/src/web-portal.ts` owns cookie parsing, access evaluation, navigation models, and page models
- `apps/web/src/web-auth-entry.tsx` owns shared teacher/admin auth-entry models and role-specific copy
- unauthorized users see explicit protected-route cards with role-matched sign-in handoff

## Active QR And Projector Notes

- `apps/web/src/teacher-qr-session-management.ts` centralizes classroom options, readiness rules, and create-payload shaping
- `apps/web/src/qr-session-shell.tsx` polls `GET /sessions/:sessionId` and `GET /sessions/:sessionId/students` every 2 seconds while active
- the shell renders a large QR stage, timer, live counts, and marked-student roster for teacher control plus a stripped-down projector layout
- realtime transport is still deferred, so live updates remain polling-based

## Classroom And Import Workspaces

- classroom list, create, detail, roster, imports, schedule, stream, and semester visibility pages mount dedicated teacher workspaces
- admin semesters, devices, and imports pages mount dedicated governance workspaces
- the current import workflow still parses normalized row text client-side and defers raw CSV/XLSX adapters to later work

## Reports, Charts, And Exports

- reports share one filter scope for day-wise, subject-wise, and student-percentage outputs
- charts should render backend-prepared datasets rather than compute heavy analytics in the browser
- export flow remains asynchronous: create job, build in worker, poll status, return file URL

## Code Layout

```text
apps/web/src/features/teacher-web/
  dashboard/
  classrooms/
  semesters/
  roster/
  schedule/
  announcements/
  session-create/
  active-session/
  session-history/
  session-detail/
  manual-edit/
  reports/
  exports/
  analytics/
  email-automation/

apps/web/src/features/admin/
  dashboard/
  devices/
  imports/
  semesters/
  users/
```

## Testing Strategy

Must include:

- login and dashboard access tests
- role-routing tests
- live session page tests
- classroom CRUD and schedule-editing tests
- roster import status tests
- session creation form tests
- report filter tests
- export job status flow tests

Current implementation note:

- `apps/web/src/web-portal.test.ts` covers portal cookie parsing and route protection
- `apps/web/src/web-workflows.test.ts` covers classroom routes, schedule saves, import parsing, semester visibility, import monitoring, and QR shell boundaries
- `packages/auth/src/client.test.ts` covers shared auth-client route shaping for semester and classroom archive flows

## Implementation Outcome

When this architecture is complete:

- teachers can run QR sessions from the browser reliably
- the projector view behaves as a true live attendance control surface
- teacher web supports classroom CRUD, semester setup, roster management, schedules, and announcements
- session-backed admin support and guarded device-recovery tooling exist for governance operations
- reporting, exports, analytics, and email tools are available in one web portal
