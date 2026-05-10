# AttendEase — Remaining Phase Plan

> Last updated: 2026-05-10
> Status: All 406 tests pass (55 files, 0 failures) — Phase 3 ✅ Phase 4 ✅

---

## Phase 3: Security Audit & Admin Tools

**Goal:** Give admins full visibility and control over sessions and devices.

### 3A — Security Event Audit Log in Admin Panel

| Layer | Details |
|-------|---------|
| **DB** | `SecurityEvent` model already exists with `eventType`, `userId`, `actorUserId`, `ipAddress`, `metadata`, `createdAt` |
| **Contract** | Add `adminSecurityAuditLogResponseSchema` with pagination, filters (eventType, userId, dateRange) |
| **API** | `GET /admin/security/events` — paginated, filterable list of SecurityEvent rows |
| **Web** | New admin sidebar item "Security" → table view with filters (event type dropdown, date range, search by user) |
| **Tests** | Integration test: create events → GET with filters → verify correct rows returned |

### 3B — Active Session Listing per User

| Layer | Details |
|-------|---------|
| **DB** | `Session` model already exists with `status`, `userId`, `platform`, `ipAddress`, `lastActiveAt` |
| **Contract** | Add `adminUserSessionsResponseSchema` — array of session summaries |
| **API** | `GET /admin/users/:userId/sessions` — list all sessions (active + recent revoked) |
| **Web** | Add "Sessions" tab to student/teacher profile in admin panel → table with status badge, platform, IP, last active |
| **Tests** | Integration test: create sessions → list → verify response |

### 3C — Force-Logout Action for Admin

| Layer | Details |
|-------|---------|
| **Contract** | `adminForceLogoutResponseSchema` with `revokedCount` |
| **API** | `POST /admin/users/:userId/force-logout` — revoke all ACTIVE sessions for target user + log AdminAction |
| **Web** | "Force logout" button on user profile page in admin → confirmation dialog → calls API |
| **Tests** | Integration test: force-logout → verify sessions revoked, verify AdminActionLog row created |

### Files touched (estimated):
```
packages/contracts/src/admin-security.ts       (NEW — audit log + session + force-logout schemas)
packages/contracts/src/index.ts                (re-export)
apps/api/src/modules/admin/admin-security.controller.ts   (NEW)
apps/api/src/modules/admin/admin-security.service.ts      (NEW)
apps/api/src/modules/admin/admin.module.ts     (register new controller/service)
apps/api/src/modules/admin/admin-security.integration.test.ts (NEW)
apps/web/src/admin-workflows-client/admin-security.tsx    (NEW — audit log + sessions UI)
apps/web/src/web-workflows.ts                  (add routes + query keys)
packages/auth/src/client.admin.ts              (add client methods)
```

---

## Phase 4: Dashboard Visual Enhancements (Charts & Graphs)

**Goal:** Enrich the admin dashboard with richer visual data representation matching the reference mockup.

### 4A — Attendance Overview Pie Chart

| Layer | Details |
|-------|---------|
| **Contract** | Add `adminDashboardAttendanceOverviewResponseSchema` with brackets: `{ bracket: ">=75%" \| "50-75%" \| "<50%", studentCount: number }[]` |
| **API** | `GET /admin/dashboard/attendance-overview` — group all active students by their overall attendance % into 3 brackets |
| **Web** | SVG donut/pie chart with 3 segments (green ≥75%, amber 50–75%, red <50%) + legend with counts |
| **Tests** | Integration test + unit test for bracket grouping logic |

### 4B — Sessions Trend Line Chart Improvements

Already exists (weekly/monthly/yearly). Enhancements:
- **Web only:** Add data-point tooltips, smoother curve (cubic bezier), filled area gradient
- No API changes needed — data is already served

### 4C — Today's Branch Attendance (Horizontal Bar Chart)

| Layer | Details |
|-------|---------|
| **Contract** | Add `adminDashboardTodayBranchAttendanceResponseSchema` — `{ branch: string, attendancePercent: number, presentCount: number, totalCount: number }[]` |
| **API** | `GET /admin/dashboard/today-branch-attendance` — compute today's attendance % per student branch from `AttendanceRecord` rows where session date = today |
| **Web** | Replace or add alongside existing "Branch comparison" card — horizontal bar chart with branch names on Y-axis, attendance % on X-axis, color-coded bars |
| **Tests** | Integration test: seed today's sessions → GET → verify branch breakdown |

### 4D — Course Leaderboard Enhancements

Already exists (top/bottom 5). Enhancements:
- **Web only:** Add small inline sparkline or bar per course
- No API changes needed

### Files touched (estimated):
```
packages/contracts/src/admin-dashboard.ts      (add attendance overview + today branch schemas)
apps/api/src/modules/admin/admin-dashboard.controller.ts  (add 2 new endpoints)
apps/api/src/modules/admin/admin-dashboard.service.ts     (add 2 new methods)
apps/api/src/modules/admin/admin-dashboard.integration.test.ts (add tests)
apps/web/src/admin-workflows-client/admin-dashboard.tsx   (add pie chart, today's branch chart, tooltips)
packages/auth/src/client.admin.ts              (add client methods)
apps/web/src/web-workflows.ts                  (add query keys)
```

---

## Execution Order

| Order | Phase | Scope | Priority |
|-------|-------|-------|----------|
| 1 | **Phase 3** | Security audit, sessions, force-logout | High — security tooling for production |
| 2 | **Phase 4** | Dashboard charts & graphs | Medium — visual polish for presentation |

### Testing Strategy

Each phase will follow this discipline:
1. **Contracts first** — define Zod schemas with exact types
2. **Service + unit tests** — write tests alongside service methods
3. **Controller + integration tests** — end-to-end through the NestJS app
4. **Web UI** — frontend components consuming the new endpoints
5. **Full suite run** — verify all 386+ tests still pass before proceeding

### Notes
- All new endpoints are admin-only (`AdminRoleGuard`)
- Branch comparison for "today" will use raw `AttendanceRecord` + `AttendanceSession` (not analytics summary, which may lag)
- Pie chart brackets are the standard university thresholds: ≥75%, 50–75%, <50%
- No new npm dependencies — SVG charts rendered inline (matching existing pattern)
