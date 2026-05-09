# Attendease — Test Suites

Three layers of regression coverage. Run them in this order before shipping anything risky.

| Layer | Tool | Speed | What it catches |
|-------|------|-------|-----------------|
| **API integration + cross-phase journey** | Vitest + real Postgres | ~30 s/file | Backend regressions, contract drift, audit log breakage, cross-phase wiring |
| **Web admin browser E2E** | Playwright (Chromium) | ~60–90 s | UI-API contract mismatches, navigation regressions, "save button doesn't actually save" bugs |
| **Mobile attendance E2E** | adb + uiautomator (bash) | ~45 s | Mobile crashes on launch, login flow breakage, archived-course visibility bug |

---

## 1. API integration tests

### One-time setup

```bash
# Local Postgres for tests (Docker Compose):
docker compose up -d postgres

# Or point at an existing dev DB by exporting:
export DEV_DATABASE_URL="postgresql://..."
```

The integration helpers create a unique throwaway database per suite and tear it down on `afterAll`, so tests cannot leak into each other.

### Run all integration tests

```bash
pnpm --filter @attendease/api test
```

### Run only one suite

```bash
pnpm --filter @attendease/api test src/modules/admin/admin-dashboard.integration.test.ts
pnpm --filter @attendease/api test src/test/admin-journey.e2e.test.ts
```

### What each suite covers

| File | Phase | Highlights |
|------|-------|-----------|
| `apps/api/src/modules/admin/admin-records.integration.test.ts` | 1 | Department drilldown, archive/unarchive, audit logs |
| `apps/api/src/modules/admin/admin-users.integration.test.ts` | 2 | Student/teacher list filters, profile, attendance disable/enable idempotency |
| `apps/api/src/modules/admin/admin-communication.integration.test.ts` | 3 | Audience preview, missing-email handling, dispatch logging |
| `apps/api/src/modules/admin/admin-reports.integration.test.ts` | 4 | XLSX generation, ZIP magic verification, ExportJob row persistence |
| `apps/api/src/modules/admin/admin-settings.integration.test.ts` | 5 | System defaults round-trip, admin invite + login, self-revoke 403 |
| `apps/api/src/modules/admin/admin-dashboard.integration.test.ts` | 6 | Insights block, sessions graph buckets, leaderboard ordering, **threshold change in Phase 5 reflects on Phase 6 dashboard** |
| `apps/api/src/modules/academic/classroom-roster.integration.test.ts` | bug fix | Archived courses hidden from student dashboard regression test |
| `apps/api/src/test/admin-journey.e2e.test.ts` | **1 → 6 cross-phase** | Single workflow: login → archive course → student list drops it → unarchive → disable attendance → preview audience → generate XLSX → bump system threshold → dashboard reflects it → invite admin → new admin can log in |

The **admin journey** suite is the strongest regression net for cross-phase wiring. If anything between phases starts drifting, this fails first.

---

## 2. Web admin browser E2E (Playwright)

### One-time setup

```bash
pnpm --filter @attendease/web exec playwright install chromium
```

### Pre-flight (every run)

The suite requires the API + a seeded DB, so run these in two terminals:

```bash
# Terminal 1 — fresh seeded DB + API
pnpm --filter @attendease/db reset:seed
pnpm --filter @attendease/api dev

# Terminal 2 — Playwright will auto-start the web dev server itself.
pnpm --filter @attendease/web test:e2e
```

For interactive debugging:

```bash
pnpm --filter @attendease/web test:e2e:ui
```

### What it covers (`apps/web/e2e/admin-journey.spec.ts`)

| Test | What breaks if it fails |
|------|------------------------|
| Login + dashboard lands | Login form regression, session cookie not set, redirect broken |
| Hero stats render | Phase 6 dashboard contract drift, missing card |
| Sessions trend SVG + range tabs | Chart component broken, click handler regression |
| Leaderboard tab switch | Stateful tab UI broken |
| Records explorer drilldown | Phase 1 navigation broken |
| Users filter by branch + open profile | Phase 2 filter form broken |
| Communication audience preview | Phase 3 form submission broken |
| Reports generate + Recent table updates | Phase 4 mutation→list invalidation broken |
| Settings change threshold → dashboard reflects | **Cross-phase wiring (5 ↔ 6) broken** |
| Settings invite admin → temp password card | Phase 5 invite UI broken |
| Sidebar nav: every route reachable | Sidebar/nav misconfigured, route 404 |

### Custom credentials

If your seed uses different credentials:

```bash
E2E_ADMIN_EMAIL=you@school.edu \
E2E_ADMIN_PASSWORD='YourPass!' \
pnpm --filter @attendease/web test:e2e
```

### Skip auto-spawning the web server

If you already have `pnpm --filter @attendease/web dev` running:

```bash
PLAYWRIGHT_NO_WEB_SERVER=1 pnpm --filter @attendease/web test:e2e
```

---

## 3. Mobile attendance E2E (Android emulator)

### One-time setup

1. Install an Android emulator and start it.
2. Build + install the app:
   ```bash
   pnpm --filter @attendease/mobile android
   ```
3. Confirm `adb devices` lists your emulator.

### Run

```bash
# Existing landing/auth screen suite:
bash apps/mobile/e2e/run-e2e.sh

# New student attendance journey suite:
bash apps/mobile/e2e/run-attendance-e2e.sh
```

### What `run-attendance-e2e.sh` covers

1. Landing screen renders the student card
2. Tap → student sign-in screen
3. Type seed credentials and submit
4. Reach classrooms / home screen
5. At least one classroom is visible
6. Pull-to-refresh works without crashing
7. Drill into a classroom card → detail screen
8. Sign-out path discoverable

Screenshots and uiautomator dumps are saved to `/tmp/attendease_attendance_e2e/` after every run.

### Custom credentials

```bash
STUDENT_EMAIL=you@school.edu \
STUDENT_PASSWORD='YourPass!' \
bash apps/mobile/e2e/run-attendance-e2e.sh
```

---

## Recommended pre-merge checklist

```bash
# Static checks (fast, run on every save)
pnpm turbo typecheck lint

# Backend regression (~2 min)
pnpm --filter @attendease/api test

# Web UI regression (~90 s, requires running stack — see above)
pnpm --filter @attendease/web test:e2e

# Mobile happy path (only if mobile-affecting changes — ~45 s)
bash apps/mobile/e2e/run-attendance-e2e.sh
```

If all four are green you have very high confidence the change is safe to ship.
